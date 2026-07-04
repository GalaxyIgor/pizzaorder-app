'use client';

// src/components/conta/LimparCarrinho.tsx
//
// Sem UI: na página de confirmação (?novo=1, vindo do checkout) limpa o
// carrinho e tira o parâmetro da URL — regra do plano: clear() só depois do
// pedido confirmado, nunca antes. Refresh/compartilhamento não re-limpa.

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';

export function LimparCarrinho({ ativo }: { ativo: boolean }) {
  const { clear } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  // Congela o valor inicial: o router.replace abaixo tira o ?novo=1 da URL
  // (prop vira false), mas a limpeza desta visita já aconteceu.
  const [executar] = useState(ativo);

  useEffect(() => {
    if (!executar) return;
    clear();
    router.replace(pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executar]);

  return null;
}
