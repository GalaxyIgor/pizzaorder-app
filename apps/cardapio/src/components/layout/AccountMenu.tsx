'use client';

// src/components/layout/AccountMenu.tsx
//
// Menu de conta: dropdown com links para pedidos, perfil e logout.

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { LogoutForm } from '@/components/layout/LogoutForm';

export function AccountMenu() {
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

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="text-xs font-semibold text-creme-muted hover:text-carbono border border-borda-suave rounded-full px-3 py-2 transition-colors flex items-center gap-2"
        aria-label="Menu de conta"
        aria-expanded={aberto}
      >
        👤
        <span className="hidden sm:inline">Conta</span>
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
