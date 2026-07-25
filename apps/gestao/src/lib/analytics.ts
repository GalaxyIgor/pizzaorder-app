// src/lib/analytics.ts
//
// Agregações do dashboard. Leitura via service-role, mas as funções exigem o
// StaffContext devolvido por exigirStaff() — sem passar pelo guard não há como
// chamá-las. Agregação em JS: o volume de uma pizzaria (centenas de
// pedidos/mês) dispensa views SQL.
//
// Regra de faturamento: todo pedido não-cancelado do período conta (pedido
// aceito é venda do dia); cancelados são contados/somados à parte.

import type { Modalidade } from '@pizzaorder/shared';
import { supabase as admin } from '@/lib/supabase';
import type { StaffContext } from '@/lib/staff';
import { diaLocalDe, type IntervaloPeriodo } from '@/lib/datas';

export interface PedidoAgregavel {
  numero: number;
  total: number;
  modalidade: Modalidade;
  status: string;
  criado_em: string;
  motivo_cancelamento: string | null;
}

/** Uma busca por período — as funções puras abaixo agregam sobre o resultado. */
export async function carregarPedidosPeriodo(
  staff: StaffContext,
  intervalo: IntervaloPeriodo
): Promise<PedidoAgregavel[]> {
  const { data, error } = await admin
    .from('pedidos')
    .select('numero, total, modalidade, status, criado_em, motivo_cancelamento')
    .eq('pizzaria_id', staff.pizzaria.id)
    .gte('criado_em', intervalo.inicioISO)
    .lt('criado_em', intervalo.fimISO)
    .order('criado_em', { ascending: false });

  if (error) {
    console.error('[carregarPedidosPeriodo]', error.code, error.message);
    return [];
  }
  return (data ?? []) as PedidoAgregavel[];
}

export interface ResumoPeriodo {
  faturamento: number;
  qtdPedidos: number;
  ticketMedio: number;
  porModalidade: Record<Modalidade, number>;
  cancelados: { qtd: number; valor: number };
}

export function resumirPedidos(pedidos: PedidoAgregavel[]): ResumoPeriodo {
  const validos = pedidos.filter((p) => p.status !== 'cancelado');
  const cancelados = pedidos.filter((p) => p.status === 'cancelado');

  const faturamento = validos.reduce((s, p) => s + Number(p.total), 0);
  const porModalidade: Record<Modalidade, number> = { entrega: 0, retirada: 0, local: 0 };
  for (const p of validos) porModalidade[p.modalidade] += 1;

  return {
    faturamento,
    qtdPedidos: validos.length,
    ticketMedio: validos.length > 0 ? faturamento / validos.length : 0,
    porModalidade,
    cancelados: {
      qtd: cancelados.length,
      valor: cancelados.reduce((s, p) => s + Number(p.total), 0),
    },
  };
}

export interface DiaFaturamento {
  dia: string; // 'YYYY-MM-DD' local
  total: number;
  qtd: number;
}

/** Bucketiza por dia LOCAL, incluindo dias sem venda (barras zeradas). */
export function faturamentoPorDia(
  pedidos: PedidoAgregavel[],
  intervalo: IntervaloPeriodo
): DiaFaturamento[] {
  const buckets = new Map<string, DiaFaturamento>(
    intervalo.dias.map((dia) => [dia, { dia, total: 0, qtd: 0 }])
  );
  for (const p of pedidos) {
    if (p.status === 'cancelado') continue;
    const bucket = buckets.get(diaLocalDe(p.criado_em));
    if (!bucket) continue; // fora do intervalo (não deveria acontecer)
    bucket.total += Number(p.total);
    bucket.qtd += 1;
  }
  return [...buckets.values()];
}

export interface ProdutoRanqueado {
  nome: string;
  qtd: number;
  receita: number;
}

export async function produtosMaisVendidos(
  staff: StaffContext,
  intervalo: IntervaloPeriodo,
  limite = 10
): Promise<ProdutoRanqueado[]> {
  // `pedidos!inner` é obrigatório: sem ele o filtro no embed não exclui linhas.
  const { data, error } = await admin
    .from('itens_pedido')
    .select('nome, quantidade, preco_unit, pedidos!inner(pizzaria_id, status, criado_em)')
    .eq('pedidos.pizzaria_id', staff.pizzaria.id)
    .neq('pedidos.status', 'cancelado')
    .gte('pedidos.criado_em', intervalo.inicioISO)
    .lt('pedidos.criado_em', intervalo.fimISO);

  if (error) {
    console.error('[produtosMaisVendidos]', error.code, error.message);
    return [];
  }

  const porNome = new Map<string, ProdutoRanqueado>();
  for (const item of data ?? []) {
    const atual = porNome.get(item.nome) ?? { nome: item.nome, qtd: 0, receita: 0 };
    atual.qtd += Number(item.quantidade);
    atual.receita += Number(item.preco_unit) * Number(item.quantidade);
    porNome.set(item.nome, atual);
  }

  return [...porNome.values()]
    .sort((a, b) => b.qtd - a.qtd || b.receita - a.receita)
    .slice(0, limite);
}
