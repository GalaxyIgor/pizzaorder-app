'use client';

// src/components/conta/PedidoConfirmado.tsx
//
// Renderizado na página do pedido quando chega com ?novo=1 (vindo do checkout):
// mostra o banner de sucesso e SÓ ENTÃO limpa o carrinho (regra do plano:
// clear() apenas depois do pedido confirmado, nunca antes).

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';

export function PedidoConfirmado({ ativo }: { ativo: boolean }) {
  const { clear } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  // Congela o valor inicial: o router.replace abaixo tira o ?novo=1 da URL
  // (prop vira false), mas o banner deve continuar visível nesta visita.
  const [mostrar] = useState(ativo);

  useEffect(() => {
    if (!mostrar) return;
    clear();
    // tira o ?novo=1 da URL para não re-limpar em refresh/compartilhamento
    router.replace(pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrar]);

  if (!mostrar) return null;

  return (
    <div className="bg-manjericao/10 border border-manjericao/25 text-manjericao rounded-xl p-4 mb-4 flex items-center gap-3">
      <span className="text-2xl" aria-hidden="true">✅</span>
      <div>
        <p className="font-semibold text-sm">Pedido enviado para a pizzaria!</p>
        <p className="text-xs">Acompanhe o status por aqui.</p>
      </div>
    </div>
  );
}
