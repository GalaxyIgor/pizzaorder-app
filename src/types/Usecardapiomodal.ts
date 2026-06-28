// src/hooks/useCardapioModal.ts

import { useState } from 'react';
import type { ProdutoCardapio } from '@/src/types/types';
import {
  PIZZAS_TRADICIONAIS,
  PIZZAS_ESPECIAIS,
  MEIA_MEIA,
  BEBIDAS,
} from '@/src/mocks/cardapio';

// ============================================================
// TIPOS
// ============================================================

export type CategoriaModal = 'pizzas' | 'meia-meia' | 'bebidas';

export interface EstadoModal {
  aberto: boolean;
  categoria: CategoriaModal | null;
  titulo: string;
  produtos: ProdutoCardapio[];
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

const CATEGORIAS_MODAL: Record<string, Omit<EstadoModal, 'aberto'>> = {
  'pizzas-completas': {
    categoria: 'pizzas',
    titulo: 'Pizzas Completas',
    produtos: [...PIZZAS_TRADICIONAIS, ...PIZZAS_ESPECIAIS],
  },
  'meia-meia': {
    categoria: 'meia-meia',
    titulo: 'Pizzas Meia Meia',
    produtos: MEIA_MEIA,
  },
  'bebidas': {
    categoria: 'bebidas',
    titulo: 'Bebidas',
    produtos: BEBIDAS,
  },
};

// ============================================================
// HOOK
// ============================================================

export function useCardapioModal() {
  const [modal, setModal] = useState<EstadoModal>(MODAL_FECHADO);

  const abrirModal = (chave: string) => {
    const config = CATEGORIAS_MODAL[chave];
    if (!config) return;
    setModal({ aberto: true, ...config });
  };

  const fecharModal = () => setModal(MODAL_FECHADO);

  return { modal, abrirModal, fecharModal };
}