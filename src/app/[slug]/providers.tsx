'use client';

// src/app/[slug]/providers.tsx
//
// Árvore de providers do tenant (cardápio + carrinho + detalhe de produto).
// Fica no layout do [slug] porque checkout e conta também precisam do carrinho
// e das configs da pizzaria — não só a página do cardápio.

import type { ReactNode } from 'react';
import { CardapioProvider, useCardapio } from '@/contexts/CardapioContext';
import { CartProvider } from '@/contexts/CartContext';
import { ProdutoDetalheProvider } from '@/contexts/ProdutoDetalheContext';

export function TenantProviders({ slug, children }: { slug: string; children: ReactNode }) {
  return (
    <CardapioProvider slug={slug}>
      <CartComConfig slug={slug}>{children}</CartComConfig>
    </CardapioProvider>
  );
}

// Separado porque o CartProvider depende da config da pizzaria, que só existe
// depois que o CardapioProvider carregou.
function CartComConfig({ slug, children }: { slug: string; children: ReactNode }) {
  const { pizzaria } = useCardapio();

  return (
    <CartProvider slug={slug} configMeiaMeia={pizzaria.config_meia_meia}>
      <ProdutoDetalheProvider>{children}</ProdutoDetalheProvider>
    </CartProvider>
  );
}
