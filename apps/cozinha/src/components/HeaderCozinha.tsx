// src/components/HeaderCozinha.tsx
//
// Cabeçalho do painel (server component — o botão sair usa Server Action).

import Link from 'next/link';
import { signOut } from '@/lib/actions/auth';
import type { PizzariaCozinha } from '@/lib/staff';

export function HeaderCozinha({ pizzaria }: { pizzaria: PizzariaCozinha }) {
  return (
    <header className="bg-white border-b border-borda-suave px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
      <span className="text-2xl" aria-hidden="true">
        👨‍🍳
      </span>
      <div className="flex-1 min-w-0">
        <h1 className="font-display text-lg font-bold text-carbono leading-tight truncate">
          {pizzaria.nome}
        </h1>
        <p className="text-xs text-creme-muted">Cozinha</p>
      </div>

      <Link
        href={`/${pizzaria.slug}/historico`}
        className="text-sm font-semibold text-carbono border-2 border-borda-suave rounded-lg px-3 py-2 hover:border-pomodoro hover:text-pomodoro transition-colors"
      >
        Histórico
      </Link>
      <form action={signOut}>
        <button
          type="submit"
          className="text-sm text-creme-muted hover:text-carbono px-2 py-2 transition-colors"
        >
          Sair
        </button>
      </form>
    </header>
  );
}
