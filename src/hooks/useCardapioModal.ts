// src/hooks/useCardapioModal.ts

import { useState } from 'react';
import type { Produto } from '@/types/cardapio';
import {
  PIZZAS_TRADICIONAIS,
  PIZZAS_ESPECIAIS,
  TODAS_AS_PIZZAS,
  BEBIDAS,
} from '@/mocks/cardapio';

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

const CATEGORIAS_MODAL: Record<string, Omit<EstadoModal, 'aberto'>> = {
  'pizzas-completas': {
    categoria: 'pizzas',
    titulo: 'Pizzas Completas',
    produtos: [...PIZZAS_TRADICIONAIS, ...PIZZAS_ESPECIAIS],
  },
  'meia-meia': {
    categoria: 'meia-meia',
    titulo: 'Escolha os 2 sabores',
    produtos: TODAS_AS_PIZZAS,
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