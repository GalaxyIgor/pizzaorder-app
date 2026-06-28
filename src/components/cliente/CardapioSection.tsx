// src/components/cliente/CardapioSections.tsx

import type { RefObject } from 'react';
import { ProductCard } from '@/src/components/cliente/cards/ProductCard';
import { BebidaCard } from '@/src/components/cliente/cards/BebidaCard';
import { MeiaMetaCard } from '@/src/components/cliente/cards/MeiaMetaCard';
import {
  PIZZAS_TRADICIONAIS,
  PIZZAS_ESPECIAIS,
  MEIA_MEIA,
  BEBIDAS,
} from '@/src/mocks/cardapio';

interface CardapioSectionsProps {
  refs: {
    pizzasTradicionais: RefObject<HTMLDivElement | null>;
    pizzasEspeciais: RefObject<HTMLDivElement | null>;
    meiaMeia: RefObject<HTMLDivElement | null>;
    bebidas: RefObject<HTMLDivElement | null>;
  };
}

export function CardapioSections({ refs }: CardapioSectionsProps) {
  return (
    <main className="mt-8">
      <section ref={refs.pizzasTradicionais} className="mb-12">
        <h2 className="font-display text-2xl font-bold mb-4 text-carbono">
          Pizzas Tradicionais
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PIZZAS_TRADICIONAIS.map((pizza) => (
            <ProductCard key={pizza.id} produto={pizza} />
          ))}
        </div>
      </section>

      <section ref={refs.pizzasEspeciais} className="mb-12">
        <h2 className="font-display text-2xl font-bold mb-4 text-carbono">
          Pizzas Especiais
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PIZZAS_ESPECIAIS.map((pizza) => (
            <ProductCard key={pizza.id} produto={pizza} />
          ))}
        </div>
      </section>

      <section ref={refs.meiaMeia} className="mb-12">
        <h2 className="font-display text-2xl font-bold mb-4 text-carbono">
          Meia Meia
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MEIA_MEIA.map((meiaMeia) => (
            <MeiaMetaCard key={meiaMeia.id} meiaMeia={meiaMeia} />
          ))}
        </div>
      </section>

      <section ref={refs.bebidas} className="mb-8">
        <h2 className="font-display text-2xl font-bold mb-4 text-carbono">
          Bebidas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BEBIDAS.map((bebida) => (
            <BebidaCard key={bebida.id} bebida={bebida} />
          ))}
        </div>
      </section>
    </main>
  );
}