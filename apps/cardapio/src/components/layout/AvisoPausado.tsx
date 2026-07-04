'use client';

// src/components/layout/AvisoPausado.tsx
//
// Banner exibido no cardápio quando a cozinha pausou novos pedidos
// (pizzarias.pedidos_pausados — a cozinha liga/desliga pelo app dela).
// O bloqueio de verdade é server-side, em criarPedido.

import { useCardapio } from '@/contexts/CardapioContext';

export function AvisoPausado() {
  const { pizzaria } = useCardapio();
  if (!pizzaria.pedidos_pausados) return null;

  return (
    <div
      role="status"
      className="mt-4 bg-ouro/15 border border-ouro/40 rounded-lg p-3 flex items-start gap-2.5 text-sm text-carbono"
    >
      <span aria-hidden="true">⏸️</span>
      <p>
        <span className="font-semibold">{pizzaria.nome} está sem aceitar pedidos no momento.</span>{' '}
        Você pode ver o cardápio normalmente e tentar de novo mais tarde.
      </p>
    </div>
  );
}
