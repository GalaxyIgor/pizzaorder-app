// src/types/pedido.ts
//
// Tipos do fluxo de pedido (checkout + minha conta), espelhando as tabelas
// `pedidos` e `itens_pedido` de supabase/checkout.sql.

import type { CartItem, CartItemAdicional, CartItemSabor } from '@/types/carrinho';

export type Modalidade = 'entrega' | 'retirada' | 'local';

// ATENÇÃO: vocabulário precisa ser validado com o app da cozinha (ver plano).
export type StatusPedido =
  | 'recebido'
  | 'em_preparo'
  | 'pronto'
  | 'saiu_para_entrega'
  | 'entregue'
  | 'concluido'
  | 'cancelado';

export type FormaPagamento = 'online' | 'na_entrega';
export type MetodoPagamentoLocal = 'dinheiro' | 'cartao' | 'pix';
export type StatusPagamento = 'pendente' | 'pago' | 'falhou' | 'estornado';

export interface EnderecoEntrega {
  rua: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade?: string | null;
  cep?: string | null;
  referencia?: string | null;
}

export interface EnderecoSalvo extends EnderecoEntrega {
  id: string;
  apelido: string | null;
}

// ============================================================
// INPUT da Server Action criarPedido (valores são RECALCULADOS server-side)
// ============================================================

export interface CriarPedidoInput {
  slug: string;
  modalidade: Modalidade;
  endereco: EnderecoEntrega | null; // obrigatório quando modalidade = entrega
  salvarEndereco?: boolean;
  nome: string;
  telefone: string;
  observacao?: string;
  formaPagamento: FormaPagamento;
  metodoPagamentoLocal?: MetodoPagamentoLocal;
  itens: CartItem[];
}

// ============================================================
// LINHAS lidas do banco (páginas "meus pedidos")
// ============================================================

export interface PedidoResumo {
  id: string;
  numero: number;
  status: StatusPedido;
  modalidade: Modalidade;
  total: number;
  criado_em: string;
}

export interface PedidoDetalhe extends PedidoResumo {
  nome_cliente: string;
  telefone_cliente: string;
  endereco_entrega: EnderecoEntrega | null;
  observacao: string | null;
  subtotal: number;
  taxa_entrega: number;
  taxa_servico: number;
  forma_pagamento: FormaPagamento;
  metodo_pagamento_local: MetodoPagamentoLocal | null;
  status_pagamento: StatusPagamento;
}

export interface ItemPedidoRow {
  id: string;
  tipo: 'produto' | 'meia-meia';
  nome: string;
  descricao: string | null;
  tamanho: string | null;
  preco_unit: number;
  quantidade: number;
  sabores: CartItemSabor[] | null;
  adicionais: CartItemAdicional[] | null;
}

// ============================================================
// LABELS de exibição
// ============================================================

export const MODALIDADE_LABEL: Record<Modalidade, string> = {
  entrega: 'Entrega',
  retirada: 'Retirar no balcão',
  local: 'Comer no local',
};

export const STATUS_LABEL: Record<StatusPedido, string> = {
  recebido: 'Recebido',
  em_preparo: 'Em preparo',
  pronto: 'Pronto',
  saiu_para_entrega: 'Saiu para entrega',
  entregue: 'Entregue',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export const METODO_PAGAMENTO_LABEL: Record<MetodoPagamentoLocal, string> = {
  dinheiro: 'Dinheiro',
  cartao: 'Cartão (maquininha)',
  pix: 'Pix',
};
