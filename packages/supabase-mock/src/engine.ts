// packages/supabase-mock/src/engine.ts
//
// Executa um QuerySpec contra as tabelas em memória, com semântica próxima
// do PostgREST: embeds via FK (to-one = objeto, to-many = array), `!inner`
// descartando o pai sem filho, filtros em tabela embutida, count, single,
// RLS (policies.ts), defaults, constraints, triggers e cascades.

import { parseSelect, type SelectNode } from './select-parser';
import {
  CHECK_CONSTRAINTS,
  DEFAULTS,
  FOREIGN_KEYS,
  PIZZARIAS_COLUNAS_PUBLICAS,
  UNIQUE_CONSTRAINTS,
  UPDATE_TRIGGERS,
  primaryKey,
  type Row,
  type Tables,
} from './schema';
import { podeEscrever, podeLer, type AuthContext } from './policies';
import type { Filter, Order, PostgrestError, QueryResult, QuerySpec } from './query-builder';

export interface Change {
  table: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  /** Linha nova (INSERT/UPDATE) ou a removida (DELETE). */
  record: Row;
}

export interface ExecResult {
  result: QueryResult;
  changes: Change[];
}

class EngineError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: string | null;
  readonly hint: string | null;

  constructor(code: string, message: string, status = 400, details: string | null = null, hint: string | null = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
    this.hint = hint;
  }

  toPostgrest(): PostgrestError {
    return { code: this.code, message: this.message, details: this.details, hint: this.hint };
  }
}

const clone = <T>(v: T): T => structuredClone(v);

function ok(data: unknown, count: number | null, status = 200): QueryResult {
  return { data, error: null, count, status, statusText: status === 201 ? 'Created' : 'OK' };
}

function falha(err: EngineError): QueryResult {
  return { data: null, error: err.toPostgrest(), count: null, status: err.status, statusText: 'Error' };
}

export function tabela(db: Tables, nome: string): Row[] {
  const t = db[nome];
  if (!t) {
    throw new EngineError(
      '42P01',
      `relation "public.${nome}" does not exist`,
      404
    );
  }
  return t;
}

// ---------------------------------------------------------------------------
// Comparação / filtros
// ---------------------------------------------------------------------------

const ISO_DATA = /^\d{4}-\d{2}-\d{2}/;

function comparar(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a == null) return b == null ? 0 : 1;
  if (b == null) return -1;
  if (typeof a === 'number' || typeof b === 'number') {
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  }
  if (typeof a === 'string' && typeof b === 'string' && ISO_DATA.test(a) && ISO_DATA.test(b)) {
    const ta = Date.parse(a);
    const tb = Date.parse(b);
    if (!Number.isNaN(ta) && !Number.isNaN(tb)) return ta - tb;
  }
  if (typeof a === 'boolean' || typeof b === 'boolean') {
    return String(a) === String(b) ? 0 : String(a) < String(b) ? -1 : 1;
  }
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}

function igual(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return false; // SQL: NULL = x é desconhecido
  return comparar(a, b) === 0;
}

function likeParaRegex(padrao: string, flags: string): RegExp {
  const escapado = padrao.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.');
  return new RegExp(`^${escapado}$`, flags);
}

function passa(valor: unknown, f: Filter): boolean {
  switch (f.op) {
    case 'eq':
      return igual(valor, f.value);
    case 'neq':
      return valor != null && f.value != null && comparar(valor, f.value) !== 0;
    case 'gt':
      return valor != null && comparar(valor, f.value) > 0;
    case 'gte':
      return valor != null && comparar(valor, f.value) >= 0;
    case 'lt':
      return valor != null && comparar(valor, f.value) < 0;
    case 'lte':
      return valor != null && comparar(valor, f.value) <= 0;
    case 'in':
      return Array.isArray(f.value) && f.value.some((v) => igual(valor, v));
    case 'is':
      return f.value === null ? valor == null : valor === f.value;
    case 'like':
      return typeof valor === 'string' && likeParaRegex(String(f.value), '').test(valor);
    case 'ilike':
      return typeof valor === 'string' && likeParaRegex(String(f.value), 'i').test(valor);
  }
}

