// src/types/index.ts

// ============================================================
// TIPOS BASE
// ============================================================

export interface ProdutoBase {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  imagemUrl?: string;
}

// ============================================================
// PRODUTOS DO CARDÁPIO
// ============================================================

export interface Pizza extends ProdutoBase {
  categoria: 'Pizza';
  tamanho?: 'P' | 'M' | 'G' | 'GG';
}

export interface Bebida extends ProdutoBase {
  categoria: 'Bebida';
  volume?: string; // ex: "2L", "600ml"
}

export interface MeiaMeia extends ProdutoBase {
  categoria: 'MeiaMeia';
  sabor1: Pizza;
  sabor2: Pizza;
  // preco é calculado pela ConfiguracaoPizzaria.precificacaoMeiaMeia
}

export interface OutroProduto extends ProdutoBase {
  categoria: 'Outro'; // bordas recheadas, sobremesas, etc.
}

// União discriminada — qualquer item do cardápio
export type ProdutoCardapio = Pizza | Bebida | MeiaMeia | OutroProduto;

// ============================================================
// CARRINHO
// ============================================================

export interface ItemCarrinho {
  produto: ProdutoCardapio;
  quantidade: number;
  observacao?: string; // ex: "sem cebola"
}

// ============================================================
// REGRAS DE NEGÓCIO — CONFIGURAÇÃO POR PIZZARIA (tenant)
// ============================================================

// --- Meia a meia ---

export type EstrategiaMeiaMeia = 'maior' | 'menor' | 'media' | 'fixo';

export interface ConfigMeiaMeia {
  estrategia: EstrategiaMeiaMeia;
  precoFixo?: number; // obrigatório se estrategia === 'fixo'
}

// --- Frete ---

export type TipoFrete = 'faixas_km' | 'preco_por_km' | 'por_bairro' | 'fixo' | 'gratis';

export interface FaixaKm {
  kmInicio: number;
  kmFim: number;       // Infinity para "acima de X km"
  valor: number;
  entrega: boolean;    // false = não entrega nessa faixa
}

export interface BairroFrete {
  bairro: string;      // normalizado (lowercase, sem acento)
  valor: number;
  entrega: boolean;
}

export interface ConfigFrete {
  tipo: TipoFrete;

  // faixas_km
  faixas?: FaixaKm[];

  // preco_por_km
  valorPorKm?: number;
  minimoFrete?: number;

  // por_bairro
  bairros?: BairroFrete[];

  // fixo
  valorFixo?: number;

  // gratis acima de X
  gratisPedidoAcimaDe?: number;
}

// --- Taxa de serviço ---

export type TipoTaxaServico = 'percentual' | 'fixo';

export interface ConfigTaxaServico {
  tipo: TipoTaxaServico;
  valor: number; // ex: 10 para 10% | 5 para R$5,00
}

// --- Configuração geral da pizzaria ---

export interface ConfiguracaoPizzaria {
  meiaMeia: ConfigMeiaMeia;
  frete: ConfigFrete;
  taxaServico?: ConfigTaxaServico;
  pedidoMinimo?: number;
  aceitaRetirada: boolean;
  aceitaEntrega: boolean;
}