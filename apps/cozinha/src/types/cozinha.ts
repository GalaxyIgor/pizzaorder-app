// src/types/cozinha.ts
//
// Shapes do painel: pedido com itens embutidos (select aninhado do Supabase).

import type { ItemPedidoRow, PedidoDetalhe, StatusPedido } from '@pizzaorder/shared';

export interface PedidoCozinha extends PedidoDetalhe {
  itens_pedido: ItemPedidoRow[];
}

/** Status que aparecem no painel (o resto é histórico). */
export const STATUS_ATIVOS: StatusPedido[] = [
  'pendente',
  'em_preparo',
  'pronto',
  'saiu_para_entrega',
];

export const SELECT_PEDIDO_COZINHA =
  'id, numero, status, modalidade, total, criado_em, previsao_pronto_em, nome_cliente, telefone_cliente, endereco_entrega, observacao, subtotal, taxa_entrega, taxa_servico, forma_pagamento, metodo_pagamento_local, status_pagamento, itens_pedido (id, tipo, nome, descricao, tamanho, preco_unit, quantidade, sabores, adicionais)';
