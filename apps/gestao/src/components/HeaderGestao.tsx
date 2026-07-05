// src/components/HeaderGestao.tsx
//
// Cabeçalho do painel de gestão (server component — o botão sair usa Server
// Action) + navegação entre os módulos.

import { signOut } from '@/lib/actions/auth';
import type { PizzariaGestao } from '@/lib/staff';
import { PausarLojaToggle } from '@/components/PausarLojaToggle';
import { NavGestao } from '@/components/NavGestao';

export function HeaderGestao({ pizzaria }: { pizzaria: PizzariaGestao }) {
  return (
    <header className="bg-white border-b border-borda-suave sticky top-0 z-40">
      <div className="px-4 py-3 flex items-center gap-3">
        <span className="text-2xl" aria-hidden="true">
          📊
        </span>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-lg font-bold text-carbono leading-tight truncate">
            {pizzaria.nome}
          </h1>
          <p className="text-xs text-creme-muted">Gestão</p>
        </div>

        <PausarLojaToggle slug={pizzaria.slug} pausado={pizzaria.pedidos_pausados} />
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-creme-muted hover:text-carbono px-2 py-2 transition-colors"
          >
            Sair
          </button>
        </form>
      </div>
      <NavGestao slug={pizzaria.slug} />
    </header>
  );
}
