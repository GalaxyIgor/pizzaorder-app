'use client';

// src/components/carrinho/CartFooter.tsx
//
// Barra fixa inferior: aparece só quando há itens e abre a sacola (CartDrawer).

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { formatarPreco } from '@/lib/cardapio';

// Só montada quando aberta: o chunk da sacola fica fora do JS inicial.
const CartDrawer = dynamic(() =>
  import('@/components/carrinho/CartDrawer').then((m) => m.CartDrawer)
);

export function CartFooter() {
  const { totalItems, totalPrice } = useCart();
  const [aberto, setAberto] = useState(false);

  // A sacola sempre abre (dá para revisar mesmo com a loja fechada); o bloqueio
  // de finalizar, com o motivo, fica dentro dela.
  return (
    <>
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-linear-to-t from-massa-bg via-massa-bg/90 to-transparent p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex justify-center z-40">
          <button
            type="button"
            onClick={() => setAberto(true)}
            aria-haspopup="dialog"
            className="w-full sm:max-w-lg p-4 rounded-lg font-semibold text-sm flex justify-between items-center shadow-lg transition active:scale-[0.99] bg-pomodoro hover:bg-pomodoro-hover text-white cursor-pointer"
          >
            <span aria-live="polite">
              Ver sacola ({totalItems} {totalItems === 1 ? 'item' : 'itens'})
            </span>
            <span className="tabular-nums">{formatarPreco(totalPrice)}</span>
          </button>
        </div>
      )}

      {aberto && <CartDrawer isOpen onClose={() => setAberto(false)} />}
    </>
  );
}