function ordenar(rows: Row[], orders: Order[]): Row[] {
  if (orders.length === 0) return rows;
  return [...rows].sort((a, b) => {
    for (const o of orders) {
      const va = a[o.column];
      const vb = b[o.column];
      if (va == null || vb == null) {
        if (va == null && vb == null) continue;
        // Postgres: ASC => NULLS LAST, DESC => NULLS FIRST (salvo nullsFirst explícito)
        const nullsFirst = o.nullsFirst ?? !o.ascending;
        return (va == null ? -1 : 1) * (nullsFirst ? 1 : -1);
      }
      const c = comparar(va, vb);
      if (c !== 0) return o.ascending ? c : -c;
    }
    return 0;
  });
}

// ---------------------------------------------------------------------------
// Relações (embeds)
// ---------------------------------------------------------------------------

interface Relacao {
  table: string;
  many: boolean;
  /** Filho -> pai: casa related[relCol] com row[ownCol]. */
  ownCol: string;
  relCol: string;
}

function resolverRelacao(from: string, rel: string): Relacao {
  // to-one: from.coluna -> rel
  const paraUm = FOREIGN_KEYS.filter((fk) => fk.from === from && fk.to === rel);
  // to-many: rel.coluna -> from
  const paraMuitos = FOREIGN_KEYS.filter((fk) => fk.from === rel && fk.to === from);
  const candidatos = paraUm.length + paraMuitos.length;

  if (candidatos === 0) {
    throw new EngineError(
      'PGRST200',
      `Could not find a relationship between '${from}' and '${rel}' in the schema cache`
    );
  }
  if (candidatos > 1) {
    throw new EngineError(
      'PGRST201',
      `Could not embed because more than one relationship was found for '${from}' and '${rel}'`,
      300
    );
  }
  if (paraUm.length === 1) {
    const fk = paraUm[0];
    return { table: rel, many: false, ownCol: fk.column, relCol: fk.toColumn ?? 'id' };
  }
  const fk = paraMuitos[0];
  return { table: rel, many: true, ownCol: fk.toColumn ?? 'id', relCol: fk.column };
}

// ---------------------------------------------------------------------------
// Projeção
// ---------------------------------------------------------------------------

interface Contexto {
  db: Tables;
  ctx: AuthContext;
  /** Filtros por caminho de embed ("pedidos", "a.b"). */
  filtrosEmbed: Map<string, Filter[]>;
  ordersEmbed: Map<string, Order[]>;
  /** Índices "tabela.coluna" -> valor -> linhas, montados sob demanda. */
  indices: Map<string, Map<unknown, Row[]>>;
}

function linhasPor(c: Contexto, table: string, coluna: string, valor: unknown): Row[] {
  if (valor == null) return [];
  const chave = `.${coluna}`;
  let indice = c.indices.get(chave);
  if (!indice) {
    indice = new Map();
    for (const r of tabela(c.db, table)) {
      const v = r[coluna];
      if (v == null) continue;
      const lista = indice.get(v);
      if (lista) lista.push(r);
      else indice.set(v, [r]);
    }
    c.indices.set(chave, indice);
  }
  return indice.get(valor) ?? [];
}

function checarColunas(table: string, nodes: SelectNode[], ctx: AuthContext) {
  if (ctx.role === 'service_role' || table !== 'pizzarias') return;
  for (const n of nodes) {
    const coluna = n.kind === 'star' ? '*' : n.kind === 'column' ? n.name : null;
    if (coluna !== null && !PIZZARIAS_COLUNAS_PUBLICAS.has(coluna)) {
      throw new EngineError('42501', 'permission denied for table pizzarias', 401);
    }
  }
}

