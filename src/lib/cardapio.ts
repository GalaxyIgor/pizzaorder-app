// src/lib/cardapio.ts
//
// Helpers puros para derivar dados do cardápio (sem estado).

import type { GrupoAdicional, OpcaoAdicional, Produto, Tamanho } from '@/types/cardapio';

/** Menor preço entre as variações de um produto — usado nos cards ("a partir de") */
export function menorPreco(produto: Produto): number {
  const disponiveis = produto.variacoes_produto.filter((v) => v.disponivel);
  if (disponiveis.length === 0) return 0;
  return Math.min(...disponiveis.map((v) => v.preco));
}

/** Produto tem mais de uma variação de tamanho (precisa mostrar passo "escolher tamanho") */
export function temMultiplosTamanhos(produto: Produto): boolean {
  return produto.variacoes_produto.filter((v) => v.disponivel).length > 1;
}

/** Preço de uma opção de adicional para um tamanho específico */
export function precoOpcaoAdicional(opcao: OpcaoAdicional, tamanho: Tamanho | null): number {
  if (!opcao.variar_por_tamanho || !tamanho) return opcao.preco_base;
  const encontrado = opcao.precos_opcao_por_tamanho.find((p) => p.tamanho === tamanho);
  return encontrado?.preco ?? opcao.preco_base;
}

/** Grupos de adicionais aplicáveis a uma categoria específica */
export function gruposPorCategoria(
  grupos: GrupoAdicional[],
  categoriaId: string
): GrupoAdicional[] {
  return grupos
    .filter((g) => g.categoria_id === categoriaId)
    .sort((a, b) => a.ordem - b.ordem);
}

/** Produtos de uma categoria específica, ordenados */
export function produtosPorCategoria(produtos: Produto[], categoriaId: string): Produto[] {
  return produtos
    .filter((p) => p.categoria_id === categoriaId)
    .sort((a, b) => a.ordem - b.ordem);
}
