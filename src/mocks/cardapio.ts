// src/mocks/cardapio.ts

import type { Produto } from '@/types/cardapio';
import { menorPreco } from '@/lib/cardapio';
import type { ComboMeiaMeia } from '@/types/product-list-modal';

// ============================================================
// PIZZAS
// ============================================================

export const PIZZAS_TRADICIONAIS: Produto[] = [
  {
    id: '1',
    nome: 'Margherita Clássica',
    descricao: 'Molho de tomate artesanal, mozzarella viva, manjericão fresco e azeite extra virgem.',
    imagem_url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=300',
    ordem: 1,
    categoria_id: 'pizzas-tradicionais',
    variacoes_produto: [{ id: '1-v1', tamanho: null, preco: 48.90, disponivel: true }],
  },
  {
    id: '2',
    nome: 'Calabrese Di Napoli',
    descricao: 'Molho de tomate, mozzarella, calabresa defumada artesanal e cebola roxa.',
    imagem_url: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?q=80&w=300',
    ordem: 2,
    categoria_id: 'pizzas-tradicionais',
    variacoes_produto: [{ id: '2-v1', tamanho: null, preco: 52.00, disponivel: true }],
  },
  {
    id: '3',
    nome: 'Quatro Queijos',
    descricao: 'Gorgonzola, parmesão, mozzarella e provolone em perfeita harmonia.',
    imagem_url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?q=80&w=300',
    ordem: 3,
    categoria_id: 'pizzas-tradicionais',
    variacoes_produto: [{ id: '3-v1', tamanho: null, preco: 56.00, disponivel: true }],
  },
];

export const PIZZAS_ESPECIAIS: Produto[] = [
  {
    id: '4',
    nome: 'Frango com Catupiry',
    descricao: 'Peito de frango desfiado, catupiry cremoso, milho e bacon.',
    imagem_url: 'https://images.unsplash.com/photo-1589985643564-192f8eca26c9?q=80&w=300',
    ordem: 1,
    categoria_id: 'pizzas-especiais',
    variacoes_produto: [{ id: '4-v1', tamanho: null, preco: 54.00, disponivel: true }],
  },
  {
    id: '5',
    nome: 'Portuguesa',
    descricao: 'Presunto, ovo, cebola, azeitona preta e pimentão.',
    imagem_url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?q=80&w=300',
    ordem: 2,
    categoria_id: 'pizzas-especiais',
    variacoes_produto: [{ id: '5-v1', tamanho: null, preco: 50.00, disponivel: true }],
  },
];

// Todas as pizzas em um único array — útil para lookups e para a escolha de sabores no meia-meia
export const TODAS_AS_PIZZAS: Produto[] = [
  ...PIZZAS_TRADICIONAIS,
  ...PIZZAS_ESPECIAIS,
];

const findPizza = (id: string): Produto => {
  const pizza = TODAS_AS_PIZZAS.find((p) => p.id === id);
  if (!pizza) throw new Error(`Pizza com id "${id}" não encontrada nos mocks.`);
  return pizza;
};

// ============================================================
// MEIA MEIA — combos sugeridos na vitrine, montados a partir de pizzas reais
// (o schema não tem mais um Produto "meia-meia" próprio: o preço é derivado
// das variações das duas pizzas conforme a estratégia de precificação)
// ============================================================

const criarCombo = (
  id: string,
  nome: string,
  descricao: string,
  produto1: Produto,
  produto2: Produto,
  imagem_url: string
): ComboMeiaMeia => ({
  id,
  nome,
  descricao,
  produto1,
  produto2,
  imagem_url,
  preco: Math.max(menorPreco(produto1), menorPreco(produto2)),
});