/** Projeta `row`; retorna null quando um embed !inner ficou vazio. */
function projetar(
  table: string,
  row: Row,
  nodes: SelectNode[],
  c: Contexto,
  caminho: string
): Row | null {
  checarColunas(table, nodes, c.ctx);
  const out: Row = {};
  for (const n of nodes) {
    if (n.kind === 'star') {
      Object.assign(out, clone(row));
    } else if (n.kind === 'column') {
      if (!(n.name in row) && !colunaConhecida(table, n.name, c.db)) {
        throw new EngineError('42703', `column ${table}.${n.name} does not exist`);
      }
      out[n.alias] = clone(row[n.name] ?? null);
    } else {
      const rel = resolverRelacao(table, n.relation);
      const sub = caminho ? `${caminho}.${n.alias}` : n.alias;
      const filtros = c.filtrosEmbed.get(sub) ?? [];
      let relacionados = linhasPor(c, rel.table, rel.relCol, row[rel.ownCol]).filter((r) =>
        podeLer(rel.table, r, c.ctx, c.db)
      );
      relacionados = relacionados.filter((r) => filtros.every((f) => passa(r[f.column], f)));
      relacionados = ordenar(relacionados, c.ordersEmbed.get(sub) ?? []);

      const projetados: Row[] = [];
      for (const r of relacionados) {
        const p = projetar(rel.table, r, n.children, c, sub);
        if (p) projetados.push(p);
      }

      if (rel.many) {
        if (n.inner && projetados.length === 0) return null;
        out[n.alias] = projetados;
      } else {
        const unico = projetados[0] ?? null;
        if (n.inner && !unico) return null;
        out[n.alias] = unico;
      }
    }
  }
  return out;
}

/** Coluna existe na tabela? (alguma linha a tem, ou há default). */
function colunaConhecida(table: string, coluna: string, db: Tables): boolean {
  if (DEFAULTS[table] && coluna in DEFAULTS[table]) return true;
  return (db[table] ?? []).some((r) => coluna in r);
}

function separarFiltros(filters: Filter[]) {
  const base: Filter[] = [];
  const embed = new Map<string, Filter[]>();
  for (const f of filters) {
    const i = f.column.lastIndexOf('.');
    if (i === -1) {
      base.push(f);
    } else {
      const caminho = f.column.slice(0, i);
      const lista = embed.get(caminho) ?? [];
      lista.push({ ...f, column: f.column.slice(i + 1) });
      embed.set(caminho, lista);
    }
  }
  return { base, embed };
}

function separarOrders(orders: Order[]) {
  const base: Order[] = [];
  const embed = new Map<string, Order[]>();
  for (const o of orders) {
    if (o.referencedTable) {
      const lista = embed.get(o.referencedTable) ?? [];
      lista.push(o);
      embed.set(o.referencedTable, lista);
    } else {
      base.push(o);
    }
  }
  return { base, embed };
}

function aplicarSingle(spec: QuerySpec, rows: Row[], count: number | null): QueryResult {
  if (spec.single === null) return ok(spec.head ? null : rows, count);
  if (rows.length === 1) return ok(rows[0], count);
  if (rows.length === 0 && spec.single === 'maybe') return ok(null, count);
  return falha(
    new EngineError(
      'PGRST116',
      'JSON object requested, multiple (or no) rows returned',
      406,
      `The result contains ${rows.length} rows`
    )
  );
}

// ---------------------------------------------------------------------------
// SELECT
// ---------------------------------------------------------------------------

function selecionar(spec: QuerySpec, db: Tables, ctx: AuthContext): QueryResult {
  const nodes = parseSelect(spec.columns);
  const { base, embed } = separarFiltros(spec.filters);
  const { base: ordersBase, embed: ordersEmbed } = separarOrders(spec.orders);
  const c: Contexto = { db, ctx, filtrosEmbed: embed, ordersEmbed, indices: new Map() };

  let rows = tabela(db, spec.table).filter((r) => podeLer(spec.table, r, ctx, db));
  rows = rows.filter((r) => base.every((f) => passa(r[f.column], f)));
  rows = ordenar(rows, ordersBase);

  const projetados: Row[] = [];
  for (const r of rows) {
    const p = projetar(spec.table, r, nodes, c, '');
    if (p) projetados.push(p);
  }

  const count = spec.count ? projetados.length : null;
  let pagina = projetados;
  if (spec.range) pagina = pagina.slice(spec.range[0], spec.range[1] + 1);
  if (spec.limit !== null) pagina = pagina.slice(0, spec.limit);
  return aplicarSingle(spec, pagina, count);
}

