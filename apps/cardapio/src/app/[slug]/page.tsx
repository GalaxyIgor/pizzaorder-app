// src/app/[slug]/page.tsx
'use client';

// Providers (cardápio/carrinho/detalhe) vivem no layout do [slug] — ver providers.tsx.
//
// Primeira tela sem carrossel de destaques (removido em 2026-07-07): a escolha
// de categoria é o hero. Os destaques do banco continuam vivos como o chip
// "a mais pedida" dentro do card de pizzas (ver CategoryButtons).

import { Header } from '@/components/layout/Header';
import { AvisoPausado } from '@/components/layout/AvisoPausado';
import { AvisoLoja } from '@/components/layout/AvisoLoja';
import { InfoStrip } from '@/components/layout/InfoStrip';
import { ProductListModal } from '@/components/cardapio/modals/ProductListModal';
import { CartFooter } from '@/components/carrinho/CartFooter';
import { CategoriaModal, useCardapioModal } from '@/hooks/useCardapioModal';
import { CategoryButtons } from '@/components/cardapio/CategoryButtons';

export default function CardapioPage() {
  return <CardapioConteudo />;
}

function CardapioConteudo() {
  const { modal, abrirModal, fecharModal } = useCardapioModal();

  return (
    <div className="max-w-full sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto p-4 sm:p-6 min-h-screen pb-24">
      <Header />
      <AvisoPausado />
      <AvisoLoja />
      <InfoStrip />
      <CategoryButtons onOpen={abrirModal} />

      <ProductListModal
        isOpen={modal.aberto}
        category={modal.categoria as CategoriaModal}
        title={modal.titulo}
        products={modal.produtos}
        combos={modal.combos}
        onClose={fecharModal}
      />

      <CartFooter />
    </div>
  );
}
