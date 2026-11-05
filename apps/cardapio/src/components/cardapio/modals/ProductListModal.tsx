'use client';

// Lista de produtos de uma categoria. Fora do meia-meia, um toque no card já
// segue o pedido: pizza abre a personalização (tamanho/borda), bebida e
// sobremesa sem opções vão direto para a sacola, combo entra com preço fechado.
// Só o meia-meia tem confirmação no rodapé, porque precisa dos dois sabores.

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
import { useDialog } from '@/hooks/useDialog';
import { formatarPreco } from '@/lib/cardapio';

const FLAVORS_VAZIO: SelectedFlavors = { lado1: null, lado2: null };
const TITULO_ID = 'product-list-modal-titulo';

export function ProductListModal({ isOpen, onClose, title, category, products, combos = [] }: ProductListModalProps) {
  const { adicionar, adicionarMeiaMeia } = useProdutoDetalhe();
  const { addCombo } = useCart();
  const { categorias } = useCardapio();
  const [selectedFlavors, setSelectedFlavors] = useState<SelectedFlavors>(FLAVORS_VAZIO);
  const [selectingLado, setSelectingLado] = useState<1 | 2 | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const handleClose = () => {
    setSelectedFlavors(FLAVORS_VAZIO);
    setSelectingLado(null);
    setErro(null);
    onClose();
  };

  const painelRef = useDialog<HTMLDivElement>(isOpen, handleClose);

  if (!isOpen) return null;

  const isMeiaMeia = category === 'meia-meia';

  // Lado que está sendo escolhido no meia-meia: usa o explícito (após "trocar"),
  // senão o próximo lado vazio — assim o modal já abre escolhendo o 1º sabor.
  const ladoAtivo: 1 | 2 | null = !isMeiaMeia
    ? null
    : selectingLado ?? (!selectedFlavors.lado1 ? 1 : !selectedFlavors.lado2 ? 2 : null);
  const meiaMeiaCompleta = !!selectedFlavors.lado1 && !!selectedFlavors.lado2;

  const handleComboSelect = (combo: ComboMeiaMeia) => {
    // combo tem preço fixo — adiciona direto, sem passo de personalização
    addCombo(combo);
    handleClose();
  };

  const handleProductSelect = (product: Produto) => {
    if (!isMeiaMeia) {
      // pizzas abrem o passo de personalização; bebidas sem opções entram direto (decidido em `adicionar`)
      adicionar(product);
      handleClose();
      return;
    }

    if (!ladoAtivo) return;

    setErro(null);
    setSelectedFlavors((prev) => {
      const next = ladoAtivo === 1 ? { ...prev, lado1: product } : { ...prev, lado2: product };
      setSelectingLado(next.lado1 && next.lado2 ? null : ladoAtivo === 1 ? 2 : 1);
      return next;
    });
  };

  const handleContinuarMeiaMeia = () => {
    if (!selectedFlavors.lado1 || !selectedFlavors.lado2) {
      setErro('Escolha os dois sabores para continuar.');
      return;
    }
    // abre o passo de personalização (tamanho/borda/adicionais) quando houver o que escolher
    adicionarMeiaMeia(selectedFlavors.lado1, selectedFlavors.lado2);
    handleClose();
  };

  const handleChooseSide = (side: 1 | 2) => setSelectingLado(side);
  const handleResetSide = (side: 1 | 2) => {
    setSelectedFlavors((prev) => ({
      ...prev,
      [side === 1 ? 'lado1' : 'lado2']: null,
    }));
    setSelectingLado(side);
  };

  // Seções por categoria do cardápio (ex.: Tradicionais / Especiais / Doces),
  // na ordem definida pelo tenant. Título só aparece quando há mais de uma.
  const secoes = categorias
    .map((cat) => ({ cat, itens: products.filter((p) => p.categoria_id === cat.id) }))
    .filter((s) => s.itens.length > 0);
  const mostrarTitulos = secoes.length > 1;

  const renderProduto = (product: Produto) => {
    const selectedSide = isMeiaMeia
      ? selectedFlavors.lado1?.id === product.id && selectedFlavors.lado2?.id === product.id
        ? 'both'
        : selectedFlavors.lado1?.id === product.id
        ? 1
        : selectedFlavors.lado2?.id === product.id
        ? 2
        : null
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

  const listaVazia = category === 'combos' ? combos.length === 0 : secoes.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} aria-hidden="true" />
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITULO_ID}
        className="relative bg-white rounded-t-2xl sm:rounded-lg max-w-2xl w-full max-h-[92dvh] sm:max-h-[85dvh] overflow-y-auto overscroll-contain"
      >
        {/* Cabeçalho + seletor de lados ficam juntos num único bloco sticky
            para o seletor não brigar com o cabeçalho ao rolar a lista. */}
        <div className="sticky top-0 z-20">
          <ProductListModalHeader id={TITULO_ID} title={title} onClose={handleClose} />

          {isMeiaMeia && (
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
          <p aria-live="polite" className="text-center text-creme-muted pt-4 px-4 text-sm">
            {ladoAtivo === 1 ? 'Toque no 1º sabor' : 'Toque no 2º sabor'}
          </p>
        )}

        <div className="p-4">
          {listaVazia ? (
            <p className="text-center text-creme-muted text-sm py-10">
              Nenhuma opção disponível nesta categoria no momento.
            </p>
          ) : category === 'combos' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
              {combos.map((combo) => (
                <ComboOptionCard
                  key={combo.id}
                  combo={combo}
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
                      <h3 className="font-display text-lg font-bold text-carbono whitespace-nowrap">
                        {cat.nome}
                      </h3>
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

        {isMeiaMeia && (
          <ProductListModalFooter
            podeContinuar={meiaMeiaCompleta}
            onClose={handleClose}
            onContinue={handleContinuarMeiaMeia}
          />
        )}
      </div>
    </div>
  );
}
