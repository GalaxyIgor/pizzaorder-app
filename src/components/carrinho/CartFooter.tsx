'use client';

// src/components/carrinho/CartFooter.tsx
//
// Barra fixa inferior: aparece só quando há itens e abre a sacola (CartDrawer).

import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { formatarPreco } from '@/lib/cardapio';
import { CartDrawer } from '@/components/carrinho/CartDrawer';

export function CartFooter() {
  const { totalItems, totalPrice } = useCart();
  const [aberto, setAberto] = useState(false);

  return (
    <>
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-massa-bg via-massa-bg/90 to-transparent p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex justify-center z-40">
          <button
            type="button"
            onClick={() => setAberto(true)}
            className="bg-pomodoro hover:bg-pomodoro-hover text-white w-full sm:max-w-lg p-4 rounded-lg font-semibold text-sm flex justify-between items-center shadow-lg transition-all active:scale-[0.99] cursor-pointer"
          >
            <span>Ver sacola ({totalItems} {totalItems === 1 ? 'item' : 'itens'})</span>
            <span>{formatarPreco(totalPrice)}</span>
          </button>
        </div>
      )}

      <CartDrawer isOpen={aberto} onClose={() => setAberto(false)} />
    </>
  );
}
