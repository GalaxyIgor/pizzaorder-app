import Image from 'next/image';
import type { Produto } from '@/types/cardapio';
import { menorPreco } from '@/lib/cardapio';
import type { ProductListModalCategory } from '@/types/product-list-modal';

export type SelectedSide = 1 | 2 | 'both' | null;

interface ProductOptionCardProps {
  product: Produto;
  category: ProductListModalCategory;
  selectedSide: SelectedSide;
  onSelect: (product: Produto) => void;
  formatarPreco: (preco: number) => string;
}

export function ProductOptionCard({
  product,
  category,
  selectedSide,
  onSelect,
  formatarPreco,
}: ProductOptionCardProps) {
  const tamanhoBebida = category === 'bebidas' ? product.variacoes_produto[0]?.tamanho : null;
  const isMeiaMeia = category === 'meia-meia';
  const isSelected = selectedSide !== null;
  // pizza com mais de um tamanho mostra "a partir de" — o preço final sai na personalização
  const variosTamanhos = product.variacoes_produto.filter((v) => v.disponivel).length > 1;

  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      aria-pressed={isMeiaMeia ? isSelected : undefined}
      className={`relative w-full flex flex-col gap-2 p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
        isSelected
          ? selectedSide === 1
            ? 'border-ouro bg-ouro/5 ring-1 ring-ouro shadow-xs'
            : selectedSide === 2
            ? 'border-pomodoro bg-pomodoro/5 ring-1 ring-pomodoro shadow-xs'
            : 'border-ouro/70 bg-linear-to-r from-ouro/10 via-white to-pomodoro/10 ring-1 ring-ouro/50 shadow-xs'
          : 'border-borda-suave hover:border-ouro/60 hover:shadow-sm'
      }`}
    >
      {/* Linha: foto (esquerda) + título e valor (direita) */}
      <div className="flex gap-3 items-center w-full min-w-0">
        <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-massa-bg">
          {product.imagem_url ? (
            <Image
              src={product.imagem_url}
              alt=""
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="w-full h-full bg-linear-to-br from-ouro/20 to-pomodoro/20 flex items-center justify-center"
            >
              <span className="text-2xl">{category === 'bebidas' ? '🥤' : category === 'sobremesas' ? '🍫' : '🍕'}</span>
            </div>
          )}
          {isSelected && (
            <span
              className={`absolute right-1 top-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase shadow-sm ${
                selectedSide === 'both'
                  ? 'bg-linear-to-r from-ouro to-pomodoro text-white'
                  : selectedSide === 1
                  ? 'bg-ouro text-carbono'
                  : 'bg-pomodoro text-white'
              }`}
            >
              {selectedSide === 'both' ? '1 + 2' : `Lado ${selectedSide}`}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-display font-semibold text-carbono text-base leading-tight">
            {product.nome}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-display text-base font-bold text-pomodoro tabular-nums">
              {!isMeiaMeia && variosTamanhos && (
                <span className="font-sans text-xs font-medium text-creme-muted">a partir de </span>
              )}
              {formatarPreco(menorPreco(product))}
            </span>
            {tamanhoBebida && (
              <span className="bg-ouro/15 text-ouro-escuro text-xs font-semibold px-2 py-0.5 rounded-full">
                {tamanhoBebida}
              </span>
            )}
          </div>
        </div>

        {/* Atalho visual: um toque já adiciona/personaliza */}
        {!isMeiaMeia && (
          <span
            aria-hidden="true"
            className="w-9 h-9 flex-shrink-0 rounded-full bg-pomodoro text-white text-xl font-bold flex items-center justify-center shadow-sm"
          >
            +
          </span>
        )}
      </div>

      {/* Descrição em largura total, abaixo de tudo */}
      {product.descricao && (
        <p className="text-xs text-creme-muted leading-relaxed line-clamp-2">
          {product.descricao}
        </p>
      )}
    </button>
  );
}
