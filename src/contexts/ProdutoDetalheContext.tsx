'use client';

// src/contexts/ProdutoDetalheContext.tsx
//
// Orquestra o passo de personalização: expõe `adicionar(produto)` e
// `adicionarMeiaMeia(p1, p2)`, que decidem entre abrir o modal de detalhe
// (quando há tamanho/adicionais a escolher) ou adicionar direto ao carrinho.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { GrupoAdicional, Produto } from '@/types/cardapio';
import { gruposPorCategoria, precisaPersonalizar, tamanhosComunsMeiaMeia } from '@/lib/cardapio';
import { useCardapio } from '@/contexts/CardapioContext';
import { useCart } from '@/contexts/CartContext';
import { ProdutoDetalheModal } from '@/components/cardapio/modals/ProdutoDetalheModal';
import { MeiaMeiaDetalheModal } from '@/components/cardapio/modals/MeiaMeiaDetalheModal';

type DetalheItem =
  | { tipo: 'produto'; produto: Produto }
  | { tipo: 'meia-meia'; produto1: Produto; produto2: Produto };

interface ProdutoDetalheContextValue {
  /** Adiciona ao carrinho — abre o modal de personalização se o produto exigir. */
  adicionar: (produto: Produto) => void;
  /** Adiciona um meia-meia — abre o modal de personalização se houver tamanhos/adicionais a escolher. */
  adicionarMeiaMeia: (produto1: Produto, produto2: Produto) => void;
  /** Força abrir o modal de personalização. */
  abrir: (produto: Produto) => void;
  fechar: () => void;
}

const ProdutoDetalheContext = createContext<ProdutoDetalheContextValue | null>(null);

// Grupos de adicionais aplicáveis a um meia-meia: união dos grupos das
// categorias das duas metades (sem duplicar quando é a mesma categoria).
function gruposMeiaMeia(grupos: GrupoAdicional[], p1: Produto, p2: Produto): GrupoAdicional[] {
  const unicos = new Map(
    [
      ...gruposPorCategoria(grupos, p1.categoria_id),
      ...gruposPorCategoria(grupos, p2.categoria_id),
    ].map((g) => [g.id, g])
  );
  return [...unicos.values()].sort((a, b) => a.ordem - b.ordem);
}

export function ProdutoDetalheProvider({ children }: { children: ReactNode }) {
  const { addProduto, addMeiaMeia } = useCart();
  const { gruposAdicionais } = useCardapio();
  const [item, setItem] = useState<DetalheItem | null>(null);

  const abrir = useCallback((p: Produto) => setItem({ tipo: 'produto', produto: p }), []);
  const fechar = useCallback(() => setItem(null), []);

  const adicionar = useCallback(
    (p: Produto) => {
      if (precisaPersonalizar(p, gruposAdicionais)) setItem({ tipo: 'produto', produto: p });
      else addProduto(p);
    },
    [addProduto, gruposAdicionais]
  );

  const adicionarMeiaMeia = useCallback(
    (p1: Produto, p2: Produto) => {
      const temGrupos = gruposMeiaMeia(gruposAdicionais, p1, p2).length > 0;
      const temTamanhos = tamanhosComunsMeiaMeia(p1, p2).length > 1;
      if (temGrupos || temTamanhos) setItem({ tipo: 'meia-meia', produto1: p1, produto2: p2 });
      else addMeiaMeia(p1, p2);
    },
    [addMeiaMeia, gruposAdicionais]
  );

  const value = useMemo(
    () => ({ adicionar, adicionarMeiaMeia, abrir, fechar }),
    [adicionar, adicionarMeiaMeia, abrir, fechar]
  );

  return (
    <ProdutoDetalheContext.Provider value={value}>
      {children}
      {item?.tipo === 'produto' && (
        <ProdutoDetalheModal
          key={item.produto.id}
          produto={item.produto}
          grupos={gruposPorCategoria(gruposAdicionais, item.produto.categoria_id)}
          onClose={fechar}
        />
      )}
      {item?.tipo === 'meia-meia' && (
        <MeiaMeiaDetalheModal
          key={`mm-${item.produto1.id}-${item.produto2.id}`}
          produto1={item.produto1}
          produto2={item.produto2}
          grupos={gruposMeiaMeia(gruposAdicionais, item.produto1, item.produto2)}
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
