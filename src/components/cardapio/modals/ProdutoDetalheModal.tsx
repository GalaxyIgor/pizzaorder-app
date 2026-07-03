'use client';

// src/components/cardapio/modals/ProdutoDetalheModal.tsx
//
// Passo de personalização de um produto: escolher tamanho e adicionais/borda,
// com preço recalculado ao vivo e validação dos grupos obrigatórios.
// Montado com key={produto.id} pelo provider, então o estado inicial reflete o produto.

import { useMemo, useState } from 'react';
import Image from 'next/image';
import type { GrupoAdicional, Produto } from '@/types/cardapio';
import type { CartItemAdicional } from '@/types/carrinho';
import { formatarPreco, precoOpcaoAdicional } from '@/lib/cardapio';
import { useCart } from '@/contexts/CartContext';

interface ProdutoDetalheModalProps {
  produto: Produto;
  grupos: GrupoAdicional[]; // já filtrados para a categoria do produto e ordenados
  onClose: () => void;
}

export function ProdutoDetalheModal({ produto, grupos, onClose }: ProdutoDetalheModalProps) {
  const { addProdutoPersonalizado } = useCart();

  const variacoes = produto.variacoes_produto.filter((v) => v.disponivel);

  const [variacaoId, setVariacaoId] = useState<string>(() => variacoes[0]?.id ?? '');
  // seleções por grupo: grupoId -> lista de opcaoId
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

  const variacao = variacoes.find((v) => v.id === variacaoId) ?? variacoes[0];
  const tamanho = variacao?.tamanho ?? null;

  // Adicionais escolhidos (com preço já resolvido pelo tamanho atual)
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
            preco: precoOpcaoAdicional(opcao, tamanho),
          });
        }
      }
    }
    return lista;
  }, [grupos, selecoes, tamanho]);

  const precoUnit = (variacao?.preco ?? 0) + adicionais.reduce((acc, a) => acc + a.preco, 0);
  const total = precoUnit * quantidade;

  const toggleOpcao = (grupo: GrupoAdicional, opcaoId: string) => {
    setErro(null);
    setSelecoes((prev) => {
      const atual = prev[grupo.id] ?? [];
      if (grupo.tipo === 'unica') {
        return { ...prev, [grupo.id]: [opcaoId] };
      }
      // múltipla: alterna respeitando max_selecoes
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
    // valida min/max de cada grupo
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
    if (!variacao) return;

    for (let i = 0; i < quantidade; i++) {
      addProdutoPersonalizado(produto, variacao, adicionais);
    }
    onClose();
  };

  const rotuloPreco = (preco: number) => (preco > 0 ? `+ ${formatarPreco(preco)}` : 'Grátis');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-borda-suave p-4 flex justify-between items-center">
          <h2 className="font-display text-xl font-bold text-carbono">{produto.nome}</h2>
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
          {/* Foto + descrição */}
          <div className="flex gap-4">
            <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-massa-bg">
              {produto.imagem_url ? (
                <Image src={produto.imagem_url} alt={produto.nome} fill sizes="96px" className="object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-ouro/20 to-pomodoro/20 flex items-center justify-center">
                  <span className="text-3xl">🍕</span>
                </div>
              )}
            </div>
            {produto.descricao && (
              <p className="text-sm text-creme-muted leading-relaxed flex-1">{produto.descricao}</p>
            )}
          </div>

          {/* Tamanho */}
          {variacoes.length > 1 && (
            <section>
              <h3 className="font-display font-semibold text-carbono mb-2">Tamanho</h3>
              <div className="space-y-2">
                {variacoes.map((v) => {
                  const selecionado = v.id === variacaoId;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setVariacaoId(v.id);
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
                        {v.tamanho ?? 'Único'}
                      </span>
                      <span className="font-display font-bold text-pomodoro">{formatarPreco(v.preco)}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Grupos de adicionais */}
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
                    const preco = precoOpcaoAdicional(opcao, tamanho);
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
        <div className="sticky bottom-0 z-20 bg-white border-t border-borda-suave p-4 space-y-2">
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
