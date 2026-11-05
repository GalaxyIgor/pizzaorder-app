'use client';

// src/contexts/CardapioContext.tsx
//
// Disponibiliza pizzaria/categorias/produtos/destaques/gruposAdicionais/combos
// pra árvore inteira. Os dados chegam prontos do layout do [slug], buscados no
// servidor (lib/cardapio-server.ts) — nada de fetch no browser.

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { CardapioResponse } from '@/types/cardapio';

interface CardapioContextValue extends CardapioResponse {
  loading: boolean;
  error: string | null;
}

const CardapioContext = createContext<CardapioContextValue | null>(null);

export function CardapioProvider({
  dados,
  children,
}: {
  dados: CardapioResponse;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ ...dados, loading: false, error: null }), [dados]);

  return <CardapioContext.Provider value={value}>{children}</CardapioContext.Provider>;
}

export function useCardapio(): CardapioContextValue {
  const ctx = useContext(CardapioContext);
  if (!ctx) throw new Error('useCardapio deve ser usado dentro de <CardapioProvider>.');
  return ctx;
}
