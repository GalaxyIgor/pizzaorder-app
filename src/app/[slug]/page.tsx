// src/app/[slug]/page.tsx
'use client';

// Providers (cardápio/carrinho/detalhe) vivem no layout do [slug] — ver providers.tsx.

import { Header } from '@/components/layout/Header';
import { CarrosselDestaque, type DestaqueProduto } from '@/components/cardapio/CarrosselDestaque';
import { CategoryNav } from '@/components/cardapio/CategoryNav';
import { ProductListModal } from '@/components/cardapio/modals/ProductListModal';
import { CartFooter } from '@/components/carrinho/CartFooter';
import { CategoriaModal, useCardapioModal } from '@/hooks/useCardapioModal';
import { CategoryButtons } from '@/components/cardapio/CategoryButtons';
import { CardapioSections, sectionId } from '@/components/cardapio/CardapioSection';
import { useProdutoDetalhe } from '@/contexts/ProdutoDetalheContext';
import { useCardapio } from '@/contexts/CardapioContext';
import { menorPreco } from '@/lib/cardapio';
import type { Categoria, Destaque, Produto } from '@/types/cardapio';

export default function CardapioPage() {
  return <CardapioConteudo />;
}

function destaqueParaCarrossel(
  destaque: Destaque,
  produtos: Produto[],
  categorias: Categoria[]
): DestaqueProduto | null {
  const produto = produtos.find((p) => p.id === destaque.produtos.id);
  if (!produto) return null;
  const categoria = categorias.find((c) => c.id === produto.categoria_id);

  return {
    id: produto.id,
    nome: produto.nome,
    preco: menorPreco(produto),
    imagemUrl: produto.imagem_url ?? undefined,
    categoria: categoria?.tipo === 'bebida' ? 'Bebida' : categoria?.tipo === 'meia_meia' ? 'MeiaMeia' : 'Pizza',
  };
}

function CardapioConteudo() {
  const { categorias, produtos, destaques } = useCardapio();
  const { modal, abrirModal, fecharModal } = useCardapioModal();
  const { adicionar } = useProdutoDetalhe();

  const categoriasNav = categorias.filter((c) => c.tipo !== 'meia_meia');
  const temMeiaMeia = categorias.some((c) => c.tipo === 'meia_meia');
  const categoryNavNomes = [...categoriasNav.map((c) => c.nome), ...(temMeiaMeia ? ['Meia Meia'] : [])];

  const itensDestaque = destaques
    .map((d) => destaqueParaCarrossel(d, produtos, categorias))
    .filter((d): d is DestaqueProduto => d !== null);

  const handleAddDestaque = (id: string) => {
    const produto = produtos.find((p) => p.id === id);
    if (produto) adicionar(produto);
  };

  const handleCategoryClick = (categoriaNome: string) => {
    const categoria = categoriasNav.find((c) => c.nome === categoriaNome);
    const id = categoria ? sectionId(categoria.id) : categoriaNome === 'Meia Meia' ? sectionId('meia-meia') : null;
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="max-w-full sm:max-w-md md:max-w-2xl lg:max-w-4xl mx-auto p-4 min-h-screen pb-24">
      <Header />
      <CarrosselDestaque produtos={itensDestaque} onAdd={handleAddDestaque} />
      <CategoryButtons onOpen={abrirModal} />
      <CategoryNav categories={categoryNavNomes} onCategoryClick={handleCategoryClick} />
      <CardapioSections />

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
