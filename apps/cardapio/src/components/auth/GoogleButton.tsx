'use client';

// src/components/auth/GoogleButton.tsx
//
// "Continuar com o Google" — abre o OAuth do Supabase (PKCE). O retorno cai
// em /auth/callback, que troca o código pela sessão, garante a linha em
// `perfis` e segue para `next` (ex.: /[slug]/checkout).

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  /** Destino interno pós-login (o callback valida; default: raiz). */
  next?: string;
}

export function GoogleButton({ next }: Props) {
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const entrar = async () => {
    setPending(true);
    setErro(null);
    const callback = new URL('/auth/callback', window.location.origin);
    if (next) callback.searchParams.set('next', next);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callback.toString() },
    });
    // Sucesso = navegação para o Google; só continua aqui em falha.
    if (error) {
      setErro('Não foi possível abrir o login do Google. Tente novamente.');
      setPending(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={entrar}
        disabled={pending}
        className="w-full flex items-center justify-center gap-3 border-2 border-borda-suave hover:border-carbono/30 disabled:opacity-60 bg-white text-carbono p-3 rounded-lg font-semibold transition-colors active:scale-[0.99]"
      >
        <IconeGoogle />
        {pending ? 'Abrindo o Google...' : 'Continuar com o Google'}
      </button>
      {erro && (
        <p role="alert" className="text-sm text-pomodoro bg-pomodoro/5 border border-pomodoro/20 rounded-lg p-3">
          {erro}
        </p>
      )}
    </div>
  );
}

function IconeGoogle() {
  return (
    <svg viewBox="0 0 48 48" className="w-5 h-5 shrink-0" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
