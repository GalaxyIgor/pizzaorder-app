'use client';

// src/components/cardapio/GerirAdicionais.tsx
//
// Grupos de adicionais: lista com edição expandida (FormGrupo). A lista de
// opções enviada é o estado final — o server faz o diff (salvarGrupoAdicionais).

import { useState, useTransition } from 'react';
import { formatarPreco } from '@pizzaorder/shared';
import {
  excluirGrupoAdicionais,
  salvarGrupoAdicionais,
} from '@/lib/actions/cardapio';
import type { CategoriaRow, GrupoRow } from '@/types/gestao';

interface PrecoStr {
  tamanho: string;
  preco: string;
}

interface OpcaoStr {
  id?: string;
  nome: string;
  precoBase: string;
  variarPorTamanho: boolean;
  disponivel: boolean;
  precos: PrecoStr[];
}

function numero(s: string): number {
  const n = Number(s.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

export function GerirAdicionais({
  slug,
  categorias,
  grupos,
}: {
  slug: string;
  categorias: CategoriaRow[];
  grupos: GrupoRow[];
}) {
  // 'novo' | id do grupo em edição | null
  const [aberto, setAberto] = useState<string | null>(null);

  if (categorias.length === 0) {
    return <p className="text-sm text-creme-muted">Crie uma categoria antes de configurar adicionais.</p>;
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setAberto(aberto === 'novo' ? null : 'novo')}
        className="text-sm font-semibold text-carbono border-2 border-borda-suave rounded-lg px-3 py-2 hover:border-manjericao transition-colors"
      >
        + Novo grupo de adicionais
      </button>

      {aberto === 'novo' && (
        <FormGrupo slug={slug} categorias={categorias} grupo={null} onFechar={() => setAberto(null)} />
      )}

      {grupos.length === 0 && aberto !== 'novo' && (
        <p className="text-sm text-creme-muted text-center py-8">
          Nenhum grupo ainda — ex.: &quot;Borda recheada&quot;, &quot;Extras&quot;.
        </p>
      )}

      {grupos.map((g) => {
        const categoria = categorias.find((c) => c.id === g.categoria_id);
        return (
          <section key={g.id} className="bg-white border border-borda-suave rounded-xl">
            <header className="flex items-center gap-2 p-3">
              <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-bold text-carbono truncate">{g.nome}</h2>
                <span className="text-xs text-creme-muted bg-borda-suave/60 rounded-full px-2 py-0.5">
                  {categoria?.nome ?? '—'}
                </span>
                <span className="text-xs text-creme-muted">
                  {g.tipo === 'unica' ? 'escolha única' : 'múltipla'}
                  {g.obrigatorio ? ' · obrigatório' : ''} · {g.opcoes_adicionais.length}{' '}
                  {g.opcoes_adicionais.length === 1 ? 'opção' : 'opções'}
                </span>
                {!g.ativo && (
                  <span className="text-xs font-semibold text-pomodoro bg-pomodoro/10 rounded-full px-2 py-0.5">
                    Inativo
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setAberto(aberto === g.id ? null : g.id)}
                className="text-xs font-semibold text-carbono border-2 border-borda-suave rounded-lg px-2.5 py-1.5 hover:border-manjericao transition-colors"
              >
                {aberto === g.id ? 'Fechar' : 'Editar'}
              </button>
            </header>
            {aberto === g.id && (
              <div className="border-t border-borda-suave p-3">
                <FormGrupo
                  slug={slug}
                  categorias={categorias}
                  grupo={g}
                  onFechar={() => setAberto(null)}
                />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function FormGrupo({
  slug,
  categorias,
  grupo,
  onFechar,
}: {
  slug: string;
  categorias: CategoriaRow[];
  grupo: GrupoRow | null;
  onFechar: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState(grupo?.nome ?? '');
  const [categoriaId, setCategoriaId] = useState(grupo?.categoria_id ?? categorias[0].id);
  const [tipo, setTipo] = useState<'unica' | 'multipla'>(grupo?.tipo ?? 'multipla');
  const [obrigatorio, setObrigatorio] = useState(grupo?.obrigatorio ?? false);
  const [minSel, setMinSel] = useState(String(grupo?.min_selecoes ?? 0));
  const [maxSel, setMaxSel] = useState(grupo?.max_selecoes == null ? '' : String(grupo.max_selecoes));
  const [ativo, setAtivo] = useState(grupo?.ativo ?? true);
  const [opcoes, setOpcoes] = useState<OpcaoStr[]>(
    grupo
      ? [...grupo.opcoes_adicionais]
          .sort((a, b) => a.ordem - b.ordem)
          .map((o) => ({
            id: o.id,
            nome: o.nome,
            precoBase: String(o.preco_base),
            variarPorTamanho: o.variar_por_tamanho,
            disponivel: o.disponivel,
            precos: o.precos_opcao_por_tamanho.map((p) => ({
              tamanho: p.tamanho,
              preco: String(p.preco),
            })),
          }))
      : [{ nome: '', precoBase: '0', variarPorTamanho: false, disponivel: true, precos: [] }]
  );

  const mudarOpcao = (i: number, mudanca: Partial<OpcaoStr>) => {
    setOpcoes(opcoes.map((o, j) => (j === i ? { ...o, ...mudanca } : o)));
  };

  const salvar = () => {
    setErro(null);
    startTransition(async () => {
      const r = await salvarGrupoAdicionais(slug, {
        id: grupo?.id,
        categoria_id: categoriaId,
        nome,
        tipo,
        obrigatorio,
        min_selecoes: Math.max(0, Math.round(numero(minSel) || 0)),
        max_selecoes: maxSel.trim() === '' ? null : Math.round(numero(maxSel)),
        ativo,
        opcoes: opcoes.map((o) => ({
          id: o.id,
          nome: o.nome,
          preco_base: numero(o.precoBase) || 0,
          variar_por_tamanho: o.variarPorTamanho,
          disponivel: o.disponivel,
          precosPorTamanho: o.variarPorTamanho
            ? o.precos
                .filter((p) => p.tamanho.trim() !== '')
                .map((p) => ({ tamanho: p.tamanho, preco: numero(p.preco) || 0 }))
            : [],
        })),
      });
      if (r.erro) setErro(r.erro);
      else onFechar();
    });
  };

  const excluir = () => {
    setErro(null);
    startTransition(async () => {
      const r = await excluirGrupoAdicionais(slug, grupo!.id);
      if (r.erro) setErro(r.erro);
      else onFechar();
    });
  };

  return (
    <div className={`space-y-4 ${grupo ? '' : 'bg-white border border-borda-suave rounded-xl p-4'}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo rotulo="Nome do grupo">
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Borda recheada"
            className={INPUT}
          />
        </Campo>
        <Campo rotulo="Vale para a categoria">
          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className={INPUT}>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Tipo de escolha">
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as 'unica' | 'multipla')}
            className={INPUT}
          >
            <option value="unica">Escolha única (ex.: borda)</option>
            <option value="multipla">Múltipla (ex.: extras)</option>
          </select>
        </Campo>
        <div className="grid grid-cols-2 gap-2">
          <Campo rotulo="Mínimo">
            <input
              type="text"
              inputMode="numeric"
              value={minSel}
              onChange={(e) => setMinSel(e.target.value)}
              className={INPUT}
            />
          </Campo>
          <Campo rotulo="Máximo (vazio = sem limite)">
            <input
              type="text"
              inputMode="numeric"
              value={maxSel}
              onChange={(e) => setMaxSel(e.target.value)}
              className={INPUT}
            />
          </Campo>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <Checkbox rotulo="Obrigatório" marcado={obrigatorio} onMudar={setObrigatorio} />
        <Checkbox rotulo="Visível no cardápio" marcado={ativo} onMudar={setAtivo} />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-bold text-carbono uppercase tracking-wide">Opções</legend>
        {opcoes.map((o, i) => (
          <div key={o.id ?? `nova-${i}`} className="border border-borda-suave rounded-lg p-3 space-y-2">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={o.nome}
                onChange={(e) => mudarOpcao(i, { nome: e.target.value })}
                placeholder="Catupiry"
                className={INPUT}
              />
              {!o.variarPorTamanho && (
                <input
                  type="text"
                  inputMode="decimal"
                  value={o.precoBase}
                  onChange={(e) => mudarOpcao(i, { precoBase: e.target.value })}
                  placeholder="R$"
                  className={`${INPUT} max-w-28`}
                />
              )}
              <button
                type="button"
                onClick={() => setOpcoes(opcoes.filter((_, j) => j !== i))}
                disabled={opcoes.length === 1}
                aria-label="Remover opção"
                className="px-3 py-2 border-2 border-pomodoro/30 text-pomodoro hover:bg-pomodoro/5 disabled:opacity-30 rounded-lg font-bold text-sm"
              >
                ×
              </button>
            </div>
            <div className="flex flex-wrap gap-4">
              <Checkbox
                rotulo="Disponível"
                marcado={o.disponivel}
                onMudar={(v) => mudarOpcao(i, { disponivel: v })}
              />
              <Checkbox
                rotulo="Preço por tamanho"
                marcado={o.variarPorTamanho}
                onMudar={(v) => mudarOpcao(i, { variarPorTamanho: v })}
              />
            </div>
            {o.variarPorTamanho && (
              <div className="space-y-2 pl-2 border-l-2 border-borda-suave">
                {o.precos.map((p, k) => (
                  <div key={k} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={p.tamanho}
                      onChange={(e) =>
                        mudarOpcao(i, {
                          precos: o.precos.map((x, y) =>
                            y === k ? { ...x, tamanho: e.target.value } : x
                          ),
                        })
                      }
                      placeholder="Tamanho (P, M, G…)"
                      className={INPUT}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={p.preco}
                      onChange={(e) =>
                        mudarOpcao(i, {
                          precos: o.precos.map((x, y) => (y === k ? { ...x, preco: e.target.value } : x)),
                        })
                      }
                      placeholder="R$"
                      className={`${INPUT} max-w-28`}
                    />
                    <button
                      type="button"
                      onClick={() => mudarOpcao(i, { precos: o.precos.filter((_, y) => y !== k) })}
                      aria-label="Remover preço"
                      className="px-3 py-2 border-2 border-pomodoro/30 text-pomodoro hover:bg-pomodoro/5 rounded-lg font-bold text-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => mudarOpcao(i, { precos: [...o.precos, { tamanho: '', preco: '' }] })}
                  className="text-xs font-semibold text-carbono border-2 border-borda-suave rounded-lg px-2.5 py-1.5 hover:border-manjericao transition-colors"
                >
                  + Preço por tamanho
                </button>
              </div>
            )}
            {!o.variarPorTamanho && numero(o.precoBase) > 0 && (
              <p className="text-xs text-creme-muted">
                Cobra {formatarPreco(numero(o.precoBase))} em qualquer tamanho.
              </p>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setOpcoes([
              ...opcoes,
              { nome: '', precoBase: '0', variarPorTamanho: false, disponivel: true, precos: [] },
            ])
          }
          className="text-sm font-semibold text-carbono border-2 border-borda-suave rounded-lg px-3 py-2 hover:border-manjericao transition-colors"
        >
          + Adicionar opção
        </button>
      </fieldset>

      {erro && (
        <p role="alert" className="text-sm text-pomodoro bg-pomodoro/5 border border-pomodoro/20 rounded-lg p-3">
          {erro}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={salvar}
          disabled={pending}
          className="bg-manjericao hover:opacity-90 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all active:scale-[0.99]"
        >
          {pending ? 'Salvando...' : 'Salvar grupo'}
        </button>
        {grupo && (
          <button
            type="button"
            onClick={excluir}
            disabled={pending}
            className="px-4 py-2.5 border-2 border-pomodoro/30 text-pomodoro hover:bg-pomodoro/5 disabled:opacity-60 rounded-lg font-semibold text-sm transition-colors"
          >
            Excluir grupo
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

function Checkbox({
  rotulo,
  marcado,
  onMudar,
}: {
  rotulo: string;
  marcado: boolean;
  onMudar: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-carbono cursor-pointer">
      <input
        type="checkbox"
        checked={marcado}
        onChange={(e) => onMudar(e.target.checked)}
        className="h-4 w-4 accent-manjericao"
      />
      {rotulo}
    </label>
  );
}
