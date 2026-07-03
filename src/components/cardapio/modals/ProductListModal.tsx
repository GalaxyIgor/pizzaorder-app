'use client';

import { useState } from 'react';
import type { Produto } from '@/types/cardapio';
import type { ProductListModalCategory, ProductListModalProps, SelectedFlavors } from '@/types/product-list-modal';
import { ProductListModalHeader } from '@/components/cardapio/modals/ProductListModalHeader';
import { HalfAndHalfSelector } from '@/components/cardapio/modals/HalfAndHalfSelector';
import { ProductOptionCard } from '@/components/cardapio/modals/ProductOptionCard';
import { ProductListModalFooter } from '@/components/cardapio/modals/ProductListModalFooter';

const FLAVORS_VAZIO: SelectedFlavors = { lado1: null, lado2: null };

export function ProductListModal({ isOpen, onClose, title, category, products }: ProductListModalProps) {
  const [selectedFlavors, setSelectedFlavors] = useState<SelectedFlavors>(FLAVORS_VAZIO);
  const [selectingLado, setSelectingLado] = useState<1 | 2 | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatarPreco = (preco: number) =>
    preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleClose = () => {
    setSelectedFlavors(FLAVORS_VAZIO);
    setSelectingLado(null);
    setErro(null);
    onClose();
  };

  const handleProductSelect = (product: Produto) => {
    if (category !== 'meia-meia') {
      console.log('Adicionando ao carrinho:', product);
      return;
    }

    if (selectingLado === 1) {
      setErro(null);
      setSelectedFlavors((prev) => ({ ...prev, lado1: product }));
      setSelectingLado(2);
    } else if (selectingLado === 2) {
      if (product.id === selectedFlavors.lado1?.id) {
        setErro('Escolha um sabor diferente para o segundo lado.');
        return;
      }
      setErro(null);
      setSelectedFlavors((prev) => ({ ...prev, lado2: product }));
      setSelectingLado(null);
    }
  };

  const handleAddToCart = () => {
    if (category === 'meia-meia') {
      if (!selectedFlavors.lado1 || !selectedFlavors.lado2) {
        setErro('Selecione os dois lados antes de continuar.');
        return;
      }
      console.log('Adicionando meia-meia ao carrinho:', selectedFlavors);
    }
    handleClose();
  };

  const handleChooseSide = (side: 1 | 2) => setSelectingLado(side);
  const handleResetSide = (side: 1 | 2) =>
    setSelectedFlavors((prev) => ({
      ...prev,
      [side === 1 ? 'lado1' : 'lado2']: null,
    }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <ProductListModalHeader title={title} onClose={handleClose} />

        {category === 'meia-meia' && (
          <HalfAndHalfSelector
            selectedFlavors={selectedFlavors}
            selectingLado={selectingLado}
            erro={erro}
            onChooseSide={handleChooseSide}
            onResetSide={handleResetSide}
          />
        )}

        {selectingLado && (
          <p className="text-center text-creme-muted pt-4 px-4 text-sm">
            {selectingLado === 1 ? 'Escolha o 1º sabor' : 'Escolha o 2º sabor'}
          </p>
        )}

        <div className="p-4">
          <div className="space-y-3">
            {products.map((product) => {
              const isSelected =
                category === 'meia-meia' && selectingLado
                  ? selectedFlavors[`lado${selectingLado}`]?.id === product.id
                  : false;

              return (
                <ProductOptionCard
                  key={product.id}
                  product={product}
                  category={category}
                  isSelected={isSelected}
                  onSelect={handleProductSelect}
                  formatarPreco={formatarPreco}
                />
              );
            })}
          </div>
        </div>

        <ProductListModalFooter onClose={handleClose} onAddToCart={handleAddToCart} />
      </div>
    </div>
  );
}
