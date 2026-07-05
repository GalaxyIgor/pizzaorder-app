// src/types/cozinha.ts
//
// Shapes do painel movidos para @pizzaorder/shared (src/painel.ts) — a gestão
// usa os mesmos. Aqui ficam os aliases e o recorte de status da cozinha.

import type { PedidoPainel, StatusPedido } from '@pizzaorder/shared';

export type PedidoCozinha = PedidoPainel;

export { SELECT_PEDIDO_PAINEL as SELECT_PEDIDO_COZINHA } from '@pizzaorder/shared';

/**
 * O que a COZINHA vê: da fila (aceito pela gestão) até ficar pronto.
 * `pendente` (aguardando aceite) e `saiu_para_entrega` são assunto da gestão.
 */
export const STATUS_COZINHA: StatusPedido[] = ['aceito', 'em_preparo', 'pronto'];
