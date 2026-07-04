'use client';

// src/components/layout/CookieConsent.tsx
//
// Aviso de cookies (LGPD): aparece uma vez até o cliente aceitar ou recusar.
// Hoje só existem cookies essenciais (sessão Supabase) — a escolha fica
// gravada para condicionar cookies adicionais (analytics etc.) no futuro.
//
// A leitura do localStorage usa useSyncExternalStore: no SSR o banner não
// renderiza (snapshot 'ssr') e no client o valor real chega sem mismatch
// de hidratação.

import { useSyncExternalStore } from 'react';
import Link from 'next/link';

// Lida por quem for adicionar analytics: 'accepted' libera, 'rejected' bloqueia.
export const COOKIE_CONSENT_KEY = 'pizzaorder:cookie-consent';

type Consent = 'accepted' | 'rejected';

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot(): string {
  try {
    // null = ainda sem resposta → mostra o banner
    return localStorage.getItem(COOKIE_CONSENT_KEY) ?? 'pendente';
  } catch {
    // localStorage indisponível — não mostra o aviso (nada a persistir)
    return 'indisponivel';
  }
}

function getServerSnapshot(): string {
  return 'ssr';
}

function responder(escolha: Consent) {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, escolha);
  } catch {
    // sem persistência — o snapshot continua 'indisponivel' e o banner some
  }
  listeners.forEach((onChange) => onChange());
}

export function CookieConsent() {
  const consentimento = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (consentimento !== 'pendente') return null;

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed bottom-0 inset-x-0 sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-lg z-40 bg-white border-t sm:border border-borda-suave sm:rounded-xl shadow-lg p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4 space-y-3"
    >
      <p className="text-sm text-carbono leading-relaxed">
        🍪 Usamos cookies essenciais para manter seu login e seu pedido
        funcionando, e gostaríamos de usar cookies adicionais para melhorar
        sua experiência.{' '}
        <Link href="/privacidade" className="text-pomodoro font-semibold hover:underline">
          Política de privacidade
        </Link>
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => responder('rejected')}
          className="flex-1 px-4 py-2.5 rounded-lg border-2 border-borda-suave text-carbono text-sm font-semibold hover:bg-massa-bg transition-colors cursor-pointer"
        >
          Recusar
        </button>
        <button
          type="button"
          onClick={() => responder('accepted')}
          className="flex-1 px-4 py-2.5 rounded-lg bg-pomodoro hover:bg-pomodoro-hover text-white text-sm font-semibold transition-colors cursor-pointer active:scale-[0.99]"
        >
          Aceitar cookies
        </button>
      </div>
    </div>
  );
}
