// packages/shared/src/painel.ts
//
// Shapes dos painéis de staff (cozinha e gestão): pedido com itens embutidos
// (select aninhado do Supabase). Compartilhado para os dois apps não driftarem.

import type { ItemPedidoRow, PedidoDetalhe, StatusPedido } from './pedido';

export interface PedidoPainel extends PedidoDetalhe {
  itens_pedido: ItemPedidoRow[];
}

/** Status que aparecem nos painéis (o resto é histórico). */
export const STATUS_ATIVOS: StatusPedido[] = [
  'pendente',
  'aceito',
  'em_preparo',
  'pronto',
  'saiu_para_entrega',
];

export const SELECT_PEDIDO_PAINEL =
  'id, numero, status, modalidade, total, criado_em, previsao_pronto_em, nome_cliente, telefone_cliente, endereco_entrega, observacao, subtotal, taxa_entrega, taxa_servico, forma_pagamento, metodo_pagamento_local, status_pagamento, itens_pedido (id, tipo, nome, descricao, tamanho, preco_unit, quantidade, sabores, adicionais)';
