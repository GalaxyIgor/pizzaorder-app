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
      <ProdutoDetalheProvider>
        {/* A cor primária do tenant sobrescreve o vermelho padrão do tema:
            no Tailwind v4 as cores são CSS vars (--color-pomodoro no @theme),
            então botões, pills e destaques herdam a cor da pizzaria. */}
        <div
          style={
            {
              '--color-pomodoro': pizzaria.cor_primaria,
              '--color-pomodoro-hover': escurecer(pizzaria.cor_primaria),
            } as React.CSSProperties
          }
        >
          {children}
        </div>
      </ProdutoDetalheProvider>
    </CartProvider>
  );
}

/** Tom ~20% mais escuro para o hover, derivado da cor primária (#RRGGBB). */
function escurecer(hex: string): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return hex;
  const canal = (i: number) =>
    Math.round(parseInt(m[1].slice(i, i + 2), 16) * 0.8)
      .toString(16)
      .padStart(2, '0');
  return `#${canal(0)}${canal(2)}${canal(4)}`;
}
