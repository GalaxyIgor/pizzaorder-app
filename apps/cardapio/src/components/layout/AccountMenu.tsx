'use client';

// src/components/layout/AccountMenu.tsx
//
// Menu de conta: dropdown com links para pedidos, perfil e logout quando logado.
// Quando deslogado, mostra botões para "Entrar" e "Criar conta".

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LogoutForm } from '@/components/layout/LogoutForm';

export function AccountMenu() {
  const { user, loading } = useAuth();
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const params = useParams();
  const slug = params.slug as string;

  useEffect(() => {
    const handleClickFora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };

    if (aberto) {
      document.addEventListener('click', handleClickFora);
      return () => document.removeEventListener('click', handleClickFora);
    }
  }, [aberto]);

  // Carregando
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-1 flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pomodoro to-pomodoro-hover flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
        <span className="text-xs font-medium text-carbono">Perfil</span>
      </div>
    );
  }

  // Usuário logado
  if (user) {
    return (
      <div ref={ref} className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => setAberto(!aberto)}
          className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity flex-shrink-0 rounded-lg px-2 py-1 hover:bg-massa-bg"
          aria-label="Menu de conta"
          aria-expanded={aberto}
          title="Menu de conta"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pomodoro to-pomodoro-hover flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <span className="text-xs font-medium text-carbono">Perfil</span>
        </button>

        {aberto && (
          <div className="absolute top-full right-0 mt-2 bg-white border border-borda-suave rounded-lg shadow-lg z-50 min-w-[200px]">
            <nav className="py-2">
              <Link
                href={`/${slug}/conta/pedidos`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-carbono hover:bg-massa-bg transition-colors"
                onClick={() => setAberto(false)}
              >
                <span>🧾</span>
                Meus pedidos
              </Link>

              <LogoutForm slug={slug} />
            </nav>
          </div>
        )}
      </div>
    );
  }

  // Usuário deslogado
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-2 flex-shrink-0">
      <Link
        href={`/${slug}/entrar`}
        className="text-xs font-semibold text-creme-muted hover:text-carbono border border-borda-suave rounded-full px-3 py-2 transition-colors text-center"
        title="Entrar na sua conta"
      >
        Entrar
      </Link>
      <Link
        href={`/${slug}/cadastro`}
        className="text-xs font-semibold text-white bg-pomodoro hover:bg-pomodoro-hover border border-pomodoro rounded-full px-3 py-2 transition-colors text-center"
        title="Criar nova conta"
      >
        Cadastro
      </Link>
    </div>
  );
}
