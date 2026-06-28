// src/mocks/cardapio.ts

import { Pizza, Bebida, MeiaMeia } from '@/src/types/types';

// ============================================================
// PIZZAS
// ============================================================

export const PIZZAS_TRADICIONAIS: Pizza[] = [
  {
    id: '1',
    nome: 'Margherita Clássica',
    descricao: 'Molho de tomate artesanal, mozzarella viva, manjericão fresco e azeite extra virgem.',
    preco: 48.90,
    categoria: 'Pizza',
    imagemUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=300',
  },
  {
    id: '2',
    nome: 'Calabrese Di Napoli',
    descricao: 'Molho de tomate, mozzarella, calabresa defumada artesanal e cebola roxa.',
    preco: 52.00,
    categoria: 'Pizza',
    imagemUrl: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?q=80&w=300',
  },
  {
    id: '3',
    nome: 'Quatro Queijos',
    descricao: 'Gorgonzola, parmesão, mozzarella e provolone em perfeita harmonia.',
    preco: 56.00,
    categoria: 'Pizza',
    imagemUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?q=80&w=300',
  },
];

export const PIZZAS_ESPECIAIS: Pizza[] = [
  {
    id: '4',
    nome: 'Frango com Catupiry',
    descricao: 'Peito de frango desfiado, catupiry cremoso, milho e bacon.',
    preco: 54.00,
    categoria: 'Pizza',
    imagemUrl: 'https://images.unsplash.com/photo-1589985643564-192f8eca26c9?q=80&w=300',
  },
  {
    id: '5',
    nome: 'Portuguesa',
    descricao: 'Presunto, ovo, cebola, azeitona preta e pimentão.',
    preco: 50.00,
    categoria: 'Pizza',
    imagemUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?q=80&w=300',
  },
];

// Todas as pizzas em um único array — útil para lookups
export const TODAS_AS_PIZZAS: Pizza[] = [
  ...PIZZAS_TRADICIONAIS,
  ...PIZZAS_ESPECIAIS,
];

const findPizza = (id: string): Pizza => {
  const pizza = TODAS_AS_PIZZAS.find((p) => p.id === id);
  if (!pizza) throw new Error(`Pizza com id "${id}" não encontrada nos mocks.`);
  return pizza;
};

// ============================================================
// MEIA MEIA — referencia pizzas reais por ID
// ============================================================

export const MEIA_MEIA: MeiaMeia[] = [
  {
    id: '6',
    nome: 'Meia Meia Popular',
    sabor1: findPizza('1'), // Margherita Clássica
    sabor2: findPizza('2'), // Calabrese Di Napoli
    descricao: 'A combinação clássica brasileira: manjericão fresco com calabresa defumada.',
    preco: 52.00,
    categoria: 'MeiaMeia',
    imagemUrl: 'https://images.unsplash.com/photo-1585238341710-4edd9d7daf6f?q=80&w=300',
  },
  {
    id: '7',
    nome: 'Meia Meia Gourmet',
    sabor1: findPizza('3'), // Quatro Queijos
    sabor2: findPizza('4'), // Frango com Catupiry
    descricao: 'O melhor dos dois mundos: queijos nobres e cremosidade do catupiry.',
    preco: 58.00,
    categoria: 'MeiaMeia',
    imagemUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?q=80&w=300',
  },
  {
    id: '8',
    nome: 'Meia Meia Executiva',
    sabor1: findPizza('5'), // Portuguesa
    sabor2: findPizza('2'), // Calabrese Di Napoli
    descricao: 'Sabor robusto: ovo, presunto e calabresa defumada.',
    preco: 54.00,
    categoria: 'MeiaMeia',
    imagemUrl: 'https://images.unsplash.com/photo-1571407-4713880c5e41?q=80&w=300',
  },
];

// ============================================================
// BEBIDAS
// ============================================================

export const BEBIDAS: Bebida[] = [
  {
    id: '9',
    nome: 'Refrigerante Lata',
    descricao: 'Escolha sua marca favorita: Coca, Sprite, Fanta...',
    preco: 5.00,
    categoria: 'Bebida',
    volume: '350ml',
    imagemUrl: 'https://images.unsplash.com/photo-1554866585-d7180ba00330?q=80&w=300',
  },
  {
    id: '10',
    nome: 'Refrigerante 2L',
    descricao: 'Perfeito para compartilhar com amigos.',
    preco: 12.00,
    categoria: 'Bebida',
    volume: '2L',
    imagemUrl: 'https://images.unsplash.com/photo-1554866585-d7180ba00330?q=80&w=300',
  },
  {
    id: '11',
    nome: 'Suco Natural',
    descricao: 'Suco de laranja fresco, espremido na hora.',
    preco: 7.50,
    categoria: 'Bebida',
    volume: '300ml',
    imagemUrl: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?q=80&w=300',
  },
  {
    id: '12',
    nome: 'Cerveja Artesanal',
    descricao: 'Seleção de cervejas artesanais locais.',
    preco: 15.00,
    categoria: 'Bebida',
    volume: '600ml',
    imagemUrl: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?q=80&w=300',
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
  { id: '2',  badge: 'Top Vendido', ...extrairDestaque(findPizza('2')) },
  { id: '6',  badge: 'Mais Pedida', ...extrairDestaqueMeiaMeia(MEIA_MEIA[0]) },
  { id: '4',  badge: 'Favorita',    ...extrairDestaque(findPizza('4')) },
  { id: '9',  badge: 'Clássico',    ...extrairDestaqueBebida(BEBIDAS[0]) },
  { id: '7',  badge: 'Especial',    ...extrairDestaqueMeiaMeia(MEIA_MEIA[1]) },
];

function extrairDestaque(pizza: Pizza): Omit<ItemDestaque, 'id' | 'badge'> {
  return { nome: pizza.nome, preco: pizza.preco, imagemUrl: pizza.imagemUrl ?? '', categoria: 'Pizza' };
}

function extrairDestaqueMeiaMeia(mm: MeiaMeia): Omit<ItemDestaque, 'id' | 'badge'> {
  return { nome: mm.nome, preco: mm.preco, imagemUrl: mm.imagemUrl ?? '', categoria: 'MeiaMeia' };
}

function extrairDestaqueBebida(bebida: Bebida): Omit<ItemDestaque, 'id' | 'badge'> {
  return { nome: bebida.nome, preco: bebida.preco, imagemUrl: bebida.imagemUrl ?? '', categoria: 'Bebida' };
}