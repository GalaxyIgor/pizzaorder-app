// packages/supabase-mock/src/policies.ts
//
// RLS simplificado, espelhando supabase/rls.sql. O service-role ignora tudo;
// anon/authenticated só enxergam o catálogo público e os próprios dados, e
// não escrevem nada além de enderecos_cliente (próprios) e perfis (update).
// Manter em sincronia com rls.sql — é o que faz o mock não mascarar bugs de
// autorização (ex.: tela que só funciona porque usa o client errado).

import type { Row, Tables } from './schema';

export type Role = 'service_role' | 'anon' | 'authenticated';

export interface AuthContext {
  role: Role;
  uid: string | null;
}

export const SERVICE_ROLE: AuthContext = { role: 'service_role', uid: null };

type SelectPolicy = (row: Row, ctx: AuthContext, db: Tables) => boolean;

const pizzariaAtiva = (db: Tables, id: unknown) =>
  (db.pizzarias ?? []).some((z) => z.id === id && z.ativo === true);

const ehStaff = (db: Tables, uid: string | null, pizzariaId: unknown) =>
  uid !== null &&
  (db.staff_pizzaria ?? []).some((s) => s.user_id === uid && s.pizzaria_id === pizzariaId);

const autenticado = (ctx: AuthContext) => ctx.role === 'authenticated' && ctx.uid !== null;

const SELECT_POLICIES: Record<string, SelectPolicy> = {
  // §3 catálogo público
  pizzarias: (r) => r.ativo === true,
  categorias: (r, _c, db) => r.ativo === true && pizzariaAtiva(db, r.pizzaria_id),
  produtos: (r, _c, db) => r.disponivel === true && pizzariaAtiva(db, r.pizzaria_id),
  variacoes_produto: (r, _c, db) =>
    (db.produtos ?? []).some((p) => p.id === r.produto_id && p.disponivel === true),
  grupos_adicionais: (r, _c, db) => r.ativo === true && pizzariaAtiva(db, r.pizzaria_id),
  opcoes_adicionais: (r, _c, db) =>
    (db.grupos_adicionais ?? []).some((g) => g.id === r.grupo_id && g.ativo === true),
  precos_opcao_por_tamanho: (r, _c, db) => {
    const opcao = (db.opcoes_adicionais ?? []).find((o) => o.id === r.opcao_id);
    return !!opcao && (db.grupos_adicionais ?? []).some((g) => g.id === opcao.grupo_id && g.ativo === true);
  },
  destaques: (r, _c, db) => r.ativo === true && pizzariaAtiva(db, r.pizzaria_id),
  combos_meia_meia: (r, _c, db) => r.ativo === true && pizzariaAtiva(db, r.pizzaria_id),
  combos_produtos: (r, _c, db) => r.ativo === true && pizzariaAtiva(db, r.pizzaria_id),

  // §4 dados do cliente
  perfis: (r, c) => autenticado(c) && r.id === c.uid,
  enderecos_cliente: (r, c) => autenticado(c) && r.cliente_id === c.uid,

  // §4 + §5 pedidos: dono ou staff da pizzaria
  pedidos: (r, c, db) =>
    autenticado(c) && (r.cliente_id === c.uid || ehStaff(db, c.uid, r.pizzaria_id)),
  itens_pedido: (r, c, db) => {
    if (!autenticado(c)) return false;
    const p = (db.pedidos ?? []).find((x) => x.id === r.pedido_id);
    return !!p && (p.cliente_id === c.uid || ehStaff(db, c.uid, p.pizzaria_id));
  },
  staff_pizzaria: (r, c) => autenticado(c) && r.user_id === c.uid,
  // contadores_pedido: sem policy => invisível
};

export function podeLer(table: string, row: Row, ctx: AuthContext, db: Tables): boolean {
  if (ctx.role === 'service_role') return true;
  const policy = SELECT_POLICIES[table];
  return policy ? policy(row, ctx, db) : false;
}

export type WriteAction = 'insert' | 'update' | 'delete';

/**
 * §7: anon não escreve; authenticated só enderecos_cliente (próprios) e
 * update de perfis (próprio). `null` = sem GRANT (erro 42501); `false` = o
 * GRANT existe mas a policy barra a linha.
 */
export function podeEscrever(
  table: string,
  action: WriteAction,
  row: Row,
  ctx: AuthContext
): boolean | null {
  if (ctx.role === 'service_role') return true;
  if (!autenticado(ctx)) return null;
  if (table === 'enderecos_cliente') return row.cliente_id === ctx.uid;
  if (table === 'perfis' && action === 'update') return row.id === ctx.uid;
  return null;
}
