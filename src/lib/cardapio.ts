// src/lib/cardapio.ts
//
// Helpers puros para derivar dados do cardápio (sem estado).

import type { Categoria, ConfigMeiaMeia, GrupoAdicional, OpcaoAdicional, Produto, Tamanho, TipoCategoria, VariacaoProduto } from '@/types/cardapio';

/** Formata um valor em Reais (pt-BR). */
export function formatarPreco(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Menor preço entre as variações de um produto — usado nos cards ("a partir de") */
export function menorPreco(produto: Produto): number {
  const disponiveis = produto.variacoes_produto.filter((v) => v.disponivel);
  if (disponiveis.length === 0) return 0;
  return Math.min(...disponiveis.map((v) => v.preco));
}

/** Primeira variação disponível de um produto (ou undefined se nenhuma estiver disponível). */
export function variacaoDisponivel(produto: Produto): VariacaoProduto | undefined {
  return produto.variacoes_produto.find((v) => v.disponivel);
}

/** Aplica a estratégia de preço do meia-meia configurada pelo tenant sobre os preços das duas metades. */
export function aplicarEstrategiaMeiaMeia(preco1: number, preco2: number, config: ConfigMeiaMeia): number {
  switch (config.estrategia) {
    case 'maior':
      return Math.max(preco1, preco2);
    case 'menor':
      return Math.min(preco1, preco2);
    case 'media':
      return (preco1 + preco2) / 2;
    case 'fixo':
      return config.precoFixo ?? Math.max(preco1, preco2);
  }
}

/** Preço de um meia-meia a partir das duas pizzas escolhidas (menor preço de cada uma). */
export function precoMeiaMeia(pizza1: Produto, pizza2: Produto, config: ConfigMeiaMeia): number {
  return aplicarEstrategiaMeiaMeia(menorPreco(pizza1), menorPreco(pizza2), config);
}

/** Tamanhos disponíveis nas duas metades ao mesmo tempo (na ordem das variações da pizza 1). */
export function tamanhosComunsMeiaMeia(pizza1: Produto, pizza2: Produto): Tamanho[] {
  const doLado2 = new Set(
    pizza2.variacoes_produto
      .filter((v) => v.disponivel && v.tamanho != null)
      .map((v) => v.tamanho as Tamanho)
  );
  return pizza1.variacoes_produto
    .filter((v) => v.disponivel && v.tamanho != null && doLado2.has(v.tamanho))
    .map((v) => v.tamanho as Tamanho);
}

/** Preço do meia-meia em um tamanho específico (metade sem o tamanho cai no menor preço dela). */
export function precoMeiaMeiaPorTamanho(
  pizza1: Produto,
  pizza2: Produto,
  tamanho: Tamanho | null,
  config: ConfigMeiaMeia
): number {
  const precoDe = (p: Produto) => {
    const variacao =
      tamanho != null
        ? p.variacoes_produto.find((v) => v.disponivel && v.tamanho === tamanho)
        : undefined;
    return variacao?.preco ?? menorPreco(p);
  };
  return aplicarEstrategiaMeiaMeia(precoDe(pizza1), precoDe(pizza2), config);
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

/** Produto exige passo de personalização (escolher tamanho e/ou adicionais)? */
export function precisaPersonalizar(produto: Produto, grupos: GrupoAdicional[]): boolean {
  return temMultiplosTamanhos(produto) || gruposPorCategoria(grupos, produto.categoria_id).length > 0;
}

/** Produtos de uma categoria específica, ordenados */
export function produtosPorCategoria(produtos: Produto[], categoriaId: string): Produto[] {
  return produtos
    .filter((p) => p.categoria_id === categoriaId)
    .sort((a, b) => a.ordem - b.ordem);
}

/** Produtos cuja categoria é de um tipo específico (ex.: todas as pizzas, independente da categoria exata) */
export function produtosPorTipo(produtos: Produto[], categorias: Categoria[], tipo: TipoCategoria): Produto[] {
  const idsDoTipo = new Set(categorias.filter((c) => c.tipo === tipo).map((c) => c.id));
  return produtos.filter((p) => idsDoTipo.has(p.categoria_id));
}
