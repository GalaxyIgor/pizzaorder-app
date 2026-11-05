// packages/supabase-mock/src/engine.test.ts
//
// Engine + policies contra o seed, sem disco: cada teste parte de um estado novo.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executar, executarRpc } from './engine';
import { SERVICE_ROLE, type AuthContext } from './policies';
import { MockQueryBuilder, type QueryResult, type QuerySpec } from './query-builder';
import { parseSelect } from './select-parser';
import { gerarSeed } from './seed';
import type { Row, Tables } from './schema';

function novoDb() {
  return gerarSeed(new Date('2026-10-10T22:00:00.000Z'));
}

/** Client mínimo sobre um db em memória (mesmo builder dos apps). */
function client(db: Tables, ctx: AuthContext) {
  return {
    from: (table: string) =>
      new MockQueryBuilder(table, async (spec: QuerySpec) => executar(spec, db, ctx).result),
    rpc: async (nome: string, args: Record<string, unknown>) => executarRpc(nome, args, db, ctx).result,
  };
}

const anon: AuthContext = { role: 'anon', uid: null };
const como = (uid: string): AuthContext => ({ role: 'authenticated', uid });

function pizzaria(db: Tables, slug: string): Row {
  return db.pizzarias.find((p) => p.slug === slug)!;
}

function staffDe(db: Tables, pizzariaId: unknown, papel: string): string {
  return db.staff_pizzaria.find((s) => s.pizzaria_id === pizzariaId && s.papel === papel)!.user_id as string;
}

test('parseSelect: colunas, alias, embed aninhado e !inner', () => {
  const nodes = parseSelect('id, n:nome, grupos_adicionais!inner(pizzaria_id), opcoes (id, precos (tamanho))');
  assert.deepEqual(nodes[1], { kind: 'column', name: 'nome', alias: 'n' });
  assert.equal(nodes[2].kind === 'embed' && nodes[2].inner, true);
  assert.equal(nodes[3].kind === 'embed' && nodes[3].children[1].kind, 'embed');
});

test('select com embed to-many e to-one, como na rota pública do cardápio', async () => {
  const { tables } = novoDb();
  const sb = client(tables, anon);
  const z = pizzaria(tables, 'pizzaria-teste');

  const { data: produtos, error } = await sb
    .from('produtos')
    .select('id, nome, variacoes_produto (id, tamanho, preco, disponivel)')
    .eq('pizzaria_id', z.id)
    .eq('disponivel', true)
    .order('ordem');
  assert.equal(error, null);
  const lista = produtos as { nome: string; variacoes_produto: unknown[] }[];
  assert.ok(lista.length >= 10);
  assert.ok(lista.every((p) => Array.isArray(p.variacoes_produto) && p.variacoes_produto.length > 0));
  // produto indisponível (Funghi Trufada) é filtrado pelo RLS e pelo eq
  assert.ok(!lista.some((p) => p.nome === 'Funghi Trufada'));

  const { data: destaques } = await sb
    .from('destaques')
    .select('ordem, produtos (id, nome)')
    .eq('pizzaria_id', z.id)
    .order('ordem');
  const d = destaques as { produtos: { nome: string } }[];
  assert.equal(d[0].produtos.nome, 'Quatro Queijos');
});

test('!inner com filtro em tabela embutida (analytics da gestão)', async () => {
  const { tables } = novoDb();
  const sb = client(tables, SERVICE_ROLE);
  const z = pizzaria(tables, 'pizzaria-teste');
  const { data, error } = await sb
    .from('itens_pedido')
    .select('nome, quantidade, pedidos!inner(pizzaria_id, status)')
    .eq('pedidos.pizzaria_id', z.id)
    .neq('pedidos.status', 'cancelado');
  assert.equal(error, null);
  const itens = data as { pedidos: { pizzaria_id: string; status: string } }[];
  assert.ok(itens.length > 100);
  assert.ok(itens.every((i) => i.pedidos.pizzaria_id === z.id && i.pedidos.status !== 'cancelado'));
});

test('count exact + head', async () => {
  const { tables } = novoDb();
  const sb = client(tables, SERVICE_ROLE);
  const r = (await sb.from('pedidos').select('id', { count: 'exact', head: true }).eq('status', 'pendente')) as QueryResult;
  assert.equal(r.data, null);
  assert.equal(r.count, tables.pedidos.filter((p) => p.status === 'pendente').length);
});

test('single sem linha => PGRST116; maybeSingle => null', async () => {
  const { tables } = novoDb();
  const sb = client(tables, SERVICE_ROLE);
  const r1 = await sb.from('pizzarias').select('id').eq('slug', 'nao-existe').single();
  assert.equal(r1.error?.code, 'PGRST116');
  const r2 = await sb.from('pizzarias').select('id').eq('slug', 'nao-existe').maybeSingle();
  assert.equal(r2.error, null);
  assert.equal(r2.data, null);
});

test('insert com defaults + .select().single(), update com trigger, delete em cascata', async () => {
  const { tables } = novoDb();
  const sb = client(tables, SERVICE_ROLE);
  const z = pizzaria(tables, 'pizzaria-teste');
  const cat = tables.categorias.find((c) => c.pizzaria_id === z.id)!;

  const { data: novo, error } = await sb
    .from('produtos')
    .insert({ pizzaria_id: z.id, categoria_id: cat.id, nome: 'Nova' })
    .select('id, disponivel, ordem')
    .single();
  assert.equal(error, null);
  assert.deepEqual({ ...(novo as Row), id: undefined }, { id: undefined, disponivel: true, ordem: 0 });

  const id = (novo as Row).id;
  await sb.from('variacoes_produto').insert([{ produto_id: id, tamanho: 'M', preco: 10 }]);
  await sb.from('produtos').delete().eq('id', id);
  assert.ok(!tables.variacoes_produto.some((v) => v.produto_id === id), 'variações removidas em cascata');

  const pedido = tables.pedidos[0];
  const antes = pedido.atualizado_em;
  const up = await sb.from('pedidos').update({ status: 'cancelado' }).eq('id', pedido.id).select('id, atualizado_em');
  assert.equal((up.data as Row[]).length, 1);
  assert.notEqual(tables.pedidos.find((p) => p.id === pedido.id)!.atualizado_em, antes);
});

