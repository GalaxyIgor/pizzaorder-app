'use client';

// src/components/cardapio/modals/MeiaMeiaDetalheModal.tsx
//
// Passo de personalização de um meia-meia: escolher o tamanho (comum às duas
// metades) e borda/adicionais, com preço recalculado ao vivo pela estratégia
// do tenant. Montado com key derivada dos dois sabores pelo provider.

import { useMemo, useState } from 'react';
import type { GrupoAdicional, Produto, Tamanho } from '@/types/cardapio';
import type { CartItemAdicional } from '@/types/carrinho';
import {
  formatarPreco,
  precoMeiaMeia,
  precoMeiaMeiaPorTamanho,
  precoOpcaoAdicional,
  tamanhosComunsMeiaMeia,
} from '@/lib/cardapio';
import { useCardapio } from '@/contexts/CardapioContext';
import { useCart } from '@/contexts/CartContext';
import { useDialog } from '@/hooks/useDialog';

interface MeiaMeiaDetalheModalProps {
  produto1: Produto;
  produto2: Produto;
  grupos: GrupoAdicional[]; // já filtrados para as categorias das metades e ordenados
  onClose: () => void;
}

export function MeiaMeiaDetalheModal({ produto1, produto2, grupos, onClose }: MeiaMeiaDetalheModalProps) {
  const { pizzaria } = useCardapio();
  const { addMeiaMeiaPersonalizado } = useCart();
  const config = pizzaria.config_meia_meia;

  // Tamanhos disponíveis nas duas metades; sem tamanho comum, vira opção única
  // com o preço padrão (menor preço de cada metade).
  const opcoesTamanho = useMemo(() => {
    const tamanhos = tamanhosComunsMeiaMeia(produto1, produto2);
    if (tamanhos.length === 0) {
      return [{ tamanho: null as Tamanho | null, preco: precoMeiaMeia(produto1, produto2, config) }];
    }
    return tamanhos.map((tamanho) => ({
      tamanho: tamanho as Tamanho | null,
      preco: precoMeiaMeiaPorTamanho(produto1, produto2, tamanho, config),
    }));
  }, [produto1, produto2, config]);

  const [tamanhoSel, setTamanhoSel] = useState<Tamanho | null>(() => opcoesTamanho[0]?.tamanho ?? null);
  const [selecoes, setSelecoes] = useState<Record<string, string[]>>(() => {
    const inicial: Record<string, string[]> = {};
    for (const g of grupos) {
      const disp = g.opcoes_adicionais.filter((o) => o.disponivel);
      inicial[g.id] = g.tipo === 'unica' && g.obrigatorio && disp[0] ? [disp[0].id] : [];
    }
    return inicial;
  });
  const [quantidade, setQuantidade] = useState(1);
  const [erro, setErro] = useState<string | null>(null);
  const painelRef = useDialog<HTMLDivElement>(true, onClose);

  const opcaoTamanho = opcoesTamanho.find((o) => o.tamanho === tamanhoSel) ?? opcoesTamanho[0];

  const adicionais = useMemo<CartItemAdicional[]>(() => {
    const lista: CartItemAdicional[] = [];
    for (const g of grupos) {
      for (const opcaoId of selecoes[g.id] ?? []) {
        const opcao = g.opcoes_adicionais.find((o) => o.id === opcaoId);
        if (opcao) {
          lista.push({
            grupoId: g.id,
            opcaoId: opcao.id,
            nome: opcao.nome,
            preco: precoOpcaoAdicional(opcao, opcaoTamanho?.tamanho ?? null),
          });
        }
      }
    }
    return lista;
  }, [grupos, selecoes, opcaoTamanho]);

  const precoUnit = (opcaoTamanho?.preco ?? 0) + adicionais.reduce((acc, a) => acc + a.preco, 0);
  const total = precoUnit * quantidade;

  const toggleOpcao = (grupo: GrupoAdicional, opcaoId: string) => {
    setErro(null);
    setSelecoes((prev) => {
      const atual = prev[grupo.id] ?? [];
      if (grupo.tipo === 'unica') {
        return { ...prev, [grupo.id]: [opcaoId] };
      }
      if (atual.includes(opcaoId)) {
        return { ...prev, [grupo.id]: atual.filter((id) => id !== opcaoId) };
      }
      if (grupo.max_selecoes != null && atual.length >= grupo.max_selecoes) {
        setErro(`Em "${grupo.nome}" dá para escolher até ${plural(grupo.max_selecoes)}.`);
        return prev;
      }
      return { ...prev, [grupo.id]: [...atual, opcaoId] };
    });
  };

  const handleAdicionar = () => {
    for (const g of grupos) {
      const qtd = (selecoes[g.id] ?? []).length;
      if ((g.obrigatorio || g.min_selecoes > 0) && qtd < g.min_selecoes) {
        setErro(`Escolha ${plural(g.min_selecoes)} em "${g.nome}".`);
        return;
      }
      if (g.max_selecoes != null && qtd > g.max_selecoes) {
        setErro(`Em "${g.nome}" dá para escolher até ${plural(g.max_selecoes)}.`);
        return;
      }
    }
    if (!opcaoTamanho) return;

    for (let i = 0; i < quantidade; i++) {
      addMeiaMeiaPersonalizado(produto1, produto2, opcaoTamanho.tamanho, opcaoTamanho.preco, adicionais);
    }
    onClose();
  };

  const plural = (n: number) => `${n} ${n === 1 ? 'opção' : 'opções'}`;
  const rotuloPreco = (preco: number) => (preco > 0 ? `+ ${formatarPreco(preco)}` : 'Grátis');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="meia-meia-detalhe-titulo"
        className="relative bg-white rounded-t-2xl sm:rounded-lg max-w-lg w-full max-h-[92dvh] sm:max-h-[85dvh] overflow-y-auto overscroll-contain"
      >
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-borda-suave p-4 flex justify-between items-center">
          <h2 id="meia-meia-detalhe-titulo" className="font-display text-xl font-bold text-carbono">Pizza Meia a Meia</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-11 h-11 -mr-2 flex-shrink-0 flex items-center justify-center rounded-full text-2xl text-creme-muted hover:text-carbono hover:bg-massa-bg transition-colors"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* As duas metades */}
          <div className="space-y-2">
            {[
              { side: 1, produto: produto1 },
              { side: 2, produto: produto2 },
            ].map(({ side, produto }) => (
              <div
                key={side}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 ${
                  side === 1 ? 'border-ouro/50 bg-ouro/5' : 'border-pomodoro/50 bg-pomodoro/5'
                }`}
              >
                <span
                  className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    side === 1 ? 'bg-ouro text-carbono' : 'bg-pomodoro text-white'
                  }`}
                >
                  Lado {side}
                </span>
                <span className="font-display font-semibold text-carbono text-sm truncate">
                  {produto.nome}
                </span>
              </div>
            ))}
          </div>

          {/* Tamanho (só quando há mais de um em comum) */}
          {opcoesTamanho.length > 1 && (
            <section>
              <h3 className="font-display font-semibold text-carbono mb-2">Tamanho</h3>
              <div className="space-y-2">
                {opcoesTamanho.map((opcao) => {
                  const selecionado = opcao.tamanho === tamanhoSel;
                  return (
                    <button
                      key={String(opcao.tamanho)}
                      type="button"
                      aria-pressed={selecionado}
                      onClick={() => {
                        setTamanhoSel(opcao.tamanho);
                        setErro(null);
                      }}
                      className={`w-full flex items-center justify-between gap-3 p-3 rounded-lg border-2 transition cursor-pointer ${
                        selecionado ? 'border-ouro bg-ouro/5' : 'border-borda-suave hover:border-ouro/60'
                      }`}
                    >
                      <span className="flex items-center gap-2 text-carbono font-medium">
                        <span
                          aria-hidden="true"
                          className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                            selecionado ? 'border-ouro bg-ouro' : 'border-borda-suave'
                          }`}
                        />
                        {opcao.tamanho ?? 'Único'}
                      </span>
                      <span className="font-display font-bold text-pomodoro tabular-nums">{formatarPreco(opcao.preco)}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Grupos de adicionais (borda etc.) */}
          {grupos.map((grupo) => {
            const opcoes = grupo.opcoes_adicionais
              .filter((o) => o.disponivel)
              .sort((a, b) => a.ordem - b.ordem);
            const selecionadas = selecoes[grupo.id] ?? [];
            return (
              <section key={grupo.id}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-display font-semibold text-carbono">{grupo.nome}</h3>
                  {grupo.obrigatorio && (
                    <span className="bg-pomodoro/10 text-pomodoro text-xs font-semibold px-2 py-0.5 rounded-full">
                      obrigatório
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {opcoes.map((opcao) => {
                    const selecionado = selecionadas.includes(opcao.id);
                    const preco = precoOpcaoAdicional(opcao, opcaoTamanho?.tamanho ?? null);
                    return (
                      <button
                        key={opcao.id}
                        type="button"
                        onClick={() => toggleOpcao(grupo, opcao.id)}
                        aria-pressed={selecionado}
                        className={`w-full flex items-center justify-between gap-3 p-3 rounded-lg border-2 transition cursor-pointer ${
                          selecionado ? 'border-ouro bg-ouro/5' : 'border-borda-suave hover:border-ouro/60'
                        }`}
                      >
                        <span className="flex items-center gap-2 text-carbono font-medium">
                          <span
                            aria-hidden="true"
                            className={`w-4 h-4 flex-shrink-0 border-2 flex items-center justify-center text-[10px] text-white ${
                              grupo.tipo === 'unica' ? 'rounded-full' : 'rounded'
                            } ${selecionado ? 'border-ouro bg-ouro' : 'border-borda-suave'}`}
                          >
                            {selecionado && grupo.tipo === 'multipla' ? '✓' : ''}
                          </span>
                          {opcao.nome}
                        </span>
                        <span className={`text-sm font-semibold ${preco > 0 ? 'text-pomodoro' : 'text-creme-muted'}`}>
                          {rotuloPreco(preco)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {/* Quantidade */}
          <section className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-carbono">Quantidade</h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                aria-label="Diminuir quantidade"
                className="w-10 h-10 rounded-full border border-borda-suave text-lg text-carbono font-bold flex items-center justify-center hover:bg-massa-bg"
              >
                <span aria-hidden="true">−</span>
              </button>
              <span aria-live="polite" className="w-6 text-center font-semibold text-carbono tabular-nums">{quantidade}</span>
              <button
                type="button"
                onClick={() => setQuantidade((q) => q + 1)}
                aria-label="Aumentar quantidade"
                className="w-10 h-10 rounded-full bg-pomodoro text-lg text-white font-bold flex items-center justify-center hover:bg-pomodoro-hover"
              >
                +
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-20 bg-white border-t border-borda-suave p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2">
          {erro && <p role="alert" className="text-pomodoro text-sm text-center">{erro}</p>}
          <button
            type="button"
            onClick={handleAdicionar}
            className="w-full bg-pomodoro hover:bg-pomodoro-hover text-white font-semibold p-3 rounded-lg flex justify-between items-center transition-colors active:scale-[0.99]"
          >
            <span>Adicionar à sacola</span>
            <span className="tabular-nums">{formatarPreco(total)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
