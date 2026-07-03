// src/hooks/useCardapioModal.ts

import { useState } from 'react';
import type { Produto } from '@/types/cardapio';
import { useCardapio } from '@/contexts/CardapioContext';
import { produtosPorTipo } from '@/lib/cardapio';

// ============================================================
// TIPOS
// ============================================================

export type CategoriaModal = 'pizzas' | 'meia-meia' | 'bebidas';

export interface EstadoModal {
  aberto: boolean;
  categoria: CategoriaModal | null;
  titulo: string;
  produtos: Produto[];
}

// ============================================================
// CONSTANTES
// ============================================================

const MODAL_FECHADO: EstadoModal = {
  aberto: false,
  categoria: null,
  titulo: '',
  produtos: [],
};

// ============================================================
// HOOK
// ============================================================

export function useCardapioModal() {
  const { produtos, categorias } = useCardapio();
  const [modal, setModal] = useState<EstadoModal>(MODAL_FECHADO);

  const todasAsPizzas = produtosPorTipo(produtos, categorias, 'pizza');

  const categoriasModal: Record<string, Omit<EstadoModal, 'aberto'>> = {
    'pizzas-completas': {
      categoria: 'pizzas',
      titulo: 'Pizzas Completas',
      produtos: todasAsPizzas,
    },
    'meia-meia': {
      categoria: 'meia-meia',
      titulo: 'Escolha os 2 sabores',
      produtos: todasAsPizzas,
    },
    'bebidas': {
      categoria: 'bebidas',
      titulo: 'Bebidas',
      produtos: produtosPorTipo(produtos, categorias, 'bebida'),
    },
  };

  const abrirModal = (chave: string) => {
    const config = categoriasModal[chave];
    if (!config) return;
    setModal({ aberto: true, ...config });
  };

  const fecharModal = () => setModal(MODAL_FECHADO);

  return { modal, abrirModal, fecharModal };
}