export const MEIA_MEIA: ComboMeiaMeia[] = [
  criarCombo(
    '6',
    'Meia Meia Popular',
    'A combinação clássica brasileira: manjericão fresco com calabresa defumada.',
    findPizza('1'), // Margherita Clássica
    findPizza('2'), // Calabrese Di Napoli
    'https://images.unsplash.com/photo-1585238341710-4edd9d7daf6f?q=80&w=300'
  ),
  criarCombo(
    '7',
    'Meia Meia Gourmet',
    'O melhor dos dois mundos: queijos nobres e cremosidade do catupiry.',
    findPizza('3'), // Quatro Queijos
    findPizza('4'), // Frango com Catupiry
    'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?q=80&w=300'
  ),
  criarCombo(
    '8',
    'Meia Meia Executiva',
    'Sabor robusto: ovo, presunto e calabresa defumada.',
    findPizza('5'), // Portuguesa
    findPizza('2'), // Calabrese Di Napoli
    'https://images.unsplash.com/photo-1571407-4713880c5e41?q=80&w=300'
  ),
];

// ============================================================
// BEBIDAS
// ============================================================

export const BEBIDAS: Produto[] = [
  {
    id: '9',
    nome: 'Refrigerante Lata',
    descricao: 'Escolha sua marca favorita: Coca, Sprite, Fanta...',
    imagem_url: 'https://images.unsplash.com/photo-1554866585-d7180ba00330?q=80&w=300',
    ordem: 1,
    categoria_id: 'bebidas',
    variacoes_produto: [{ id: '9-v1', tamanho: '350ml', preco: 5.00, disponivel: true }],
  },
  {
    id: '10',
    nome: 'Refrigerante 2L',
    descricao: 'Perfeito para compartilhar com amigos.',
    imagem_url: 'https://images.unsplash.com/photo-1554866585-d7180ba00330?q=80&w=300',
    ordem: 2,
    categoria_id: 'bebidas',
    variacoes_produto: [{ id: '10-v1', tamanho: '2L', preco: 12.00, disponivel: true }],
  },
  {
    id: '11',
    nome: 'Suco Natural',
    descricao: 'Suco de laranja fresco, espremido na hora.',
    imagem_url: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?q=80&w=300',
    ordem: 3,
    categoria_id: 'bebidas',
    variacoes_produto: [{ id: '11-v1', tamanho: '300ml', preco: 7.50, disponivel: true }],
  },
  {
    id: '12',
    nome: 'Cerveja Artesanal',
    descricao: 'Seleção de cervejas artesanais locais.',
    imagem_url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?q=80&w=300',
    ordem: 4,
    categoria_id: 'bebidas',
    variacoes_produto: [{ id: '12-v1', tamanho: '600ml', preco: 15.00, disponivel: true }],
  },
];

// ============================================================
// DESTAQUES — referencia IDs reais, sem duplicar dados
// ============================================================

export interface ItemDestaque {
  id: string;
  nome: string;
  preco: number;
  imagemUrl: string;
  categoria: ProdutoCardapioCategoria;
  badge: string;
}

type ProdutoCardapioCategoria = 'Pizza' | 'MeiaMeia' | 'Bebida';

export const ITENS_DESTAQUE: ItemDestaque[] = [
  { id: '2',  badge: 'Top Vendido', ...extrairDestaqueProduto(findPizza('2'), 'Pizza') },
  { id: '6',  badge: 'Mais Pedida', ...extrairDestaqueMeiaMeia(MEIA_MEIA[0]) },
  { id: '4',  badge: 'Favorita',    ...extrairDestaqueProduto(findPizza('4'), 'Pizza') },
  { id: '9',  badge: 'Clássico',    ...extrairDestaqueProduto(BEBIDAS[0], 'Bebida') },
  { id: '7',  badge: 'Especial',    ...extrairDestaqueMeiaMeia(MEIA_MEIA[1]) },
];

function extrairDestaqueProduto(
  produto: Produto,
  categoria: 'Pizza' | 'Bebida'
): Omit<ItemDestaque, 'id' | 'badge'> {
  return { nome: produto.nome, preco: menorPreco(produto), imagemUrl: produto.imagem_url ?? '', categoria };
}

function extrairDestaqueMeiaMeia(combo: ComboMeiaMeia): Omit<ItemDestaque, 'id' | 'badge'> {
  return { nome: combo.nome, preco: combo.preco, imagemUrl: combo.imagem_url ?? '', categoria: 'MeiaMeia' };
}
