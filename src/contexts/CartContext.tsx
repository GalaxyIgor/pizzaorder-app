'use client';

// src/contexts/CartContext.tsx
//
// Estado global do carrinho (client-side), com persistência em localStorage por slug.
// Consumido em qualquer lugar da árvore via useCart().

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import type { ConfigMeiaMeia, Produto, Tamanho, VariacaoProduto } from '@/types/cardapio';
import type { ComboMeiaMeia } from '@/types/product-list-modal';
import type { CartItem, CartItemAdicional } from '@/types/carrinho';
import { precoMeiaMeia, variacaoDisponivel } from '@/lib/cardapio';

// ============================================================
// REDUCER
// ============================================================

type CartAction =
  | { type: 'ADD'; item: CartItem }
  | { type: 'INCREMENT'; id: string }
  | { type: 'DECREMENT'; id: string }
  | { type: 'REMOVE'; id: string }
  | { type: 'CLEAR' }
  | { type: 'HYDRATE'; items: CartItem[] };

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'HYDRATE':
      return action.items;

    case 'ADD': {
      const existente = state.find((i) => i.id === action.item.id);
      if (existente) {
        return state.map((i) =>
          i.id === action.item.id
            ? { ...i, quantidade: i.quantidade + action.item.quantidade }
            : i
        );
      }
      return [...state, action.item];
    }

    case 'INCREMENT':
      return state.map((i) =>
        i.id === action.id ? { ...i, quantidade: i.quantidade + 1 } : i
      );

    case 'DECREMENT':
      return state
        .map((i) => (i.id === action.id ? { ...i, quantidade: i.quantidade - 1 } : i))
        .filter((i) => i.quantidade > 0);

    case 'REMOVE':
      return state.filter((i) => i.id !== action.id);

    case 'CLEAR':
      return [];

    default:
      return state;
  }
}

// ============================================================
// CONTEXT
// ============================================================

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addProduto: (produto: Produto, variacao?: VariacaoProduto) => void;
  addProdutoPersonalizado: (
    produto: Produto,
    variacao: VariacaoProduto,
    adicionais: CartItemAdicional[]
  ) => void;
  addMeiaMeia: (pizza1: Produto, pizza2: Produto) => void;
  addMeiaMeiaPersonalizado: (
    pizza1: Produto,
    pizza2: Produto,
    tamanho: Tamanho | null,
    precoBase: number,
    adicionais: CartItemAdicional[]
  ) => void;
  addCombo: (combo: ComboMeiaMeia) => void;
  increment: (id: string) => void;
  decrement: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

// Assinaturas estáveis das linhas (mesma linha => soma quantidade)
const sigProduto = (variacaoId: string, adicionais: CartItemAdicional[] = []) => {
  const extras = adicionais.map((a) => a.opcaoId).sort().join(',');
  return extras ? `p:${variacaoId}|${extras}` : `p:${variacaoId}`;
};
const sigMeiaMeia = (
  id1: string,
  id2: string,
  tamanho: string | null = null,
  adicionais: CartItemAdicional[] = []
) => {
  const extras = adicionais.map((a) => a.opcaoId).sort().join(',');
  return `mm:${[id1, id2].sort().join('-')}${tamanho ? `|t:${tamanho}` : ''}${extras ? `|${extras}` : ''}`;
};

