// src/types/carrinho.ts
//
// Os tipos do carrinho moraram aqui; agora vivem em @pizzaorder/shared
// (a cozinha também renderiza os jsonb `sabores`/`adicionais` de itens_pedido).
// Este arquivo só reexporta para manter os imports `@/types/carrinho` existentes.

export type {
  CartItem,
  CartItemAdicional,
  CartItemSabor,
  CartItemTipo,
} from '@pizzaorder/shared';
