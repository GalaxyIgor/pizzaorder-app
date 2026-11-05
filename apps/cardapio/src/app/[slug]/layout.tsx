// src/app/[slug]/layout.tsx
//
// Layout do tenant: envolve TODAS as rotas do slug (cardápio, checkout, conta,
// entrar/cadastro) com os providers de cardápio e carrinho.
//
// O cardápio é buscado aqui, no servidor: o HTML já sai com header, avisos e
// categorias (antes era fetch no browser após a hidratação → tela "Carregando").

import type { ReactNode } from 'react';
import { buscarCardapio } from '@/lib/cardapio-server';
import { TenantProviders } from './providers';

export default async function SlugLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resultado = await buscarCardapio(slug);

  if (!resultado.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center">
        <p className="text-creme-muted">Cardápio não encontrado.</p>
      </div>
    );
  }

  return (
    <TenantProviders slug={slug} dados={resultado.dados}>
      {children}
    </TenantProviders>
  );
}
