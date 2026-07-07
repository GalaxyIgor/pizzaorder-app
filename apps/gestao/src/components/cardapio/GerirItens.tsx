'use client';

// src/components/cardapio/GerirItens.tsx
//
// Categorias + produtos: criar/editar categoria (dialog), reordenar por ▲▼,
// toggle rápido de disponibilidade e atalhos para o form de produto.
// As actions revalidam a rota — o Next atualiza os dados sozinho.

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { formatarPreco } from '@pizzaorder/shared';
import {
  alternarDisponibilidade,
  excluirCategoria,
  reordenarCategorias,
  reordenarProdutos,
  salvarCategoria,
  type CategoriaInput,
} from '@/lib/actions/cardapio';
import type { CategoriaRow, ProdutoRow, TipoCategoria } from '@/types/gestao';
import { Overlay } from '@/components/AceitarDialog';

const TIPO_LABEL: Record<TipoCategoria, string> = {
  pizza: 'Pizza',
  bebida: 'Bebida',
  meia_meia: 'Meia-meia',
  sobremesa: 'Sobremesa',
  outro: 'Outro',
};

function mover<T>(lista: T[], de: number, para: number): T[] {
  const copia = [...lista];
  const [item] = copia.splice(de, 1);
  copia.splice(para, 0, item);
  return copia;
}

function faixaDePreco(produto: ProdutoRow): string {
  const precos = produto.variacoes_produto.map((v) => Number(v.preco));
  if (precos.length === 0) return '—';
  const min = Math.min(...precos);
  const max = Math.max(...precos);
  return min === max ? formatarPreco(min) : `${formatarPreco(min)} – ${formatarPreco(max)}`;
}

