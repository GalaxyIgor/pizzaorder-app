// src/types/cardapio.ts
//
// Fonte única de verdade para os tipos do cardápio.
// Espelha exatamente o que a Route Handler /api/cardapio/[slug] retorna,
// que por sua vez espelha exatamente o schema do Supabase (snake_case).

// ============================================================
// TAMANHOS
// ============================================================

export type Tamanho = 'P' | 'M' | 'G' | 'GG' | '600ml' | '2L' | string;

// ============================================================
// PIZZARIA (configuração do tenant)
// ============================================================

// Tipos de configuração movidos para @pizzaorder/shared (src/pizzaria.ts) —
// a gestão edita os mesmos shapes que o cardápio calcula. Re-export mantém
// os imports existentes deste arquivo funcionando.
export type {
  EstrategiaMeiaMeia,
  ConfigMeiaMeia,
  TipoFrete,
  FaixaKm,
  BairroFrete,
  ConfigFrete,
  TipoTaxaServico,
  ConfigTaxaServico,
  FaixaHorario,
  HorarioFuncionamento,
} from '@pizzaorder/shared';

import type {
  ConfigFrete,
  ConfigMeiaMeia,
  ConfigTaxaServico,
  HorarioFuncionamento,
} from '@pizzaorder/shared';

export interface Pizzaria {
  id: string;
  nome: string;
  slug: string;
  logo_url: string | null;
  cor_primaria: string;
  config_meia_meia: ConfigMeiaMeia;
  config_frete: ConfigFrete;
  config_taxa_servico: ConfigTaxaServico | null;
  pedido_minimo: number | null;
  aceita_retirada: boolean;
  aceita_entrega: boolean;
  aceita_local: boolean;
  /** Staff pausou novos pedidos (o cardápio avisa e o checkout bloqueia). */
  pedidos_pausados: boolean;
  /** Horário de funcionamento (null = sempre aberto). Ver estaAberto() no shared. */
  horario_funcionamento: HorarioFuncionamento | null;
}

// ============================================================
// CATEGORIA
// ============================================================

export type TipoCategoria = 'pizza' | 'bebida' | 'meia_meia' | 'sobremesa' | 'outro';

export interface Categoria {
  id: string;
  nome: string;
  tipo: TipoCategoria;
  ordem: number;
}

// ============================================================
// PRODUTO + VARIAÇÕES
// ============================================================

export interface VariacaoProduto {
  id: string;
  tamanho: Tamanho | null; // null = produto sem variação de tamanho
  preco: number;
  disponivel: boolean;
}

export interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  ordem: number;
  categoria_id: string;
  variacoes_produto: VariacaoProduto[];
}

// ============================================================
// DESTAQUE (carrossel da home)
// ============================================================

export interface Destaque {
  ordem: number;
  produtos: {
    id: string;
    nome: string;
    descricao: string | null;
    imagem_url: string | null;
  };
}

// ============================================================
// COMBO SUGERIDO (meia-meia curado pelo tenant — vitrine "Meia Meia")
// ============================================================

export interface ComboSugestao {
  id: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  ordem: number;
  produto1_id: string;
  produto2_id: string;
}

// ============================================================
// COMBO DE PRODUTOS (ex.: pizza + bebida, preço fixo definido pelo tenant)
// ============================================================

export interface ComboProduto {
  id: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  ordem: number;
  produto1_id: string;
  produto2_id: string;
  preco: number;
}

// ============================================================
// GRUPOS DE ADICIONAIS (borda, opcionais — configurável por tenant)
// ============================================================

export type TipoGrupoAdicional = 'unica' | 'multipla';

export interface PrecoOpcaoPorTamanho {
  tamanho: Tamanho;
  preco: number;
}

export interface OpcaoAdicional {
  id: string;
  nome: string;
  preco_base: number; // usado quando variar_por_tamanho = false
  variar_por_tamanho: boolean;
  disponivel: boolean;
  ordem: number;
  precos_opcao_por_tamanho: PrecoOpcaoPorTamanho[]; // vazio quando variar_por_tamanho = false
}

export interface GrupoAdicional {
  id: string;
  categoria_id: string;
  nome: string;
  tipo: TipoGrupoAdicional;
  obrigatorio: boolean;
  min_selecoes: number;
  max_selecoes: number | null; // null = sem limite
  ordem: number;
  opcoes_adicionais: OpcaoAdicional[];
}

// ============================================================
// RESPOSTA COMPLETA DA API — GET /api/cardapio/[slug]
// ============================================================

export interface CardapioResponse {
  pizzaria: Pizzaria;
  categorias: Categoria[];
  produtos: Produto[];
  destaques: Destaque[];
  gruposAdicionais: GrupoAdicional[];
  combos: ComboSugestao[];
  comboProdutos: ComboProduto[];
}
