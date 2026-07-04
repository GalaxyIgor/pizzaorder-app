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
        setErro(`"${grupo.nome}": máximo de ${grupo.max_selecoes} opção(ões).`);
        return prev;
      }
      return { ...prev, [grupo.id]: [...atual, opcaoId] };
    });
  };

  const handleAdicionar = () => {
    for (const g of grupos) {
      const qtd = (selecoes[g.id] ?? []).length;
      if ((g.obrigatorio || g.min_selecoes > 0) && qtd < g.min_selecoes) {
        setErro(`Escolha ${g.min_selecoes} opção(ões) em "${g.nome}".`);
        return;
      }
      if (g.max_selecoes != null && qtd > g.max_selecoes) {
        setErro(`"${g.nome}": máximo de ${g.max_selecoes} opção(ões).`);
        return;
      }
    }
    if (!opcaoTamanho) return;

    for (let i = 0; i < quantidade; i++) {
      addMeiaMeiaPersonalizado(produto1, produto2, opcaoTamanho.tamanho, opcaoTamanho.preco, adicionais);
    }
    onClose();
  };

  const rotuloPreco = (preco: number) => (preco > 0 ? `+ ${formatarPreco(preco)}` : 'Grátis');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-lg max-w-lg w-full max-h-[92dvh] sm:max-h-[85dvh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-borda-suave p-4 flex justify-between items-center">
          <h2 className="font-display text-xl font-bold text-carbono">Pizza Meia a Meia</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-2xl text-creme-muted hover:text-carbono transition-colors"
          >
            ✕
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
                  className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white ${
                    side === 1 ? 'bg-ouro' : 'bg-pomodoro'
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
                      onClick={() => {
                        setTamanhoSel(opcao.tamanho);
                        setErro(null);
                      }}
                      className={`w-full flex items-center justify-between gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        selecionado ? 'border-ouro bg-ouro/5' : 'border-borda-suave hover:border-ouro/60'
                      }`}
                    >
                      <span className="flex items-center gap-2 text-carbono font-medium">
                        <span
                          className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                            selecionado ? 'border-ouro bg-ouro' : 'border-borda-suave'
                          }`}
                        />
                        {opcao.tamanho ?? 'Único'}
                      </span>
                      <span className="font-display font-bold text-pomodoro">{formatarPreco(opcao.preco)}</span>
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
                        className={`w-full flex items-center justify-between gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                          selecionado ? 'border-ouro bg-ouro/5' : 'border-borda-suave hover:border-ouro/60'
                        }`}
                      >
                        <span className="flex items-center gap-2 text-carbono font-medium">
                          <span
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
                className="w-8 h-8 rounded-full border border-borda-suave text-carbono font-bold flex items-center justify-center hover:bg-massa-bg"
              >
                −
              </button>
              <span className="w-6 text-center font-semibold text-carbono">{quantidade}</span>
              <button
                type="button"
                onClick={() => setQuantidade((q) => q + 1)}
                aria-label="Aumentar quantidade"
                className="w-8 h-8 rounded-full bg-pomodoro text-white font-bold flex items-center justify-center hover:bg-pomodoro-hover"
              >
                +
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-20 bg-white border-t border-borda-suave p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2">
          {erro && <p className="text-pomodoro text-sm text-center">{erro}</p>}
          <button
            type="button"
            onClick={handleAdicionar}
            className="w-full bg-pomodoro hover:bg-pomodoro-hover text-white font-semibold p-3 rounded-lg flex justify-between items-center transition-colors active:scale-[0.99]"
          >
            <span>Adicionar ao carrinho</span>
            <span>{formatarPreco(total)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
