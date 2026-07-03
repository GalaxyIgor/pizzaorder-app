import type { Produto } from '@/types/cardapio';

export type ProductListModalCategory = 'pizzas' | 'meia-meia' | 'bebidas';

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
}

// Combinação pré-montada de meia-meia exibida na vitrine (não existe como Produto na API/DB)
export interface ComboMeiaMeia {
  id: string;
  nome: string;
  descricao: string;
  produto1: Produto;
  produto2: Produto;
  imagem_url: string | null;
  preco: number;
}
