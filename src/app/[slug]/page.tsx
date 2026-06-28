// src/app/[slug]/page.tsx
'use client';

import { useRef } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/src/components/cliente/layout/Header';
import { CarrosselDestaque } from '@/src/components/cliente/CarrosselDestaque';
import { CategoryNav } from '@/src/components/cliente/nav/CategoryNav';
import { ProductListModal } from '@/src/components/cliente/modals/ProductListModal';
import { CartFooter } from '@/src/components/cliente/cart/CartFooter';
import { ITENS_DESTAQUE } from '@/src/mocks/cardapio';
import { CategoriaModal, useCardapioModal } from '@/src/types/Usecardapiomodal';
import { CategoryButtons } from '@/src/components/cliente/buttons/CategoryButtons';
import { CardapioSections } from '@/src/components/cliente/CardapioSection';


export default function CardapioPage() {
  const params = useParams();
  const slug = (params.slug as string) || 'pizzaria';

  const { modal, abrirModal, fecharModal } = useCardapioModal();

  const refs = {
    pizzasTradicionais: useRef<HTMLDivElement>(null),
    pizzasEspeciais:    useRef<HTMLDivElement>(null),
    meiaMeia:           useRef<HTMLDivElement>(null),
    bebidas:            useRef<HTMLDivElement>(null),
  };

  const SCROLL_MAP: Record<string, keyof typeof refs> = {
    'Pizzas Tradicionais': 'pizzasTradicionais',
    'Pizzas Especiais':    'pizzasEspeciais',
    'Meia Meia':           'meiaMeia',
    'Bebidas':             'bebidas',
  };

  const handleCategoryClick = (categoria: string) => {
    const key = SCROLL_MAP[categoria];
    if (key) refs[key].current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="max-w-full sm:max-w-md md:max-w-2xl lg:max-w-4xl mx-auto p-4 min-h-screen pb-24">
      <Header slug={slug} />
      <CarrosselDestaque produtos={ITENS_DESTAQUE} />
      <CategoryButtons onOpen={abrirModal} />
      <CategoryNav onCategoryClick={handleCategoryClick} />
      <CardapioSections refs={refs} />

      <ProductListModal
        isOpen={modal.aberto}
        category={modal.categoria as CategoriaModal}
        title={modal.titulo}
        products={modal.produtos}
        onClose={fecharModal}
      />

      <CartFooter />
    </div>
  );
}