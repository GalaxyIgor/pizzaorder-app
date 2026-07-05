'use client';

// src/app/[slug]/entrar/page.tsx
//
// Login (email+senha). Aceita ?redirect= para voltar aonde o cliente estava
// (ex.: /[slug]/checkout, injetado pelo src/proxy.ts).

import { Suspense, useActionState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { signIn, type AuthState } from '@/lib/actions/auth';
import { PasswordInput } from '@/components/auth/PasswordInput';

const estadoInicial: AuthState = {};

export default function EntrarPage() {
  return (
    <Suspense>
      <EntrarForm />
    </Suspense>
  );
}

function EntrarForm() {
  const params = useParams();
  const slug = params.slug as string;
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '';
  const [state, formAction, pending] = useActionState(signIn, estadoInicial);

  return (
    <div className="max-w-full sm:max-w-md mx-auto p-4 py-8 min-h-dvh flex flex-col justify-center">
      <div className="bg-white border border-borda-suave rounded-2xl p-6 shadow-sm">
        <h1 className="font-display text-2xl font-bold text-carbono mb-1">Entrar</h1>
        <p className="text-sm text-creme-muted mb-6">
          Faça login para finalizar seu pedido e acompanhar o status.
        </p>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="redirect" value={redirect} />

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

          <PasswordInput
            id="senha"
            name="senha"
            label="Senha"
            required
            autoComplete="current-password"
          />

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

        <p className="text-sm text-creme-muted mt-6 text-center">
          Ainda não tem conta?{' '}
          <Link
            href={`/${slug}/cadastro${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
            className="text-pomodoro font-semibold hover:underline"
          >
            Criar conta
          </Link>
        </p>
        <p className="text-sm text-center mt-2">
          <Link href={`/${slug}`} className="text-creme-muted hover:text-carbono">
            ← Voltar ao cardápio
          </Link>
        </p>
      </div>
    </div>
  );
}