// ---------------------------------------------------------------------------
// Escritas
// ---------------------------------------------------------------------------

function negado(table: string): EngineError {
  return new EngineError('42501', `permission denied for table ${table}`, 401);
}

function violouRls(table: string): EngineError {
  return new EngineError(
    '42501',
    `new row violates row-level security policy for table "${table}"`,
    403
  );
}

function validarLinha(db: Tables, table: string, row: Row, linhas: Row[], ignorar: Row | null) {
  const checks = CHECK_CONSTRAINTS[table] ?? {};
  for (const [coluna, permitidos] of Object.entries(checks)) {
    if (coluna in row && !permitidos.includes(row[coluna] as never)) {
      throw new EngineError(
        '23514',
        `new row for relation "${table}" violates check constraint "${table}_${coluna}_check"`
      );
    }
  }

  const pk = primaryKey(table);
  const outras = linhas.filter((r) => r !== ignorar);
  if (pk.every((k) => row[k] != null) && outras.some((r) => pk.every((k) => igual(r[k], row[k])))) {
    throw new EngineError(
      '23505',
      `duplicate key value violates unique constraint "${table}_pkey"`,
      409
    );
  }
  for (const uc of UNIQUE_CONSTRAINTS[table] ?? []) {
    const chave = uc.key(row);
    if (chave !== null && outras.some((r) => uc.key(r) === chave)) {
      throw new EngineError('23505', `duplicate key value violates unique constraint "${uc.name}"`, 409);
    }
  }

  for (const fk of FOREIGN_KEYS.filter((f) => f.from === table)) {
    const v = row[fk.column];
    if (v == null) continue;
    const alvo = fk.toColumn ?? 'id';
    if (!(db[fk.to] ?? []).some((r) => igual(r[alvo], v))) {
      throw new EngineError(
        '23503',
        `insert or update on table "${table}" violates foreign key constraint "${table}_${fk.column}_fkey"`,
        409
      );
    }
  }
}

function comDefaults(table: string, valores: Row): Row {
  const row: Row = {};
  for (const [coluna, gerar] of Object.entries(DEFAULTS[table] ?? {})) {
    if (!(coluna in valores)) row[coluna] = gerar();
  }
  return { ...row, ...clone(valores) };
}

function retorno(spec: QuerySpec, rows: Row[], ctx: AuthContext, db: Tables, status: number): QueryResult {
  if (spec.columns === null) {
    return { data: null, error: null, count: spec.count ? rows.length : null, status, statusText: 'OK' };
  }
  const nodes = parseSelect(spec.columns);
  const c: Contexto = { db, ctx, filtrosEmbed: new Map(), ordersEmbed: new Map(), indices: new Map() };
  const projetados = rows
    .map((r) => projetar(spec.table, r, nodes, c, ''))
    .filter((r): r is Row => r !== null);
  return { ...aplicarSingle(spec, projetados, spec.count ? projetados.length : null), status };
}

function inserir(spec: QuerySpec, db: Tables, ctx: AuthContext, changes: Change[]): QueryResult {
  const linhas = tabela(db, spec.table);
  const valores = (Array.isArray(spec.values) ? spec.values : [spec.values]) as Row[];
  const novas: Row[] = [];
  for (const v of valores) {
    const row = comDefaults(spec.table, v);
    const pode = podeEscrever(spec.table, 'insert', row, ctx);
    if (pode === null) throw negado(spec.table);
    if (!pode) throw violouRls(spec.table);
    validarLinha(db, spec.table, row, [...linhas, ...novas], null);
    novas.push(row);
  }
  linhas.push(...novas);
  for (const r of novas) changes.push({ table: spec.table, type: 'INSERT', record: clone(r) });
  return retorno(spec, novas, ctx, db, 201);
}

