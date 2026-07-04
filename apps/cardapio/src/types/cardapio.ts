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

export type EstrategiaMeiaMeia = 'maior' | 'menor' | 'media' | 'fixo';

export interface ConfigMeiaMeia {
  estrategia: EstrategiaMeiaMeia;
  precoFixo?: number;
}

export type TipoFrete = 'faixas_km' | 'preco_por_km' | 'por_bairro' | 'fixo' | 'gratis';

export interface FaixaKm {
  kmInicio: number;
  kmFim: number;
  valor: number;
  entrega: boolean;
}

export interface BairroFrete {
  bairro: string;
  valor: number;
  entrega: boolean;
}

export interface ConfigFrete {
  tipo: TipoFrete;
  faixas?: FaixaKm[];
  valorPorKm?: number;
  minimoFrete?: number;
  bairros?: BairroFrete[];
  valorFixo?: number;
  gratisPedidoAcimaDe?: number;
}

export type TipoTaxaServico = 'percentual' | 'fixo';

export interface ConfigTaxaServico {
  tipo: TipoTaxaServico;
  valor: number;
}

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
}

// ============================================================
// CATEGORIA
// ============================================================

export type TipoCategoria = 'pizza' | 'bebida' | 'meia_meia' | 'outro';

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
}
