// src/components/cardapio/CardapioSections.tsx
'use client';

import { ProductCard } from '@/components/cardapio/cards/ProductCard';
import { BebidaCard } from '@/components/cardapio/cards/BebidaCard';
import { MeiaMetaCard } from '@/components/cardapio/cards/MeiaMetaCard';
import { useCardapio } from '@/contexts/CardapioContext';
import { produtosPorCategoria, precoMeiaMeia } from '@/lib/cardapio';

// Id da âncora de scroll de uma categoria (usado pela navegação de categorias).
export const sectionId = (categoriaId: string) => `categoria-${categoriaId}`;

export function CardapioSections() {
  const { categorias, produtos, combos, pizzaria } = useCardapio();

  const categoriasVisiveis = categorias.filter((c) => c.tipo !== 'meia_meia');
  const temMeiaMeia = categorias.some((c) => c.tipo === 'meia_meia');

  return (
    <main className="mt-8">
      {categoriasVisiveis.map((categoria) => {
        const produtosDaCategoria = produtosPorCategoria(produtos, categoria.id);
        if (produtosDaCategoria.length === 0) return null;

        return (
          <section key={categoria.id} id={sectionId(categoria.id)} className="mb-12 scroll-mt-24">
            <h2 className="font-display text-2xl font-bold mb-4 text-carbono">
              {categoria.nome}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {produtosDaCategoria.map((produto) =>
                categoria.tipo === 'bebida' ? (
                  <BebidaCard key={produto.id} bebida={produto} />
                ) : (
                  <ProductCard key={produto.id} produto={produto} />
                )
              )}
            </div>
          </section>
        );
      })}

      {temMeiaMeia && combos.length > 0 && (
        <section id={sectionId('meia-meia')} className="mb-8 scroll-mt-24">
          <h2 className="font-display text-2xl font-bold mb-4 text-carbono">
            Meia Meia
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {combos.map((combo) => {
              const produto1 = produtos.find((p) => p.id === combo.produto1_id);
              const produto2 = produtos.find((p) => p.id === combo.produto2_id);
              if (!produto1 || !produto2) return null;

              return (
                <MeiaMetaCard
                  key={combo.id}
                  combo={{
                    id: combo.id,
                    nome: combo.nome,
                    descricao: combo.descricao ?? '',
                    produto1,
                    produto2,
                    imagem_url: combo.imagem_url,
                    preco: precoMeiaMeia(produto1, produto2, pizzaria.config_meia_meia),
                  }}
                />
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
