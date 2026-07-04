// packages/shared/src/pedido.ts
//
// Tipos do fluxo de pedido, espelhando as tabelas `pedidos` e `itens_pedido`
// de supabase/checkout.sql. Fonte única do vocabulário de status — usada pelo
// cardápio (cliente) e pela cozinha.

import type { CartItem, CartItemAdicional, CartItemSabor } from './carrinho';

export type Modalidade = 'entrega' | 'retirada' | 'local';

// Vocabulário com aceite explícito (decidido em 2026-07-04, supabase/cozinha.sql):
//   pendente -> em_preparo (cozinha aceita, com previsão) -> pronto
//     -> saiu_para_entrega (só entrega) -> concluido
//   cancelado: recusa da cozinha ou cancelamento, antes de concluido.
export type StatusPedido =
  | 'pendente'
  | 'em_preparo'
  | 'pronto'
  | 'saiu_para_entrega'
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
// LINHAS lidas do banco (páginas "meus pedidos" / painel da cozinha)
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
  /** Previsão de ficar pronto (gravada quando a cozinha aceita). */
  previsao_pronto_em: string | null;
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
  pendente: 'Aguardando confirmação',
  em_preparo: 'Em preparo',
  pronto: 'Pronto',
  saiu_para_entrega: 'Saiu para entrega',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

/**
 * Máquina de estados do pedido — única fonte das transições permitidas
 * (a server action da cozinha valida contra ela).
 * `saiu_para_entrega` só vale para modalidade `entrega` (validação extra na action).
 */
export const TRANSICOES_STATUS: Record<StatusPedido, StatusPedido[]> = {
  pendente: ['em_preparo', 'cancelado'],
  em_preparo: ['pronto', 'cancelado'],
  pronto: ['saiu_para_entrega', 'concluido', 'cancelado'],
  saiu_para_entrega: ['concluido', 'cancelado'],
  concluido: [],
  cancelado: [],
};

export const METODO_PAGAMENTO_LABEL: Record<MetodoPagamentoLocal, string> = {
  dinheiro: 'Dinheiro',
  cartao: 'Cartão (maquininha)',
  pix: 'Pix',
};
