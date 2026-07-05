// src/types/gestao.ts
//
// Shapes do painel vêm de @pizzaorder/shared (src/painel.ts) — os mesmos da
// cozinha. A gestão vê TODOS os status ativos (inclusive pendente e em rota).

import type { PedidoPainel } from '@pizzaorder/shared';

export type PedidoGestao = PedidoPainel;

export { STATUS_ATIVOS, SELECT_PEDIDO_PAINEL } from '@pizzaorder/shared';

// ============================================================
// Linhas do CRUD do cardápio (leitura via service-role — inclui inativos)
// ============================================================

export type TipoCategoria = 'pizza' | 'bebida' | 'meia_meia' | 'outro';

export interface CategoriaRow {
  id: string;
  nome: string;
  tipo: TipoCategoria;
  ordem: number;
  ativo: boolean;
}

export interface VariacaoRow {
  id: string;
  tamanho: string | null;
  preco: number;
  disponivel: boolean;
}

export interface ProdutoRow {
  id: string;
  categoria_id: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  ordem: number;
  disponivel: boolean;
  variacoes_produto: VariacaoRow[];
}

export interface PrecoPorTamanhoRow {
  tamanho: string;
  preco: number;
}

export interface OpcaoRow {
  id: string;
  nome: string;
  preco_base: number;
  variar_por_tamanho: boolean;
  disponivel: boolean;
  ordem: number;
  precos_opcao_por_tamanho: PrecoPorTamanhoRow[];
}

export interface GrupoRow {
  id: string;
  categoria_id: string;
  nome: string;
  tipo: 'unica' | 'multipla';
  obrigatorio: boolean;
  min_selecoes: number;
  max_selecoes: number | null;
  ordem: number;
  ativo: boolean;
  opcoes_adicionais: OpcaoRow[];
}

export interface ComboRow {
  id: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  ordem: number;
  ativo: boolean;
  produto1_id: string;
  produto2_id: string;
}

export interface DestaqueRow {
  id: string;
  produto_id: string;
  ordem: number;
}
