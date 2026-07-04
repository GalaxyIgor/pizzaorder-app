// src/types/pedido.ts
//
// Os tipos do fluxo de pedido moraram aqui; agora vivem em @pizzaorder/shared
// (fonte única entre cardápio e cozinha). Este arquivo só reexporta para manter
// os imports `@/types/pedido` existentes.

export type {
  Modalidade,
  StatusPedido,
  FormaPagamento,
  MetodoPagamentoLocal,
  StatusPagamento,
  EnderecoEntrega,
  EnderecoSalvo,
  CriarPedidoInput,
  PedidoResumo,
  PedidoDetalhe,
  ItemPedidoRow,
} from '@pizzaorder/shared';

export {
  MODALIDADE_LABEL,
  STATUS_LABEL,
  METODO_PAGAMENTO_LABEL,
} from '@pizzaorder/shared';
