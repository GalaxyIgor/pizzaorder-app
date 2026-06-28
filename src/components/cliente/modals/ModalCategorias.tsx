// src/components/cliente/ModalCategorias.tsx
'use client';

import type { ProdutoCardapio } from '@/src/types/types';
import { ProductCard } from '../cards/ProductCard';
import { BebidaCard } from '../cards/BebidaCard';
import { MeiaMetaCard } from '../cards/MeiaMetaCard';

interface ModalCategoriasProps {
  isOpen: boolean;
  categoria: string;
  produtos: ProdutoCardapio[];
  onClose: () => void;
}

function RenderizarProduto({ produto }: { produto: ProdutoCardapio }) {
  switch (produto.categoria) {
    case 'MeiaMeia':
      return <MeiaMetaCard meiaMeia={produto} />;
    case 'Bebida':
      return <BebidaCard bebida={produto} />;
    case 'Pizza':
    case 'Outro':
      return <ProductCard produto={produto} />;
  }
}

export function ModalCategorias({ isOpen, categoria, produtos, onClose }: ModalCategoriasProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-massa-bg rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

          {/* Header */}
          <div className="sticky top-0 bg-pomodoro/10 px-6 py-4 border-b border-borda-suave flex justify-between items-center">
            <h2 className="font-display text-2xl font-bold text-carbono">
              {categoria}
            </h2>
            <button
              onClick={onClose}
              className="text-carbono hover:bg-pomodoro/20 rounded-full p-2 transition-colors"
              aria-label="Fechar modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Conteúdo */}
          <div className="p-6">
            {produtos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {produtos.map((produto) => (
                  <RenderizarProduto key={produto.id} produto={produto} />
                ))}
              </div>
            ) : (
              <p className="text-center text-creme-muted text-lg py-8">
                Nenhum produto disponível nesta categoria.
              </p>
            )}
          </div>

        </div>
      </div>
    </>
  );
}