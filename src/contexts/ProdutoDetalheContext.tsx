'use client';

// src/contexts/ProdutoDetalheContext.tsx
//
// Orquestra o passo de personalização: expõe `adicionar(produto)` que decide entre
// abrir o ProdutoDetalheModal (quando há tamanho/adicionais a escolher) ou adicionar
// direto ao carrinho.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Produto } from '@/types/cardapio';
import { gruposPorCategoria, precisaPersonalizar } from '@/lib/cardapio';
import { useCardapio } from '@/contexts/CardapioContext';
import { useCart } from '@/contexts/CartContext';
import { ProdutoDetalheModal } from '@/components/cardapio/modals/ProdutoDetalheModal';

interface ProdutoDetalheContextValue {
  /** Adiciona ao carrinho — abre o modal de personalização se o produto exigir. */
  adicionar: (produto: Produto) => void;
  /** Força abrir o modal de personalização. */
  abrir: (produto: Produto) => void;
  fechar: () => void;
}

const ProdutoDetalheContext = createContext<ProdutoDetalheContextValue | null>(null);

export function ProdutoDetalheProvider({ children }: { children: ReactNode }) {
  const { addProduto } = useCart();
  const { gruposAdicionais } = useCardapio();
  const [produto, setProduto] = useState<Produto | null>(null);

  const abrir = useCallback((p: Produto) => setProduto(p), []);
  const fechar = useCallback(() => setProduto(null), []);

  const adicionar = useCallback(
    (p: Produto) => {
      if (precisaPersonalizar(p, gruposAdicionais)) setProduto(p);
      else addProduto(p);
    },
    [addProduto, gruposAdicionais]
  );

  const value = useMemo(() => ({ adicionar, abrir, fechar }), [adicionar, abrir, fechar]);

  return (
    <ProdutoDetalheContext.Provider value={value}>
      {children}
      {produto && (
        <ProdutoDetalheModal
          key={produto.id}
          produto={produto}
          grupos={gruposPorCategoria(gruposAdicionais, produto.categoria_id)}
          onClose={fechar}
        />
      )}
    </ProdutoDetalheContext.Provider>
  );
}

export function useProdutoDetalhe(): ProdutoDetalheContextValue {
  const ctx = useContext(ProdutoDetalheContext);
  if (!ctx) throw new Error('useProdutoDetalhe deve ser usado dentro de <ProdutoDetalheProvider>.');
  return ctx;
}
