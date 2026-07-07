'use client';

// src/components/layout/AvisoLoja.tsx
//
// Aviso temporário definido na personalização da gestão (promoção, feriado).
// Diferente do AvisoPausado: é comunicação, não bloqueio de pedidos.

import { useCardapio } from '@/contexts/CardapioContext';

export function AvisoLoja() {
  const { pizzaria } = useCardapio();

  if (!pizzaria.aviso_ativo || !pizzaria.aviso) return null;

  return (
    <p
      role="status"
      className="mt-4 text-sm text-carbono bg-ouro/15 border border-ouro/40 rounded-xl p-3"
    >
      <span className="font-semibold">Aviso:</span> {pizzaria.aviso}
    </p>
  );
}
