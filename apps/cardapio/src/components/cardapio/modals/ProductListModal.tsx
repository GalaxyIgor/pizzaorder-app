'use client';

import { useState } from 'react';
import type { Produto } from '@/types/cardapio';
import type { ComboMeiaMeia, ProductListModalProps, SelectedFlavors } from '@/types/product-list-modal';
import { ProductListModalHeader } from '@/components/cardapio/modals/ProductListModalHeader';
import { HalfAndHalfSelector } from '@/components/cardapio/modals/HalfAndHalfSelector';
import { ProductOptionCard } from '@/components/cardapio/modals/ProductOptionCard';
import { ComboOptionCard } from '@/components/cardapio/modals/ComboOptionCard';
import { ProductListModalFooter } from '@/components/cardapio/modals/ProductListModalFooter';
import { useProdutoDetalhe } from '@/contexts/ProdutoDetalheContext';
import { useCart } from '@/contexts/CartContext';
import { useCardapio } from '@/contexts/CardapioContext';
import { formatarPreco } from '@/lib/cardapio';

const FLAVORS_VAZIO: SelectedFlavors = { lado1: null, lado2: null };

export function ProductListModal({ isOpen, onClose, title, category, products, combos = [] }: ProductListModalProps) {
  const { adicionar, adicionarMeiaMeia } = useProdutoDetalhe();
  const { addCombo } = useCart();
  const { categorias } = useCardapio();
  const [selectedFlavors, setSelectedFlavors] = useState<SelectedFlavors>(FLAVORS_VAZIO);
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);
  const [selectedCombo, setSelectedCombo] = useState<ComboMeiaMeia | null>(null);
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
    setSelectedCombo(null);
    setSelectingLado(null);
    setErro(null);
    onClose();
  };

  const handleComboSelect = (combo: ComboMeiaMeia) => {
    setErro(null);
    setSelectedCombo((atual) => (atual?.id === combo.id ? null : combo));
  };

  const handleProductSelect = (product: Produto) => {
    if (category !== 'meia-meia') {
      // Clicar apenas seleciona (destaca). A confirmação é no botão "Adicionar ao Carrinho".
      // Clicar de novo no mesmo item desmarca.
      setErro(null);
      setSelectedProduct((atual) => (atual?.id === product.id ? null : product));
      return;
    }

    if (!ladoAtivo) {
      return;
    }

    setErro(null);
    setSelectedFlavors((prev) => {
      const next =
        ladoAtivo === 1
          ? { ...prev, lado1: product }
          : { ...prev, lado2: product };
      setSelectingLado(next.lado1 && next.lado2 ? null : ladoAtivo === 1 ? 2 : 1);
      return next;
    });
  };

  const handleAddToCart = () => {
    if (category === 'meia-meia') {
      if (!selectedFlavors.lado1 || !selectedFlavors.lado2) {
        setErro('Selecione os dois lados antes de continuar.');
        return;
      }
      // abre o passo de personalização (tamanho/borda/adicionais) quando houver o que escolher
      adicionarMeiaMeia(selectedFlavors.lado1, selectedFlavors.lado2);
    } else if (category === 'combos') {
      if (!selectedCombo) {
        setErro('Selecione um combo antes de adicionar.');
        return;
      }
      // combo tem preço fixo — adiciona direto, sem passo de personalização
      addCombo(selectedCombo);
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

  // Seções por categoria do cardápio (ex.: Tradicionais / Especiais / Doces),
  // na ordem definida pelo tenant. Título só aparece quando há mais de uma.
  const secoes = categorias
    .map((cat) => ({ cat, itens: products.filter((p) => p.categoria_id === cat.id) }))
    .filter((s) => s.itens.length > 0);
  const mostrarTitulos = secoes.length > 1;

  const renderProduto = (product: Produto) => {
    const selectedSide =
      category === 'meia-meia'
        ? selectedFlavors.lado1?.id === product.id && selectedFlavors.lado2?.id === product.id
          ? 'both'
          : selectedFlavors.lado1?.id === product.id
          ? 1
          : selectedFlavors.lado2?.id === product.id
          ? 2
          : null
        : selectedProduct?.id === product.id
          ? 1
          : null;

    return (
      <ProductOptionCard
        key={product.id}
        product={product}
        category={category}
        selectedSide={selectedSide}
        onSelect={handleProductSelect}
        formatarPreco={formatarPreco}
      />
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-lg max-w-2xl w-full max-h-[92dvh] sm:max-h-[85dvh] overflow-y-auto">
        {/* Cabeçalho + seletor de lados ficam juntos num único bloco sticky
            para o seletor não brigar com o cabeçalho ao rolar a lista. */}
        <div className="sticky top-0 z-20">
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
        </div>

        {ladoAtivo && (
          <p className="text-center text-creme-muted pt-4 px-4 text-sm">
            {ladoAtivo === 1 ? 'Escolha o 1º sabor' : 'Escolha o 2º sabor'}
          </p>
        )}

        <div className="p-4">
          {category !== 'meia-meia' && erro && (
            <p className="text-center text-pomodoro text-sm mb-3">{erro}</p>
          )}
          {category === 'combos' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
              {combos.map((combo) => (
                <ComboOptionCard
                  key={combo.id}
                  combo={combo}
                  isSelected={selectedCombo?.id === combo.id}
                  onSelect={handleComboSelect}
                  formatarPreco={formatarPreco}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {secoes.map(({ cat, itens }) => (
                <section key={cat.id}>
                  {mostrarTitulos && (
                    <div className="flex items-center gap-3 mb-3">
                      <h4 className="font-display text-lg font-bold text-carbono whitespace-nowrap">
                        {cat.nome}
                      </h4>
                      <span aria-hidden="true" className="flex-1 border-t border-borda-suave" />
                      <span className="text-xs text-creme-muted whitespace-nowrap">
                        {itens.length} {itens.length === 1 ? 'opção' : 'opções'}
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                    {itens.map(renderProduto)}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <ProductListModalFooter onClose={handleClose} onAddToCart={handleAddToCart} />
      </div>
    </div>
  );
}
