'use server';

// src/lib/actions/pedidos.ts
//
// Mudança de status pela cozinha. Mesmo padrão do criarPedido do cardápio:
// não existe policy de UPDATE em pedidos — a escrita é service-role, com
// exigirStaff + máquina de estados (TRANSICOES_STATUS) validando tudo aqui.
//
// A cozinha é produção pura: move a pizza da fila para "cozinhando"
// (aceito -> em_preparo) e avisa que ficou pronta (em_preparo -> pronto).
// Também pode VOLTAR um passo (clique acidental): em_preparo -> aceito e
// pronto -> em_preparo. Aceite, cancelamento e entrega são da gestão (apps/gestao).

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
}

/** Transições que a COZINHA pode fazer (subconjunto de TRANSICOES_STATUS). */
const TRANSICOES_COZINHA: Partial<Record<StatusPedido, StatusPedido[]>> = {
  aceito: ['em_preparo'],
  // 'aceito' e 'em_preparo' como destino são o desfazer de clique acidental
  em_preparo: ['pronto', 'aceito'],
  pronto: ['em_preparo'],
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
  if (!TRANSICOES_COZINHA[statusAtual]?.includes(input.novoStatus)) {
    return { erro: 'Essa mudança é feita pela gestão, não pela cozinha.' };
  }

  const { error } = await admin
    .from('pedidos')
    .update({ status: input.novoStatus })
    .eq('id', pedido.id)
    // condição de corrida: outra tela pode ter mudado o status nesse meio tempo
    .eq('status', statusAtual);

  if (error) {
    console.error('[atualizarStatusPedido]', error.code, error.message);
    return { erro: 'Não foi possível atualizar o pedido. Tente novamente.' };
  }

  revalidatePath(`/${input.slug}`);
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

  revalidatePath(`/${slug}`);
  return {};
}
