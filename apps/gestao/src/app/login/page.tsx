'use client';

// src/app/login/page.tsx
//
// Login do staff (email+senha). Sem cadastro: contas são criadas manualmente.

import { useActionState } from 'react';
import { signIn, type AuthState } from '@/lib/actions/auth';

const estadoInicial: AuthState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, estadoInicial);

  return (
    <div className="max-w-full sm:max-w-md mx-auto p-4 py-8 min-h-dvh flex flex-col justify-center">
      <div className="bg-white border border-borda-suave rounded-2xl p-6 shadow-sm">
        <p className="text-3xl mb-2" aria-hidden="true">
          📊
        </p>
        <h1 className="font-display text-2xl font-bold text-carbono mb-1">Gestão</h1>
        <p className="text-sm text-creme-muted mb-6">
          Entre com a conta de staff da sua pizzaria.
        </p>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-carbono mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full border border-borda-suave rounded-lg p-3 text-sm bg-massa-bg focus:outline-none focus:ring-2 focus:ring-pomodoro/40"
            />
          </div>

          <div>
            <label htmlFor="senha" className="block text-sm font-medium text-carbono mb-1">
              Senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              required
              autoComplete="current-password"
              className="w-full border border-borda-suave rounded-lg p-3 text-sm bg-massa-bg focus:outline-none focus:ring-2 focus:ring-pomodoro/40"
            />
          </div>

          {state.erro && (
            <p role="alert" className="text-sm text-pomodoro bg-pomodoro/5 border border-pomodoro/20 rounded-lg p-3">
              {state.erro}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-pomodoro hover:bg-pomodoro-hover disabled:opacity-60 text-white p-3 rounded-lg font-semibold transition-colors active:scale-[0.99]"
          >
            {pending ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
