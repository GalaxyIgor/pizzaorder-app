'use client';

// src/components/NavGestao.tsx
//
// Abas de navegação entre os módulos da gestão (client — usa usePathname
// para marcar a aba ativa).

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ABAS = [
  { rota: 'pedidos', rotulo: 'Pedidos' },
  { rota: 'dashboard', rotulo: 'Dashboard' },
  { rota: 'personalizacao', rotulo: 'Personalização' },
  { rota: 'cardapio', rotulo: 'Cardápio' },
] as const;

export function NavGestao({ slug }: { slug: string }) {
  const pathname = usePathname();

  return (
    <nav className="px-4 flex gap-1 overflow-x-auto" aria-label="Módulos da gestão">
      {ABAS.map(({ rota, rotulo }) => {
        const href = `/${slug}/${rota}`;
        const ativa = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={rota}
            href={href}
            className={`px-3 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
              ativa
                ? 'border-pomodoro text-pomodoro'
                : 'border-transparent text-creme-muted hover:text-carbono'
            }`}
          >
            {rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
