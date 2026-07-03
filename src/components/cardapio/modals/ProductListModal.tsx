'use client';

import { useState } from 'react';
import type { Produto } from '@/types/cardapio';
import type { ProductListModalProps, SelectedFlavors } from '@/types/product-list-modal';
import { ProductListModalHeader } from '@/components/cardapio/modals/ProductListModalHeader';
import { HalfAndHalfSelector } from '@/components/cardapio/modals/HalfAndHalfSelector';
import { ProductOptionCard } from '@/components/cardapio/modals/ProductOptionCard';
import { ProductListModalFooter } from '@/components/cardapio/modals/ProductListModalFooter';
import { useCart } from '@/contexts/CartContext';
import { useProdutoDetalhe } from '@/contexts/ProdutoDetalheContext';
import { formatarPreco } from '@/lib/cardapio';

const FLAVORS_VAZIO: SelectedFlavors = { lado1: null, lado2: null };

export function ProductListModal({ isOpen, onClose, title, category, products }: ProductListModalProps) {
  const { addMeiaMeia } = useCart();
  const { adicionar } = useProdutoDetalhe();
  const [selectedFlavors, setSelectedFlavors] = useState<SelectedFlavors>(FLAVORS_VAZIO);
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);
  const [selectingLado, setSelectingLado] = useState<1 | 2 | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  if (!isOpen) return null;

  // Lado que está sendo escolhido no meia-meia: usa o explícito (após "trocar"),
  // senão o próximo lado vazio — assim o modal já abre escolhendo o 1º sabor.
  const ladoAtivo: 1 | 2 | null =
    category !== 'meia-meia'
      ? null
      : selectingLado ?? (!selectedFlavors.lado1 ? 1 : !selectedFlavors.lado2 ? 2 : null);

  const handleClose = () => {
    setSelectedFlavors(FLAVORS_VAZIO);
    setSelectedProduct(null);
    setSelectingLado(null);
    setErro(null);
    onClose();
  };

  const handleProductSelect = (product: Produto) => {
    if (category !== 'meia-meia') {
      // Clicar apenas seleciona (destaca). A confirmação é no botão "Adicionar ao Carrinho".
      // Clicar de novo no mesmo item desmarca.
      setErro(null);
      setSelectedProduct((atual) => (atual?.id === product.id ? null : product));
      return;
    }

    if (ladoAtivo === 1) {
      setErro(null);
      setSelectedFlavors((prev) => ({ ...prev, lado1: product }));
      setSelectingLado(2);
    } else if (ladoAtivo === 2) {
      // Sabores iguais são permitidos (pizza inteira de um sabor só).
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
      addMeiaMeia(selectedFlavors.lado1, selectedFlavors.lado2);
    } else {
      if (!selectedProduct) {
        setErro('Selecione um item antes de adicionar.');
        return;
      }
      // pizzas abrem o passo de personalização; bebidas são adicionadas direto (decidido em `adicionar`)
      adicionar(selectedProduct);
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
            selectingLado={ladoAtivo}
            erro={erro}
            onChooseSide={handleChooseSide}
            onResetSide={handleResetSide}
          />
        )}

        {ladoAtivo && (
          <p className="text-center text-creme-muted pt-4 px-4 text-sm">
            {ladoAtivo === 1 ? 'Escolha o 1º sabor' : 'Escolha o 2º sabor'}
          </p>
        )}

        <div className="p-4">
          {category !== 'meia-meia' && erro && (
            <p className="text-center text-pomodoro text-sm mb-3">{erro}</p>
          )}
          <div className="space-y-3">
            {products.map((product) => {
              const isSelected =
                category === 'meia-meia'
                  ? (ladoAtivo
                      ? selectedFlavors[`lado${ladoAtivo}`]?.id === product.id
                      : false)
                  : selectedProduct?.id === product.id;

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
