'use client';

// src/components/auth/GuestButton.tsx
//
// "Pedir sem cadastro" — cria uma sessão anônima do Supabase (exige
// "Allow anonymous sign-ins" habilitado no painel). O pedido segue o fluxo
// normal: nome e telefone são pedidos no checkout. Histórico fica no aparelho
// (a sessão vive nos cookies); quem quiser histórico em qualquer lugar usa
// Google/email. Abuso é contido pelo limite do Supabase (30 sessões/h por IP)
// + rate limit do criarPedido.

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  /** Destino interno pós-sessão (ex.: /[slug]/checkout; default: raiz da loja). */
  next: string;
}

export function GuestButton({ next }: Props) {
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const continuar = async () => {
    setPending(true);
    setErro(null);
    const { error } = await createClient().auth.signInAnonymously();
    if (error) {
      setErro('Não foi possível continuar sem cadastro. Tente de novo ou entre com o Google.');
      setPending(false);
      return;
    }
    // Navegação completa (não router.push): garante que o servidor já veja o
    // cookie da sessão nova na primeira renderização da página protegida.
    window.location.assign(next);
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={continuar}
        disabled={pending}
        className="w-full bg-pomodoro hover:bg-pomodoro-hover disabled:opacity-60 text-white p-3.5 rounded-lg font-semibold transition-colors active:scale-[0.99]"
      >
        {pending ? 'Preparando seu pedido...' : 'Pedir sem cadastro'}
      </button>
      <p className="text-xs text-creme-muted text-center">
        Sem senha, sem email — você só informa nome e telefone no pedido.
      </p>
      {erro && (
        <p role="alert" className="text-sm text-pomodoro bg-pomodoro/5 border border-pomodoro/20 rounded-lg p-3">
          {erro}
        </p>
      )}
    </div>
  );
}
