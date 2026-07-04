'use client';

// src/components/PausarLojaToggle.tsx
//
// Liga/desliga a pausa de novos pedidos direto do header do painel.

import { useState, useTransition } from 'react';
import { pausarLoja } from '@/lib/actions/pedidos';

interface Props {
  slug: string;
  pausado: boolean;
}

export function PausarLojaToggle({ slug, pausado }: Props) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const alternar = () => {
    setErro(null);
    startTransition(async () => {
      const r = await pausarLoja(slug, !pausado);
      if (r.erro) setErro(r.erro);
    });
  };

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={alternar}
        disabled={pending}
        title={pausado ? 'Voltar a aceitar pedidos' : 'Pausar novos pedidos'}
        className={`text-sm font-semibold rounded-lg px-3 py-2 border-2 transition-colors disabled:opacity-60 ${
          pausado
            ? 'border-pomodoro bg-pomodoro text-white hover:bg-pomodoro-hover'
            : 'border-borda-suave text-carbono hover:border-pomodoro hover:text-pomodoro'
        }`}
      >
        {pending ? '...' : pausado ? '⏸️ Pedidos pausados' : 'Pausar pedidos'}
      </button>
      {erro && <p className="text-xs text-pomodoro mt-1">{erro}</p>}
    </div>
  );
}
