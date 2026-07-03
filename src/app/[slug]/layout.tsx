// src/app/[slug]/layout.tsx
//
// Layout do tenant: envolve TODAS as rotas do slug (cardápio, checkout, conta,
// entrar/cadastro) com os providers de cardápio e carrinho.

import type { ReactNode } from 'react';
import { TenantProviders } from './providers';

export default async function SlugLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <TenantProviders slug={slug}>{children}</TenantProviders>;
}
