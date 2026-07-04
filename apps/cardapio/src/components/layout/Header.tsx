// src/components/cardapio/Header.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCardapio } from '@/contexts/CardapioContext';

export function Header() {
  const { pizzaria } = useCardapio();

  return (
    <header className="py-6 border-b border-borda-suave flex items-center gap-3">
      {pizzaria.logo_url && (
        <div className="relative w-12 h-12 flex-shrink-0 rounded-full overflow-hidden">
          <Image src={pizzaria.logo_url} alt={pizzaria.nome} fill sizes="48px" className="object-cover" />
        </div>
      )}
      <div className="flex-1">
        <h1
          className="font-display text-2xl sm:text-3xl font-bold"
          style={{ color: pizzaria.cor_primaria }}
        >
          {pizzaria.nome}
        </h1>
        <p className="text-sm text-creme-muted mt-1">
          <span className="text-manjericao font-bold mr-1">●</span> Aberto agora
        </p>
      </div>
      <Link
        href={`/${pizzaria.slug}/conta/pedidos`}
        className="text-xs font-semibold text-creme-muted hover:text-carbono border border-borda-suave rounded-full px-3 py-2 transition-colors flex-shrink-0"
      >
        🧾 Meus pedidos
      </Link>
    </header>
  );
}