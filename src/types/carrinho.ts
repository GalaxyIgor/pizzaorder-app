// src/types/carrinho.ts
//
// Tipos do carrinho (estado client-side). Um CartItem é uma "linha" da sacola:
// um produto simples ou um meia-meia. É serializável (localStorage / envio futuro
// para a API de pedidos), então guarda apenas dados primitivos + referências por id.

export type CartItemTipo = 'produto' | 'meia-meia';

export interface CartItemSabor {
  produtoId: string;
  nome: string;
  descricao?: string | null;
}

export interface CartItemAdicional {
  grupoId: string;
  opcaoId: string;
  nome: string;
  preco: number;
}

export interface CartItem {
  /** Assinatura estável da linha — itens idênticos somam quantidade em vez de duplicar. */
  id: string;
  tipo: CartItemTipo;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  precoUnit: number;
  quantidade: number;

  // Referências para reconstruir o pedido depois (opcionais conforme o tipo)
  produtoId?: string;
  variacaoId?: string;
  tamanho?: string | null;
  sabores?: CartItemSabor[]; // preenchido quando tipo === 'meia-meia'
  adicionais?: CartItemAdicional[]; // borda/adicionais escolhidos na personalização
}