export function GerirItens({
  slug,
  categorias,
  produtos,
}: {
  slug: string;
  categorias: CategoriaRow[];
  produtos: ProdutoRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<CategoriaRow | 'nova' | null>(null);

  const rodar = (acao: () => Promise<{ erro?: string }>) => {
    setErro(null);
    startTransition(async () => {
      const r = await acao();
      if (r.erro) setErro(r.erro);
    });
  };

  const moverCategoria = (i: number, delta: -1 | 1) => {
    const nova = mover(categorias, i, i + delta);
    rodar(() => reordenarCategorias(slug, nova.map((c) => c.id)));
  };

  const moverProduto = (categoriaId: string, lista: ProdutoRow[], i: number, delta: -1 | 1) => {
    const nova = mover(lista, i, i + delta);
    rodar(() => reordenarProdutos(slug, categoriaId, nova.map((p) => p.id)));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <button
          type="button"
          onClick={() => setDialogo('nova')}
          className="text-sm font-semibold text-carbono border-2 border-borda-suave rounded-lg px-3 py-2 hover:border-manjericao transition-colors"
        >
          + Nova categoria
        </button>
        <Link
          href={`/${slug}/cardapio/produtos/novo`}
          className="bg-pomodoro hover:bg-pomodoro-hover text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
        >
          + Novo produto
        </Link>
      </div>

      {erro && (
        <p role="alert" className="text-sm text-pomodoro bg-pomodoro/5 border border-pomodoro/20 rounded-lg p-3">
          {erro}
        </p>
      )}

      {categorias.length === 0 && (
        <p className="text-sm text-creme-muted text-center py-8">
          Nenhuma categoria ainda — comece criando uma.
        </p>
      )}

      {categorias.map((cat, i) => {
        const doGrupo = produtos.filter((p) => p.categoria_id === cat.id);
        return (
          <section key={cat.id} className="bg-white border border-borda-suave rounded-xl">
            <header className="flex items-center gap-2 p-3 border-b border-borda-suave">
              <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-bold text-carbono truncate">{cat.nome}</h2>
                <span className="text-xs text-creme-muted bg-borda-suave/60 rounded-full px-2 py-0.5">
                  {TIPO_LABEL[cat.tipo]}
                </span>
                {!cat.ativo && (
                  <span className="text-xs font-semibold text-pomodoro bg-pomodoro/10 rounded-full px-2 py-0.5">
                    Inativa
                  </span>
                )}
              </div>
              <BotaoOrdem
                subir={() => moverCategoria(i, -1)}
                descer={() => moverCategoria(i, 1)}
                primeiro={i === 0}
                ultimo={i === categorias.length - 1}
                pending={pending}
              />
              <button
                type="button"
                onClick={() => setDialogo(cat)}
                className="text-xs font-semibold text-carbono border-2 border-borda-suave rounded-lg px-2.5 py-1.5 hover:border-manjericao transition-colors"
              >
                Editar
              </button>
            </header>

            {doGrupo.length === 0 ? (
              <p className="text-sm text-creme-muted p-3">Nenhum produto nesta categoria.</p>
            ) : (
              <ul className="divide-y divide-borda-suave">
                {doGrupo.map((p, j) => (
                  <li key={p.id} className="flex items-center gap-2 p-3">
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm truncate ${p.disponivel ? 'text-carbono' : 'text-creme-muted line-through'}`}>
                        {p.nome}
                      </p>
                      <p className="text-xs text-creme-muted">
                        {faixaDePreco(p)}
                        {p.variacoes_produto.length > 1 ? ` · ${p.variacoes_produto.length} tamanhos` : ''}
                      </p>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-carbono cursor-pointer">
                      <input
                        type="checkbox"
                        checked={p.disponivel}
                        disabled={pending}
                        onChange={(e) =>
                          rodar(() => alternarDisponibilidade(slug, 'produtos', p.id, e.target.checked))
                        }
                        className="h-4 w-4 accent-manjericao"
                      />
                      à venda
                    </label>
                    <BotaoOrdem
                      subir={() => moverProduto(cat.id, doGrupo, j, -1)}
                      descer={() => moverProduto(cat.id, doGrupo, j, 1)}
                      primeiro={j === 0}
                      ultimo={j === doGrupo.length - 1}
                      pending={pending}
                    />
                    <Link
                      href={`/${slug}/cardapio/produtos/${p.id}`}
                      className="text-xs font-semibold text-carbono border-2 border-borda-suave rounded-lg px-2.5 py-1.5 hover:border-manjericao transition-colors"
                    >
                      Editar
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {dialogo && (
        <CategoriaDialog
          slug={slug}
          categoria={dialogo === 'nova' ? null : dialogo}
          onFechar={() => setDialogo(null)}
        />
      )}
    </div>
  );
}

function BotaoOrdem({
  subir,
  descer,
  primeiro,
  ultimo,
  pending,
}: {
  subir: () => void;
  descer: () => void;
  primeiro: boolean;
  ultimo: boolean;
  pending: boolean;
}) {
  const cls =
    'px-2 py-1 border border-borda-suave rounded text-xs text-carbono hover:border-manjericao disabled:opacity-30 transition-colors';
  return (
    <span className="flex gap-1">
      <button type="button" aria-label="Subir" onClick={subir} disabled={primeiro || pending} className={cls}>
        ▲
      </button>
      <button type="button" aria-label="Descer" onClick={descer} disabled={ultimo || pending} className={cls}>
        ▼
      </button>
    </span>
  );
}

function CategoriaDialog({
  slug,
  categoria,
  onFechar,
}: {
  slug: string;
  categoria: CategoriaRow | null;
  onFechar: () => void;
}) {
  const [nome, setNome] = useState(categoria?.nome ?? '');
  const [tipo, setTipo] = useState<TipoCategoria>(categoria?.tipo ?? 'pizza');
  const [ativo, setAtivo] = useState(categoria?.ativo ?? true);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submeter = (acao: () => Promise<{ erro?: string }>) => {
    setErro(null);
    startTransition(async () => {
      const r = await acao();
      if (r.erro) setErro(r.erro);
      else onFechar();
    });
  };

  const input: CategoriaInput = { id: categoria?.id, nome, tipo, ativo };

  return (
    <Overlay onFechar={onFechar}>
      <h3 className="font-display text-xl font-bold text-carbono">
        {categoria ? 'Editar categoria' : 'Nova categoria'}
      </h3>

      <label className="block">
        <span className="block text-sm font-medium text-carbono mb-1">Nome</span>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Pizzas salgadas"
          className="w-full border border-borda-suave rounded-lg p-3 text-sm bg-massa-bg focus:outline-none focus:ring-2 focus:ring-pomodoro/40"
        />
      </label>

      <label className="block">
        <span className="block text-sm font-medium text-carbono mb-1">Tipo</span>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoCategoria)}
          className="w-full border border-borda-suave rounded-lg p-3 text-sm bg-massa-bg"
        >
          {(Object.keys(TIPO_LABEL) as TipoCategoria[]).map((t) => (
            <option key={t} value={t}>
              {TIPO_LABEL[t]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm font-medium text-carbono cursor-pointer">
        <input
          type="checkbox"
          checked={ativo}
          onChange={(e) => setAtivo(e.target.checked)}
          className="h-4 w-4 accent-manjericao"
        />
        Visível no cardápio
      </label>

      {erro && (
        <p role="alert" className="text-sm text-pomodoro bg-pomodoro/5 border border-pomodoro/20 rounded-lg p-2">
          {erro}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          disabled={pending}
          onClick={() => submeter(() => salvarCategoria(slug, input))}
          className="flex-1 bg-manjericao hover:opacity-90 disabled:opacity-60 text-white p-3 rounded-lg font-semibold text-sm transition-all active:scale-[0.99]"
        >
          {pending ? 'Salvando...' : 'Salvar'}
        </button>
        {categoria && (
          <button
            type="button"
            disabled={pending}
            onClick={() => submeter(() => excluirCategoria(slug, categoria.id))}
            className="px-4 border-2 border-pomodoro/30 text-pomodoro hover:bg-pomodoro/5 disabled:opacity-60 rounded-lg font-semibold text-sm transition-colors"
          >
            Excluir
          </button>
        )}
        <button
          type="button"
          onClick={onFechar}
          disabled={pending}
          className="px-4 border-2 border-borda-suave text-carbono hover:bg-massa-bg rounded-lg font-semibold text-sm transition-colors"
        >
          Voltar
        </button>
      </div>
    </Overlay>
  );
}