test('constraints: check de status, telefone único (23505), FK', async () => {
  const { tables } = novoDb();
  const sb = client(tables, SERVICE_ROLE);
  const r1 = await sb.from('pedidos').update({ status: 'entregue' }).eq('id', tables.pedidos[0].id);
  assert.equal(r1.error?.code, '23514');

  const [p1, p2] = tables.perfis;
  const r2 = await sb.from('perfis').upsert({ id: p2.id, nome: 'X', telefone: p1.telefone });
  assert.equal(r2.error?.code, '23505');

  const r3 = await sb.from('itens_pedido').insert({ pedido_id: crypto.randomUUID(), tipo: 'produto', nome: 'x', preco_unit: 1, quantidade: 1 });
  assert.equal(r3.error?.code, '23503');
});

test('escrita com erro não deixa nada pela metade', async () => {
  const { tables } = novoDb();
  const sb = client(tables, SERVICE_ROLE);
  const antes = tables.itens_pedido.length;
  const r = await sb.from('itens_pedido').insert([
    { pedido_id: tables.pedidos[0].id, tipo: 'produto', nome: 'ok', preco_unit: 1, quantidade: 1 },
    { pedido_id: tables.pedidos[0].id, tipo: 'invalido', nome: 'x', preco_unit: 1, quantidade: 1 },
  ]);
  assert.ok(r.error);
  assert.equal(tables.itens_pedido.length, antes);
});

test('rpc proximo_numero_pedido é sequencial e só para service-role', async () => {
  const { tables } = novoDb();
  const z = pizzaria(tables, 'pizzaria-teste');
  const sb = client(tables, SERVICE_ROLE);
  const a = await sb.rpc('proximo_numero_pedido', { p_pizzaria: z.id });
  const b = await sb.rpc('proximo_numero_pedido', { p_pizzaria: z.id });
  assert.equal(b.data, (a.data as number) + 1);
  const maxNumero = Math.max(...tables.pedidos.filter((p) => p.pizzaria_id === z.id).map((p) => Number(p.numero)));
  assert.equal(a.data, maxNumero + 1);

  const negado = await client(tables, como(staffDe(tables, z.id, 'gerente'))).rpc('proximo_numero_pedido', { p_pizzaria: z.id });
  assert.equal(negado.error?.code, '42501');
});

test('RLS: cliente só vê os próprios pedidos e endereços', async () => {
  const { tables } = novoDb();
  const ana = tables.perfis.find((p) => p.nome === 'Ana Souza')!.id as string;
  const sb = client(tables, como(ana));
  const { data: pedidos } = await sb.from('pedidos').select('id, cliente_id');
  assert.ok((pedidos as Row[]).length > 0);
  assert.ok((pedidos as Row[]).every((p) => p.cliente_id === ana));

  const { data: enderecos } = await sb.from('enderecos_cliente').select('cliente_id');
  assert.ok((enderecos as Row[]).every((e) => e.cliente_id === ana));

  const { data: anonPedidos } = await client(tables, anon).from('pedidos').select('id');
  assert.deepEqual(anonPedidos, []);
});

test('RLS: staff vê só pedidos da própria pizzaria (multi-tenant)', async () => {
  const { tables } = novoDb();
  const vila = pizzaria(tables, 'forno-da-vila');
  const gerenteVila = staffDe(tables, vila.id, 'gerente');
  const { data } = await client(tables, como(gerenteVila)).from('pedidos').select('pizzaria_id, itens_pedido (id)');
  const lista = data as { pizzaria_id: string; itens_pedido: unknown[] }[];
  assert.ok(lista.length > 0);
  assert.ok(lista.every((p) => p.pizzaria_id === vila.id && p.itens_pedido.length > 0));
});

test('RLS: anon não escreve e não lê colunas fora do grant de pizzarias', async () => {
  const { tables } = novoDb();
  const sb = client(tables, anon);
  const w = await sb.from('pedidos').update({ status: 'cancelado' }).eq('id', tables.pedidos[0].id);
  assert.equal(w.error?.code, '42501');
  const r = await sb.from('pizzarias').select('*');
  assert.equal(r.error?.code, '42501');
  const ok = await sb.from('pizzarias').select('id, nome, slug');
  assert.equal(ok.error, null);
});

test('seed: fila ativa hoje e histórico de 30 dias', () => {
  const { tables } = novoDb();
  const z = pizzaria(tables, 'pizzaria-teste');
  const doZ = tables.pedidos.filter((p) => p.pizzaria_id === z.id);
  for (const s of ['pendente', 'aceito', 'em_preparo', 'pronto', 'saiu_para_entrega']) {
    assert.ok(doZ.some((p) => p.status === s), `tem pedido ${s}`);
  }
  assert.ok(doZ.length > 400);
  const numeros = doZ.map((p) => p.numero as number);
  assert.equal(new Set(numeros).size, numeros.length, 'números únicos');
});
