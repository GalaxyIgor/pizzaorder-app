import type { Pizza, ProdutoCardapio } from '@/src/types/types';

export type ProductListModalCategory = 'pizzas' | 'meia-meia' | 'bebidas';

export interface SelectedFlavors {
  lado1: Pizza | null;
  lado2: Pizza | null;
}

export interface ProductListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  category: ProductListModalCategory;
  products: ProdutoCardapio[];
}
