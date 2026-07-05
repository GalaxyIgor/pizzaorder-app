'use client';

// src/components/cardapio/GerirCombos.tsx
//
// Combos sugeridos de meia-meia: lista + form (dois sabores de pizza).

import { useState, useTransition } from 'react';
import { excluirCombo, salvarCombo } from '@/lib/actions/cardapio';
import type { ComboRow, ProdutoRow } from '@/types/gestao';

export function GerirCombos({
  slug,
  pizzas,
  combos,
}: {
  slug: string;
  pizzas: ProdutoRow[];
  combos: ComboRow[];
}) {
  const [aberto, setAberto] = useState<string | null>(null);

  if (pizzas.length < 2) {
    return (
      <p className="text-sm text-creme-muted">
        Cadastre ao menos duas pizzas para montar combos meia-meia.
      </p>
    );
  }

  const nomeDe = (id: string) => pizzas.find((p) => p.id === id)?.nome ?? '—';

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setAberto(aberto === 'novo' ? null : 'novo')}
        className="text-sm font-semibold text-carbono border-2 border-borda-suave rounded-lg px-3 py-2 hover:border-manjericao transition-colors"
      >
        + Novo combo
      </button>

      {aberto === 'novo' && (
        <div className="bg-white border border-borda-suave rounded-xl p-4">
          <FormCombo slug={slug} pizzas={pizzas} combo={null} onFechar={() => setAberto(null)} />
        </div>
      )}

      {combos.length === 0 && aberto !== 'novo' && (
        <p className="text-sm text-creme-muted text-center py-8">
          Nenhum combo ainda — ex.: &quot;Calabresa + Mussarela&quot;.
        </p>
      )}

      {combos.map((c) => (
        <section key={c.id} className="bg-white border border-borda-suave rounded-xl">
          <header className="flex items-center gap-2 p-3">
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-carbono truncate">
                {c.nome}
                {!c.ativo && (
                  <span className="ml-2 text-xs font-semibold text-pomodoro bg-pomodoro/10 rounded-full px-2 py-0.5">
                    Inativo
                  </span>
                )}
              </p>
              <p className="text-xs text-creme-muted truncate">
                ½ {nomeDe(c.produto1_id)} + ½ {nomeDe(c.produto2_id)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAberto(aberto === c.id ? null : c.id)}
              className="text-xs font-semibold text-carbono border-2 border-borda-suave rounded-lg px-2.5 py-1.5 hover:border-manjericao transition-colors"
            >
              {aberto === c.id ? 'Fechar' : 'Editar'}
            </button>
          </header>
          {aberto === c.id && (
            <div className="border-t border-borda-suave p-3">
              <FormCombo slug={slug} pizzas={pizzas} combo={c} onFechar={() => setAberto(null)} />
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function FormCombo({
  slug,
  pizzas,
  combo,
  onFechar,
}: {
  slug: string;
  pizzas: ProdutoRow[];
  combo: ComboRow | null;
  onFechar: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState(combo?.nome ?? '');
  const [descricao, setDescricao] = useState(combo?.descricao ?? '');
  const [imagemUrl, setImagemUrl] = useState(combo?.imagem_url ?? '');
  const [produto1, setProduto1] = useState(combo?.produto1_id ?? pizzas[0].id);
  const [produto2, setProduto2] = useState(combo?.produto2_id ?? pizzas[1].id);
  const [ativo, setAtivo] = useState(combo?.ativo ?? true);

  const submeter = (acao: () => Promise<{ erro?: string }>) => {
    setErro(null);
    startTransition(async () => {
      const r = await acao();
      if (r.erro) setErro(r.erro);
      else onFechar();
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo rotulo="Nome do combo">
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Calabresa + Mussarela"
            className={INPUT}
          />
        </Campo>
        <Campo rotulo="Imagem (URL) — opcional">
          <input
            type="url"
            value={imagemUrl}
            onChange={(e) => setImagemUrl(e.target.value)}
            className={INPUT}
          />
        </Campo>
        <Campo rotulo="Sabor 1">
          <select value={produto1} onChange={(e) => setProduto1(e.target.value)} className={INPUT}>
            {pizzas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Sabor 2">
          <select value={produto2} onChange={(e) => setProduto2(e.target.value)} className={INPUT}>
            {pizzas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <Campo rotulo="Descrição — opcional">
        <textarea
          rows={2}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className={INPUT}
        />
      </Campo>

      <label className="flex items-center gap-2 text-sm font-medium text-carbono cursor-pointer">
        <input
          type="checkbox"
          checked={ativo}
          onChange={(e) => setAtivo(e.target.checked)}
          className="h-4 w-4 accent-manjericao"
        />
        Visível na vitrine
      </label>

      {erro && (
        <p role="alert" className="text-sm text-pomodoro bg-pomodoro/5 border border-pomodoro/20 rounded-lg p-3">
          {erro}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            submeter(() =>
              salvarCombo(slug, {
                id: combo?.id,
                nome,
                descricao: descricao || null,
                imagem_url: imagemUrl || null,
                produto1_id: produto1,
                produto2_id: produto2,
                ativo,
              })
            )
          }
          className="bg-manjericao hover:opacity-90 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all active:scale-[0.99]"
        >
          {pending ? 'Salvando...' : 'Salvar combo'}
        </button>
        {combo && (
          <button
            type="button"
            disabled={pending}
            onClick={() => submeter(() => excluirCombo(slug, combo.id))}
            className="px-4 py-2.5 border-2 border-pomodoro/30 text-pomodoro hover:bg-pomodoro/5 disabled:opacity-60 rounded-lg font-semibold text-sm transition-colors"
          >
            Excluir
          </button>
        )}
        <button
          type="button"
          onClick={onFechar}
          disabled={pending}
          className="px-4 py-2.5 border-2 border-borda-suave text-carbono hover:bg-massa-bg rounded-lg font-semibold text-sm transition-colors"
        >
          Voltar
        </button>
      </div>
    </div>
  );
}

const INPUT =
  'w-full border border-borda-suave rounded-lg p-3 text-sm bg-massa-bg focus:outline-none focus:ring-2 focus:ring-pomodoro/40';

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-carbono mb-1">{rotulo}</span>
      {children}
    </label>
  );
}
