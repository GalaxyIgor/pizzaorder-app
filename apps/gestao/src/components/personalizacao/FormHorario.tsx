'use client';

// src/components/personalizacao/FormHorario.tsx
//
// Horário de funcionamento: 7 dias × faixas abre/fecha. "Sempre aberto" salva
// null; dia sem faixa = fechado; fecha < abre cruza a meia-noite (ex.: 18:00 →
// 01:00). O cardápio mostra "Fechado" e o criarPedido recusa fora do horário.

import { useState, useTransition } from 'react';
import type { FaixaHorario, HorarioFuncionamento } from '@pizzaorder/shared';
import { salvarHorario } from '@/lib/actions/pizzaria';

const DIAS = [
  { chave: '1', rotulo: 'Segunda' },
  { chave: '2', rotulo: 'Terça' },
  { chave: '3', rotulo: 'Quarta' },
  { chave: '4', rotulo: 'Quinta' },
  { chave: '5', rotulo: 'Sexta' },
  { chave: '6', rotulo: 'Sábado' },
  { chave: '0', rotulo: 'Domingo' },
] as const;

type Estado = Record<string, FaixaHorario[]>;

function estadoInicial(horario: HorarioFuncionamento | null): Estado {
  const estado: Estado = {};
  for (const { chave } of DIAS) estado[chave] = [...(horario?.[chave] ?? [])];
  return estado;
}

export function FormHorario({
  slug,
  inicial,
}: {
  slug: string;
  inicial: HorarioFuncionamento | null;
}) {
  const [sempreAberto, setSempreAberto] = useState(inicial === null);
  const [dias, setDias] = useState<Estado>(() => estadoInicial(inicial));
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const mudarFaixa = (dia: string, i: number, campo: keyof FaixaHorario, valor: string) => {
    setDias((atual) => ({
      ...atual,
      [dia]: atual[dia].map((f, j) => (j === i ? { ...f, [campo]: valor } : f)),
    }));
  };

  const salvar = () => {
    setErro(null);
    setSalvo(false);
    startTransition(async () => {
      let horario: HorarioFuncionamento | null = null;
      if (!sempreAberto) {
        horario = {};
        for (const { chave } of DIAS) {
          const faixas = dias[chave].filter((f) => f.abre && f.fecha);
          horario[chave] = faixas;
        }
      }
      const r = await salvarHorario(slug, horario);
      if (r.erro) setErro(r.erro);
      else setSalvo(true);
    });
  };

  return (
    <section className="bg-white border border-borda-suave rounded-xl p-5 space-y-4">
      <h2 className="font-display text-xl font-bold text-carbono">Horário de funcionamento</h2>

      <label className="flex items-center gap-2 text-sm font-medium text-carbono cursor-pointer">
        <input
          type="checkbox"
          checked={sempreAberto}
          onChange={(e) => setSempreAberto(e.target.checked)}
          className="h-4 w-4 accent-pomodoro"
        />
        Sempre aberto (sem horário definido)
      </label>

      {!sempreAberto && (
        <div className="space-y-3">
          <p className="text-xs text-creme-muted">
            Dia sem faixa fica <span className="font-semibold">fechado</span>. Fechamento menor
            que a abertura vira madrugada (ex.: 18:00 – 01:00).
          </p>
          {DIAS.map(({ chave, rotulo }) => (
            <div key={chave} className="flex flex-wrap items-start gap-2 border-t border-borda-suave pt-3">
              <p className="w-24 text-sm font-semibold text-carbono pt-2">{rotulo}</p>
              <div className="flex-1 space-y-2">
                {dias[chave].length === 0 && (
                  <p className="text-xs text-creme-muted pt-2.5">Fechado</p>
                )}
                {dias[chave].map((faixa, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={faixa.abre}
                      onChange={(e) => mudarFaixa(chave, i, 'abre', e.target.value)}
                      className="border border-borda-suave rounded-lg p-2 text-sm bg-massa-bg"
                      aria-label={`${rotulo}: abre`}
                    />
                    <span className="text-xs text-creme-muted">até</span>
                    <input
                      type="time"
                      value={faixa.fecha}
                      onChange={(e) => mudarFaixa(chave, i, 'fecha', e.target.value)}
                      className="border border-borda-suave rounded-lg p-2 text-sm bg-massa-bg"
                      aria-label={`${rotulo}: fecha`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDias((a) => ({ ...a, [chave]: a[chave].filter((_, j) => j !== i) }))
                      }
                      aria-label={`Remover faixa de ${rotulo}`}
                      className="px-2.5 py-1.5 border-2 border-pomodoro/30 text-pomodoro hover:bg-pomodoro/5 rounded-lg font-bold text-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setDias((a) => ({
                      ...a,
                      [chave]: [...a[chave], { abre: '18:00', fecha: '23:00' }],
                    }))
                  }
                  className="text-xs font-semibold text-carbono border-2 border-borda-suave rounded-lg px-2.5 py-1.5 hover:border-manjericao transition-colors"
                >
                  + Faixa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {erro && (
        <p role="alert" className="text-sm text-pomodoro bg-pomodoro/5 border border-pomodoro/20 rounded-lg p-3">
          {erro}
        </p>
      )}
      {salvo && (
        <p role="status" className="text-sm text-manjericao bg-manjericao/5 border border-manjericao/20 rounded-lg p-3">
          Horário salvo.
        </p>
      )}

      <button
        type="button"
        onClick={salvar}
        disabled={pending}
        className="w-full sm:w-auto bg-pomodoro hover:bg-pomodoro-hover disabled:opacity-60 text-white px-6 py-3 rounded-lg font-semibold transition-colors active:scale-[0.99]"
      >
        {pending ? 'Salvando...' : 'Salvar horário'}
      </button>
    </section>
  );
}
