// src/hooks/useCardapioModal.ts

import { useState } from 'react';
import type { Produto } from '@/types/cardapio';
import type { ComboMeiaMeia } from '@/types/product-list-modal';
import { useCardapio } from '@/contexts/CardapioContext';
import { produtosPorTipo } from '@/lib/cardapio';

// ============================================================
// TIPOS
// ============================================================

export type CategoriaModal = 'pizzas' | 'meia-meia' | 'bebidas' | 'sobremesas' | 'combos';

export interface EstadoModal {
  aberto: boolean;
  categoria: CategoriaModal | null;
  titulo: string;
  produtos: Produto[];
  combos: ComboMeiaMeia[];
}

// ============================================================
// CONSTANTES
// ============================================================

const MODAL_FECHADO: EstadoModal = {
  aberto: false,
  categoria: null,
  titulo: '',
  produtos: [],
  combos: [],
};

// ============================================================
// HOOK
// ============================================================

export function useCardapioModal() {
  const { produtos, categorias, comboProdutos } = useCardapio();
  const [modal, setModal] = useState<EstadoModal>(MODAL_FECHADO);

  const todasAsPizzas = produtosPorTipo(produtos, categorias, 'pizza');

  const combosResolvidos: ComboMeiaMeia[] = comboProdutos
    .map((c) => {
      const produto1 = produtos.find((p) => p.id === c.produto1_id);
      const produto2 = produtos.find((p) => p.id === c.produto2_id);
      if (!produto1 || !produto2) return null;
      return {
        id: c.id,
        nome: c.nome,
        descricao: c.descricao ?? '',
        produto1,
        produto2,
        imagem_url: c.imagem_url,
        preco: c.preco,
      };
    })
    .filter((c): c is ComboMeiaMeia => c !== null);

  const categoriasModal: Record<string, Omit<EstadoModal, 'aberto'>> = {
    'pizzas-completas': {
      categoria: 'pizzas',
      titulo: 'Pizzas Completas',
      produtos: todasAsPizzas,
      combos: [],
    },
    'meia-meia': {
      categoria: 'meia-meia',
      titulo: 'Escolha os 2 sabores',
      produtos: todasAsPizzas,
      combos: [],
    },
    'bebidas': {
      categoria: 'bebidas',
      titulo: 'Bebidas',
      produtos: produtosPorTipo(produtos, categorias, 'bebida'),
      combos: [],
    },
    'sobremesas': {
      categoria: 'sobremesas',
      titulo: 'Sobremesas',
      produtos: produtosPorTipo(produtos, categorias, 'sobremesa'),
      combos: [],
    },
    'combos': {
      categoria: 'combos',
      titulo: 'Combos',
      produtos: [],
      combos: combosResolvidos,
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
