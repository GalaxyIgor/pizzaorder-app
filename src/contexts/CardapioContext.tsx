'use client';

// src/contexts/CardapioContext.tsx
//
// Busca o cardápio real (GET /api/cardapio/[slug]) uma vez e disponibiliza
// pizzaria/categorias/produtos/destaques/gruposAdicionais/combos pra árvore inteira.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { CardapioResponse } from '@/types/cardapio';

interface CardapioContextValue extends CardapioResponse {
  loading: boolean;
  error: string | null;
}

const CardapioContext = createContext<CardapioContextValue | null>(null);

export function CardapioProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [dados, setDados] = useState<CardapioResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    fetch(`/api/cardapio/${slug}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Erro ao carregar o cardápio');
        return json as CardapioResponse;
      })
      .then((json) => {
        if (!cancelado) setDados(json);
      })
      .catch((err: Error) => {
        if (!cancelado) setError(err.message);
      });

    return () => {
      cancelado = true;
    };
  }, [slug]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center">
        <p className="text-creme-muted">Cardápio não encontrado.</p>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center">
        <p className="text-creme-muted">Carregando cardápio...</p>
      </div>
    );
  }

  return (
    <CardapioContext.Provider value={{ ...dados, loading: false, error: null }}>
      {children}
    </CardapioContext.Provider>
  );
}

export function useCardapio(): CardapioContextValue {
  const ctx = useContext(CardapioContext);
  if (!ctx) throw new Error('useCardapio deve ser usado dentro de <CardapioProvider>.');
  return ctx;
}
