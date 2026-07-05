'use client';

// src/components/cardapio/SubNavCardapio.tsx
//
// Pílulas de navegação dentro do módulo Cardápio.

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ABAS = [
  { sufixo: '', rotulo: 'Itens' },
  { sufixo: '/adicionais', rotulo: 'Adicionais' },
  { sufixo: '/combos', rotulo: 'Combos meia-meia' },
  { sufixo: '/destaques', rotulo: 'Destaques' },
] as const;

export function SubNavCardapio({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/${slug}/cardapio`;

  return (
    <div className="flex gap-2 overflow-x-auto">
      {ABAS.map(({ sufixo, rotulo }) => {
        const href = `${base}${sufixo}`;
        const ativa = sufixo === '' ? pathname === base || pathname.startsWith(`${base}/produtos`) : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap border-2 transition-colors ${
              ativa
                ? 'border-pomodoro bg-pomodoro text-white'
                : 'border-borda-suave text-carbono hover:border-pomodoro hover:text-pomodoro'
            }`}
          >
            {rotulo}
          </Link>
        );
      })}
    </div>
  );
}