function upsert(spec: QuerySpec, db: Tables, ctx: AuthContext, changes: Change[]): QueryResult {
  const linhas = tabela(db, spec.table);
  const conflito = spec.onConflict
    ? spec.onConflict.split(',').map((s) => s.trim())
    : primaryKey(spec.table);
  const valores = (Array.isArray(spec.values) ? spec.values : [spec.values]) as Row[];
  const afetadas: Row[] = [];

  for (const v of valores) {
    const existente = linhas.find((r) => conflito.every((k) => igual(r[k], v[k])));
    if (existente) {
      if (spec.ignoreDuplicates) continue;
      const pode = podeEscrever(spec.table, 'update', existente, ctx);
      if (pode === null) throw negado(spec.table);
      if (!pode) throw violouRls(spec.table);
      const novo = { ...existente, ...clone(v) };
      UPDATE_TRIGGERS[spec.table]?.(novo);
      validarLinha(db, spec.table, novo, linhas, existente);
      Object.assign(existente, novo);
      afetadas.push(existente);
      changes.push({ table: spec.table, type: 'UPDATE', record: clone(existente) });
    } else {
      const row = comDefaults(spec.table, v);
      const pode = podeEscrever(spec.table, 'insert', row, ctx);
      if (pode === null) throw negado(spec.table);
      if (!pode) throw violouRls(spec.table);
      validarLinha(db, spec.table, row, linhas, null);
      linhas.push(row);
      afetadas.push(row);
      changes.push({ table: spec.table, type: 'INSERT', record: clone(row) });
    }
  }
  return retorno(spec, afetadas, ctx, db, 201);
}

function alvos(spec: QuerySpec, db: Tables, ctx: AuthContext): Row[] {
  const { base, embed } = separarFiltros(spec.filters);
  if (embed.size > 0) {
    throw new EngineError('PGRST100', 'filtros em tabela embutida não são suportados em escritas');
  }
  // UPDATE/DELETE só alcançam linhas que a policy de SELECT deixa ver
  return tabela(db, spec.table).filter(
    (r) => podeLer(spec.table, r, ctx, db) && base.every((f) => passa(r[f.column], f))
  );
}

function atualizar(spec: QuerySpec, db: Tables, ctx: AuthContext, changes: Change[]): QueryResult {
  if (ctx.role !== 'service_role' && podeEscrever(spec.table, 'update', {}, ctx) === null) {
    throw negado(spec.table);
  }
  const linhas = tabela(db, spec.table);
  const afetadas: Row[] = [];
  for (const row of alvos(spec, db, ctx)) {
    if (!podeEscrever(spec.table, 'update', row, ctx)) continue; // policy USING
    const novo = { ...row, ...clone(spec.values as Row) };
    UPDATE_TRIGGERS[spec.table]?.(novo);
    validarLinha(db, spec.table, novo, linhas, row);
    Object.assign(row, novo);
    afetadas.push(row);
    changes.push({ table: spec.table, type: 'UPDATE', record: clone(row) });
  }
  return retorno(spec, afetadas, ctx, db, 200);
}

function removerEmCascata(db: Tables, table: string, removida: Row, changes: Change[]) {
  for (const fk of FOREIGN_KEYS.filter((f) => f.to === table)) {
    const alvo = fk.toColumn ?? 'id';
    const filhos = (db[fk.from] ?? []).filter((r) => igual(r[fk.column], removida[alvo]));
    if (filhos.length === 0) continue;
    if (fk.onDelete === 'restrict') {
      throw new EngineError(
        '23503',
        `update or delete on table "${table}" violates foreign key constraint "${fk.from}_${fk.column}_fkey" on table "${fk.from}"`,
        409
      );
    }
    if (fk.onDelete === 'set null') {
      for (const f of filhos) f[fk.column] = null;
      continue;
    }
    db[fk.from] = db[fk.from].filter((r) => !filhos.includes(r));
    for (const f of filhos) {
      changes.push({ table: fk.from, type: 'DELETE', record: clone(f) });
      removerEmCascata(db, fk.from, f, changes);
    }
  }
}

