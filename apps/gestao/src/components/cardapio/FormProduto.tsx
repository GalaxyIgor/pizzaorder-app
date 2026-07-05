'use client';

// src/components/cardapio/FormProduto.tsx
//
// Criar/editar produto com variações de tamanho/preço. A lista de variações
// enviada é o estado final — o server faz o diff (salvarProduto).

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { excluirProduto, salvarProduto } from '@/lib/actions/cardapio';
import type { CategoriaRow, ProdutoRow } from '@/types/gestao';

interface VariacaoStr {
  id?: string;
  tamanho: string;
  preco: string;
  disponivel: boolean;
}

function numero(s: string): number {
  const n = Number(s.trim().replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

export function FormProduto({
  slug,
  categorias,
  produto,
}: {
  slug: string;
  categorias: CategoriaRow[];
  produto: ProdutoRow | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const [nome, setNome] = useState(produto?.nome ?? '');
  const [descricao, setDescricao] = useState(produto?.descricao ?? '');
  const [imagemUrl, setImagemUrl] = useState(produto?.imagem_url ?? '');
  const [categoriaId, setCategoriaId] = useState(produto?.categoria_id ?? categorias[0]?.id ?? '');
  const [disponivel, setDisponivel] = useState(produto?.disponivel ?? true);
  const [variacoes, setVariacoes] = useState<VariacaoStr[]>(
    produto && produto.variacoes_produto.length > 0
      ? produto.variacoes_produto.map((v) => ({
          id: v.id,
          tamanho: v.tamanho ?? '',
          preco: String(v.preco),
          disponivel: v.disponivel,
        }))
      : [{ tamanho: '', preco: '', disponivel: true }]
  );

  const salvar = () => {
    setErro(null);
    for (const v of variacoes) {
      if (Number.isNaN(numero(v.preco))) {
        setErro('Preencha o preço de todas as variações.');
        return;
      }
    }
    startTransition(async () => {
      const r = await salvarProduto(slug, {
        id: produto?.id,
        categoria_id: categoriaId,
        nome,
        descricao: descricao || null,
        imagem_url: imagemUrl || null,
        disponivel,
        variacoes: variacoes.map((v) => ({
          id: v.id,
          tamanho: v.tamanho.trim() || null,
          preco: numero(v.preco),
          disponivel: v.disponivel,
        })),
      });
      if (r.erro) setErro(r.erro);
      else router.push(`/${slug}/cardapio`);
    });
  };

  const excluir = () => {
    setErro(null);
    startTransition(async () => {
      const r = await excluirProduto(slug, produto!.id);
      if (r.erro) setErro(r.erro);
      else router.push(`/${slug}/cardapio`);
    });
  };

  return (
    <section className="bg-white border border-borda-suave rounded-xl p-5 space-y-4 max-w-2xl">
      <h2 className="font-display text-xl font-bold text-carbono">
        {produto ? `Editar: ${produto.nome}` : 'Novo produto'}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo rotulo="Nome">
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} className={INPUT} />
        </Campo>
        <Campo rotulo="Categoria">
          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} className={INPUT}>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <Campo rotulo="Descrição (aparece no cardápio)">
        <textarea
          rows={2}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className={INPUT}
        />
      </Campo>

      <Campo rotulo="Imagem (URL) — opcional">
        <input
          type="url"
          value={imagemUrl}
          onChange={(e) => setImagemUrl(e.target.value)}
          placeholder="https://…/pizza.jpg"
          className={INPUT}
        />
      </Campo>
      {imagemUrl.trim() && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imagemUrl.trim()}
          alt="Prévia da imagem"
          className="h-20 w-20 rounded-lg object-cover border border-borda-suave"
        />
      )}

      <label className="flex items-center gap-2 text-sm font-medium text-carbono cursor-pointer">
        <input
          type="checkbox"
          checked={disponivel}
          onChange={(e) => setDisponivel(e.target.checked)}
          className="h-4 w-4 accent-manjericao"
        />
        À venda no cardápio
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-bold text-carbono uppercase tracking-wide">
          Tamanhos e preços
        </legend>
        <p className="text-xs text-creme-muted">
          Deixe o tamanho vazio para produto de preço único (ex.: refrigerante lata).
        </p>
        {variacoes.map((v, i) => (
          <div key={v.id ?? `nova-${i}`} className="flex gap-2 items-center">
            <input
              type="text"
              value={v.tamanho}
              onChange={(e) =>
                setVariacoes(variacoes.map((x, j) => (j === i ? { ...x, tamanho: e.target.value } : x)))
              }
              placeholder="Tamanho (P, M, G…)"
              className={INPUT}
            />
            <input
              type="text"
              inputMode="decimal"
              value={v.preco}
              onChange={(e) =>
                setVariacoes(variacoes.map((x, j) => (j === i ? { ...x, preco: e.target.value } : x)))
              }
              placeholder="R$"
              className={INPUT}
            />
            <label className="flex items-center gap-1.5 text-xs font-medium text-carbono whitespace-nowrap cursor-pointer">
              <input
                type="checkbox"
                checked={v.disponivel}
                onChange={(e) =>
                  setVariacoes(
                    variacoes.map((x, j) => (j === i ? { ...x, disponivel: e.target.checked } : x))
                  )
                }
                className="h-4 w-4 accent-manjericao"
              />
              à venda
            </label>
            <button
              type="button"
              onClick={() => setVariacoes(variacoes.filter((_, j) => j !== i))}
              disabled={variacoes.length === 1}
              aria-label="Remover variação"
              className="px-3 py-2 border-2 border-pomodoro/30 text-pomodoro hover:bg-pomodoro/5 disabled:opacity-30 rounded-lg font-bold text-sm"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setVariacoes([...variacoes, { tamanho: '', preco: '', disponivel: true }])}
          className="text-sm font-semibold text-carbono border-2 border-borda-suave rounded-lg px-3 py-2 hover:border-manjericao transition-colors"
        >
          + Adicionar tamanho
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
          className="bg-pomodoro hover:bg-pomodoro-hover disabled:opacity-60 text-white px-6 py-3 rounded-lg font-semibold transition-colors active:scale-[0.99]"
        >
          {pending ? 'Salvando...' : 'Salvar produto'}
        </button>
        {produto &&
          (confirmarExclusao ? (
            <button
              type="button"
              onClick={excluir}
              disabled={pending}
              className="px-4 py-3 bg-pomodoro/10 border-2 border-pomodoro text-pomodoro rounded-lg font-semibold text-sm"
            >
              Confirmar exclusão?
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmarExclusao(true)}
              disabled={pending}
              className="px-4 py-3 border-2 border-pomodoro/30 text-pomodoro hover:bg-pomodoro/5 rounded-lg font-semibold text-sm transition-colors"
            >
              Excluir produto
            </button>
          ))}
        <button
          type="button"
          onClick={() => router.push(`/${slug}/cardapio`)}
          disabled={pending}
          className="px-4 py-3 border-2 border-borda-suave text-carbono hover:bg-massa-bg rounded-lg font-semibold text-sm transition-colors"
        >
          Voltar
        </button>
      </div>
    </section>
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
