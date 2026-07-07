import type { Produto } from '@/types/cardapio';

export type ProductListModalCategory = 'pizzas' | 'meia-meia' | 'bebidas' | 'sobremesas' | 'combos';

export interface SelectedFlavors {
  lado1: Produto | null;
  lado2: Produto | null;
}

export interface ProductListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  category: ProductListModalCategory;
  products: Produto[];
  /** usado só quando category === 'combos' */
  combos?: ComboMeiaMeia[];
}

// Combinação pré-montada de 2 produtos exibida na vitrine (não existe como Produto na API/DB).
// Usada tanto para sugestões de meia-meia (2 sabores, preço calculado) quanto para
// combos de produtos (ex.: pizza + bebida, preço fixo) — o shape é o mesmo nos dois casos.
export interface ComboMeiaMeia {
  id: string;
  nome: string;
  descricao: string;
  produto1: Produto;
  produto2: Produto;
  imagem_url: string | null;
  preco: number;
}