function remover(spec: QuerySpec, db: Tables, ctx: AuthContext, changes: Change[]): QueryResult {
  if (ctx.role !== 'service_role' && podeEscrever(spec.table, 'delete', {}, ctx) === null) {
    throw negado(spec.table);
  }
  const removidas = alvos(spec, db, ctx).filter((r) => podeEscrever(spec.table, 'delete', r, ctx));
  db[spec.table] = tabela(db, spec.table).filter((r) => !removidas.includes(r));
  for (const r of removidas) {
    changes.push({ table: spec.table, type: 'DELETE', record: clone(r) });
    removerEmCascata(db, spec.table, r, changes);
  }
  return retorno(spec, removidas, ctx, db, 200);
}

// ---------------------------------------------------------------------------
// RPC
// ---------------------------------------------------------------------------

type Rpc = (args: Record<string, unknown>, db: Tables, changes: Change[]) => unknown;

const RPCS: Record<string, { somenteServiceRole: boolean; fn: Rpc }> = {
  // checkout.sql: insert ... on conflict do update set proximo = proximo + 1 returning proximo - 1
  proximo_numero_pedido: {
    somenteServiceRole: true,
    fn: (args, db, changes) => {
      const pizzariaId = args.p_pizzaria;
      const contadores = tabela(db, 'contadores_pedido');
      let linha = contadores.find((r) => r.pizzaria_id === pizzariaId);
      if (!linha) {
        if (!tabela(db, 'pizzarias').some((p) => p.id === pizzariaId)) {
          throw new EngineError(
            '23503',
            'insert or update on table "contadores_pedido" violates foreign key constraint "contadores_pedido_pizzaria_id_fkey"',
            409
          );
        }
        linha = { pizzaria_id: pizzariaId, proximo: 2 };
        contadores.push(linha);
      } else {
        linha.proximo = Number(linha.proximo) + 1;
      }
      changes.push({ table: 'contadores_pedido', type: 'UPDATE', record: clone(linha) });
      return Number(linha.proximo) - 1;
    },
  },
};

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export function executar(spec: QuerySpec, db: Tables, ctx: AuthContext): ExecResult {
  const changes: Change[] = [];
  // escrita é tudo-ou-nada: trabalha numa cópia e só devolve se não falhar
  const trabalho = spec.action === 'select' ? db : clone(db);
  try {
    let result: QueryResult;
    switch (spec.action) {
      case 'select':
        result = selecionar(spec, trabalho, ctx);
        break;
      case 'insert':
        result = inserir(spec, trabalho, ctx, changes);
        break;
      case 'upsert':
        result = upsert(spec, trabalho, ctx, changes);
        break;
      case 'update':
        result = atualizar(spec, trabalho, ctx, changes);
        break;
      case 'delete':
        result = remover(spec, trabalho, ctx, changes);
        break;
    }
    if (spec.action !== 'select' && !result.error) {
      for (const k of Object.keys(db)) delete db[k];
      Object.assign(db, trabalho);
    }
    return { result, changes: result.error ? [] : changes };
  } catch (e) {
    if (e instanceof EngineError) return { result: falha(e), changes: [] };
    throw e;
  }
}

export function executarRpc(
  nome: string,
  args: Record<string, unknown>,
  db: Tables,
  ctx: AuthContext
): ExecResult {
  const rpc = RPCS[nome];
  if (!rpc) {
    return {
      result: falha(
        new EngineError('PGRST202', `Could not find the function public.${nome} in the schema cache`, 404)
      ),
      changes: [],
    };
  }
  if (rpc.somenteServiceRole && ctx.role !== 'service_role') {
    return {
      result: falha(new EngineError('42501', `permission denied for function ${nome}`, 401)),
      changes: [],
    };
  }
  const trabalho = clone(db);
  const changes: Change[] = [];
  try {
    const data = rpc.fn(args, trabalho, changes);
    for (const k of Object.keys(db)) delete db[k];
    Object.assign(db, trabalho);
    return { result: ok(data, null), changes };
  } catch (e) {
    if (e instanceof EngineError) return { result: falha(e), changes: [] };
    throw e;
  }
}
