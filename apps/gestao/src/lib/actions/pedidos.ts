'use server';

// src/lib/actions/pedidos.ts
//
// Mudança de status pela GESTÃO — a orquestradora do fluxo: aceita (com
// previsão), despacha a entrega, conclui e é a única que cancela (com motivo).
// Mesmo padrão da cozinha: não existe policy de UPDATE em pedidos — a escrita
// é service-role, com exigirStaff + máquina de estados validando tudo aqui.

import { revalidatePath } from 'next/cache';
import { TRANSICOES_STATUS, type StatusPedido } from '@pizzaorder/shared';
import { supabase as admin } from '@/lib/supabase';
import { exigirStaff } from '@/lib/staff';

export interface AcaoPedidoResult {
  erro?: string;
}

export interface AtualizarStatusInput {
  slug: string;
  pedidoId: string;
  novoStatus: StatusPedido;
  /** Obrigatório ao aceitar (pendente -> aceito): grava previsao_pronto_em. */
  minutosEstimados?: number;
  /** Obrigatório ao cancelar. Uso interno — o cliente vê só "Cancelado". */
  motivo?: string;
}

/**
 * Transições que a GESTÃO pode fazer (subconjunto de TRANSICOES_STATUS).
 * aceito -> em_preparo é gesto da cozinha; em_preparo -> pronto os dois podem
 * (a gestão marca pronta quando a cozinha esquece ou não está com a tela aberta).
 */
const TRANSICOES_GESTAO: Partial<Record<StatusPedido, StatusPedido[]>> = {
  pendente: ['aceito', 'cancelado'],
  aceito: ['cancelado'],
  em_preparo: ['pronto', 'cancelado'],
  pronto: ['saiu_para_entrega', 'concluido', 'cancelado'],
  saiu_para_entrega: ['concluido', 'cancelado'],
};

export async function atualizarStatusPedido(
  input: AtualizarStatusInput
): Promise<AcaoPedidoResult> {
  const { pizzaria } = await exigirStaff(input.slug);

  const { data: pedido } = await admin
    .from('pedidos')
    .select('id, pizzaria_id, status, modalidade')
    .eq('id', input.pedidoId)
    .single();

  if (!pedido || pedido.pizzaria_id !== pizzaria.id) {
    return { erro: 'Pedido não encontrado.' };
  }

  const statusAtual = pedido.status as StatusPedido;
  if (!TRANSICOES_STATUS[statusAtual]?.includes(input.novoStatus)) {
    return { erro: `O pedido já está "${statusAtual}" — atualize o painel.` };
  }
  if (!TRANSICOES_GESTAO[statusAtual]?.includes(input.novoStatus)) {
    return { erro: 'Essa mudança é da cozinha (fila e preparo).' };
  }
  if (input.novoStatus === 'saiu_para_entrega' && pedido.modalidade !== 'entrega') {
    return { erro: 'Esse pedido não é de entrega.' };
  }

  const mudancas: Record<string, unknown> = { status: input.novoStatus };

  if (input.novoStatus === 'aceito') {
    const minutos = Math.round(input.minutosEstimados ?? 0);
    if (!minutos || minutos < 1 || minutos > 240) {
      return { erro: 'Informe a previsão em minutos (1 a 240).' };
    }
    mudancas.previsao_pronto_em = new Date(Date.now() + minutos * 60_000).toISOString();
  }

  if (input.novoStatus === 'cancelado') {
    const motivo = input.motivo?.trim();
    if (!motivo) return { erro: 'Informe o motivo do cancelamento.' };
    mudancas.motivo_cancelamento = motivo;
  }

  const { error } = await admin
    .from('pedidos')
    .update(mudancas)
    .eq('id', pedido.id)
    // condição de corrida: cozinha e gestão operam o mesmo pedido
    .eq('status', statusAtual);

  if (error) {
    console.error('[atualizarStatusPedido]', error.code, error.message);
    return { erro: 'Não foi possível atualizar o pedido. Tente novamente.' };
  }

  revalidatePath(`/${input.slug}/pedidos`);
  return {};
}

/** Liga/desliga a pausa de novos pedidos (o cardápio avisa e o criarPedido recusa). */
export async function pausarLoja(slug: string, pausado: boolean): Promise<AcaoPedidoResult> {
  const { pizzaria } = await exigirStaff(slug);

  const { error } = await admin
    .from('pizzarias')
    .update({ pedidos_pausados: pausado })
    .eq('id', pizzaria.id);

  if (error) {
    console.error('[pausarLoja]', error.code, error.message);
    return { erro: 'Não foi possível atualizar a pausa. Tente novamente.' };
  }

  revalidatePath(`/${slug}/pedidos`);
  return {};
}