export function CartProvider({
  slug,
  configMeiaMeia,
  children,
}: {
  slug: string;
  configMeiaMeia: ConfigMeiaMeia;
  children: ReactNode;
}) {
  const [items, dispatch] = useReducer(cartReducer, []);
  const storageKey = `carrinho:${slug}`;
  const hydrated = useRef(false);

  // Carrega do localStorage na montagem (client only, evita mismatch de hidratação)
  useEffect(() => {
    try {
      const bruto = localStorage.getItem(storageKey);
      if (bruto) dispatch({ type: 'HYDRATE', items: JSON.parse(bruto) as CartItem[] });
    } catch {
      // localStorage indisponível ou JSON corrompido — segue com carrinho vazio
    }
    hydrated.current = true;
  }, [storageKey]);

  // Persiste a cada mudança (só depois da hidratação, pra não sobrescrever o salvo)
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // ignora falha de escrita (ex.: modo privado / quota)
    }
  }, [items, storageKey]);

  const addProduto = (produto: Produto, variacao?: VariacaoProduto) => {
    const v = variacao ?? variacaoDisponivel(produto);
    if (!v) return; // produto sem variação disponível
    dispatch({
      type: 'ADD',
      item: {
        id: sigProduto(v.id),
        tipo: 'produto',
        nome: produto.nome,
        descricao: v.tamanho ? String(v.tamanho) : produto.descricao,
        imagem_url: produto.imagem_url,
        precoUnit: v.preco,
        quantidade: 1,
        produtoId: produto.id,
        variacaoId: v.id,
        tamanho: v.tamanho ?? null,
      },
    });
  };

  const addProdutoPersonalizado = (
    produto: Produto,
    variacao: VariacaoProduto,
    adicionais: CartItemAdicional[]
  ) => {
    const precoAdicionais = adicionais.reduce((acc, a) => acc + a.preco, 0);
    const extrasPagos = adicionais.filter((a) => a.preco > 0).map((a) => a.nome);
    const partes = [variacao.tamanho, ...extrasPagos].filter(Boolean) as string[];

    dispatch({
      type: 'ADD',
      item: {
        id: sigProduto(variacao.id, adicionais),
        tipo: 'produto',
        nome: produto.nome,
        descricao: partes.length > 0 ? partes.join(' · ') : produto.descricao,
        imagem_url: produto.imagem_url,
        precoUnit: variacao.preco + precoAdicionais,
        quantidade: 1,
        produtoId: produto.id,
        variacaoId: variacao.id,
        tamanho: variacao.tamanho ?? null,
        adicionais,
      },
    });
  };

  const addMeiaMeia = (pizza1: Produto, pizza2: Produto) => {
    dispatch({
      type: 'ADD',
      item: {
        id: sigMeiaMeia(pizza1.id, pizza2.id),
        tipo: 'meia-meia',
        nome: 'Pizza Meia a Meia',
        descricao: `${pizza1.nome} / ${pizza2.nome}`,
        imagem_url: pizza1.imagem_url,
        precoUnit: precoMeiaMeia(pizza1, pizza2, configMeiaMeia),
        quantidade: 1,
        sabores: [
          { produtoId: pizza1.id, nome: pizza1.nome, descricao: pizza1.descricao },
          { produtoId: pizza2.id, nome: pizza2.nome, descricao: pizza2.descricao },
        ],
      },
    });
  };

  const addMeiaMeiaPersonalizado = (
    pizza1: Produto,
    pizza2: Produto,
    tamanho: Tamanho | null,
    precoBase: number,
    adicionais: CartItemAdicional[]
  ) => {
    const precoAdicionais = adicionais.reduce((acc, a) => acc + a.preco, 0);
    const extrasPagos = adicionais.filter((a) => a.preco > 0).map((a) => a.nome);
    const partes = [tamanho, `${pizza1.nome} / ${pizza2.nome}`, ...extrasPagos].filter(Boolean) as string[];

    dispatch({
      type: 'ADD',
      item: {
        id: sigMeiaMeia(pizza1.id, pizza2.id, tamanho, adicionais),
        tipo: 'meia-meia',
        nome: 'Pizza Meia a Meia',
        descricao: partes.join(' · '),
        imagem_url: pizza1.imagem_url,
        precoUnit: precoBase + precoAdicionais,
        quantidade: 1,
        tamanho: tamanho ?? null,
        sabores: [
          { produtoId: pizza1.id, nome: pizza1.nome, descricao: pizza1.descricao },
          { produtoId: pizza2.id, nome: pizza2.nome, descricao: pizza2.descricao },
        ],
        adicionais,
      },
    });
  };

  const addCombo = (combo: ComboMeiaMeia) => {
    dispatch({
      type: 'ADD',
      item: {
        id: sigMeiaMeia(combo.produto1.id, combo.produto2.id),
        tipo: 'meia-meia',
        nome: combo.nome,
        descricao: `${combo.produto1.nome} / ${combo.produto2.nome}`,
        imagem_url: combo.imagem_url,
        precoUnit: combo.preco,
        quantidade: 1,
        sabores: [
          { produtoId: combo.produto1.id, nome: combo.produto1.nome, descricao: combo.produto1.descricao },
          { produtoId: combo.produto2.id, nome: combo.produto2.nome, descricao: combo.produto2.descricao },
        ],
      },
    });
  };

  const value = useMemo<CartContextValue>(() => {
    const totalItems = items.reduce((acc, i) => acc + i.quantidade, 0);
    const totalPrice = items.reduce((acc, i) => acc + i.precoUnit * i.quantidade, 0);
    return {
      items,
      totalItems,
      totalPrice,
      addProduto,
      addProdutoPersonalizado,
      addMeiaMeia,
      addMeiaMeiaPersonalizado,
      addCombo,
      increment: (id) => dispatch({ type: 'INCREMENT', id }),
      decrement: (id) => dispatch({ type: 'DECREMENT', id }),
      remove: (id) => dispatch({ type: 'REMOVE', id }),
      clear: () => dispatch({ type: 'CLEAR' }),
    };
    // addProduto/addMeiaMeia/addCombo são redefinidas a cada render (fecham sobre items/configMeiaMeia atuais);
    // o memo em si só precisa recalcular quando items ou configMeiaMeia mudam.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, configMeiaMeia]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart deve ser usado dentro de <CartProvider>.');
  return ctx;
}
