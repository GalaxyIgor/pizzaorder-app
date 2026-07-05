'use client';

// src/components/cardapio/GerirDestaques.tsx
//
// Destaques do carrossel: lista ordenada (▲▼ / remover) + select para
// adicionar. O salvar substitui a lista inteira na ordem exibida.

import { useState, useTransition } from 'react';
import { salvarDestaques } from '@/lib/actions/cardapio';
import type { DestaqueRow, ProdutoRow } from '@/types/gestao';

export function GerirDestaques({
  slug,
  produtos,
  destaques,
}: {
  slug: string;
  produtos: ProdutoRow[];
  destaques: DestaqueRow[];
}) {
  const [selecionados, setSelecionados] = useState<string[]>(
    destaques.map((d) => d.produto_id).filter((id) => produtos.some((p) => p.id === id))
  );
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const disponiveis = produtos.filter((p) => !selecionados.includes(p.id));
  const nomeDe = (id: string) => produtos.find((p) => p.id === id)?.nome ?? '—';

  const mover = (i: number, delta: -1 | 1) => {
    const nova = [...selecionados];
    const [item] = nova.splice(i, 1);
    nova.splice(i + delta, 0, item);
    setSelecionados(nova);
    setSalvo(false);
  };

  const salvar = () => {
    setErro(null);
    setSalvo(false);
    startTransition(async () => {
      const r = await salvarDestaques(slug, selecionados);
      if (r.erro) setErro(r.erro);
      else setSalvo(true);
    });
  };

  return (
    <section className="bg-white border border-borda-suave rounded-xl p-4 space-y-4 max-w-2xl">
      <div>
        <h2 className="font-display text-xl font-bold text-carbono">Destaques da home</h2>
        <p className="text-xs text-creme-muted mt-1">
          Aparecem no carrossel do cardápio, nesta ordem.
        </p>
      </div>

      {selecionados.length === 0 ? (
        <p className="text-sm text-creme-muted py-2">Nenhum destaque selecionado.</p>
      ) : (
        <ol className="space-y-2">
          {selecionados.map((id, i) => (
            <li key={id} className="flex items-center gap-2 border border-borda-suave rounded-lg p-2.5">
              <span className="text-xs font-bold text-creme-muted w-5 text-right">{i + 1}.</span>
              <span className="flex-1 min-w-0 truncate text-sm font-semibold text-carbono">
                {nomeDe(id)}
              </span>
              <span className="flex gap-1">
                <button
                  type="button"
                  aria-label="Subir"
                  disabled={i === 0 || pending}
                  onClick={() => mover(i, -1)}
                  className={BOTAO_ORDEM}
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label="Descer"
                  disabled={i === selecionados.length - 1 || pending}
                  onClick={() => mover(i, 1)}
                  className={BOTAO_ORDEM}
                >
                  ▼
                </button>
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelecionados(selecionados.filter((x) => x !== id));
                  setSalvo(false);
                }}
                aria-label={`Remover ${nomeDe(id)} dos destaques`}
                className="px-2.5 py-1 border-2 border-pomodoro/30 text-pomodoro hover:bg-pomodoro/5 rounded-lg font-bold text-sm"
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      )}

      {disponiveis.length > 0 && (
        <label className="block">
          <span className="block text-sm font-medium text-carbono mb-1">Adicionar produto</span>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                setSelecionados([...selecionados, e.target.value]);
                setSalvo(false);
              }
            }}
            className="w-full border border-borda-suave rounded-lg p-3 text-sm bg-massa-bg"
          >
            <option value="">Escolher…</option>
            {disponiveis.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
      )}

      {erro && (
        <p role="alert" className="text-sm text-pomodoro bg-pomodoro/5 border border-pomodoro/20 rounded-lg p-3">
          {erro}
        </p>
      )}
      {salvo && (
        <p role="status" className="text-sm text-manjericao bg-manjericao/5 border border-manjericao/20 rounded-lg p-3">
          Destaques salvos.
        </p>
      )}

      <button
        type="button"
        onClick={salvar}
        disabled={pending}
        className="bg-pomodoro hover:bg-pomodoro-hover disabled:opacity-60 text-white px-6 py-3 rounded-lg font-semibold transition-colors active:scale-[0.99]"
      >
        {pending ? 'Salvando...' : 'Salvar destaques'}
      </button>
    </section>
  );
}

const BOTAO_ORDEM =
  'px-2 py-1 border border-borda-suave rounded text-xs text-carbono hover:border-manjericao disabled:opacity-30 transition-colors';
