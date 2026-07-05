'use client';

// src/app/[slug]/cadastro/page.tsx
//
// Criação de conta (Supabase Auth email+senha + linha em `perfis`).

import { Suspense, useActionState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { signUp, type AuthState } from '@/lib/actions/auth';
import { PasswordInput } from '@/components/auth/PasswordInput';

const estadoInicial: AuthState = {};

export default function CadastroPage() {
  return (
    <Suspense>
      <CadastroForm />
    </Suspense>
  );
}

const inputClass =
  'w-full border border-borda-suave rounded-lg p-3 text-sm bg-massa-bg focus:outline-none focus:ring-2 focus:ring-pomodoro/40';

function CadastroForm() {
  const params = useParams();
  const slug = params.slug as string;
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '';
  const [state, formAction, pending] = useActionState(signUp, estadoInicial);

  return (
    <div className="max-w-full sm:max-w-md mx-auto p-4 py-8 min-h-dvh flex flex-col justify-center">
      <div className="bg-white border border-borda-suave rounded-2xl p-6 shadow-sm">
        <h1 className="font-display text-2xl font-bold text-carbono mb-1">Criar conta</h1>
        <p className="text-sm text-creme-muted mb-6">
          Com a conta você finaliza pedidos e acompanha o status de cada um.
        </p>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="redirect" value={redirect} />

          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-carbono mb-1">
              Nome
            </label>
            <input id="nome" name="nome" type="text" required autoComplete="name" className={inputClass} />
          </div>

          <div>
            <label htmlFor="telefone" className="block text-sm font-medium text-carbono mb-1">
              Telefone (WhatsApp)
            </label>
            <input
              id="telefone"
              name="telefone"
              type="tel"
              required
              autoComplete="tel"
              placeholder="(11) 99999-9999"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-carbono mb-1">
              Email
            </label>
            <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
          </div>

          <PasswordInput
            id="senha"
            name="senha"
            label="Senha"
            required
            autoComplete="new-password"
            minLength={6}
            helperText="Mínimo de 6 caracteres."
          />

          {state.erro && (
            <p role="alert" className="text-sm text-pomodoro bg-pomodoro/5 border border-pomodoro/20 rounded-lg p-3">
              {state.erro}
            </p>
          )}
          {state.sucesso && (
            <p role="status" className="text-sm text-manjericao bg-manjericao/5 border border-manjericao/20 rounded-lg p-3">
              {state.sucesso}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-pomodoro hover:bg-pomodoro-hover disabled:opacity-60 text-white p-3 rounded-lg font-semibold transition-colors active:scale-[0.99]"
          >
            {pending ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="text-sm text-creme-muted mt-6 text-center">
          Já tem conta?{' '}
          <Link
            href={`/${slug}/entrar${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
            className="text-pomodoro font-semibold hover:underline"
          >
            Entrar
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
