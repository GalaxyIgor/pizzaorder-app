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
  const isSelected = selectedSide !== null;

  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      aria-pressed={isSelected}
      className={`relative w-full flex flex-col gap-3 p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
        isSelected
          ? selectedSide === 1
            ? 'border-ouro bg-ouro/5 ring-1 ring-ouro'
            : selectedSide === 2
            ? 'border-pomodoro bg-pomodoro/5 ring-1 ring-pomodoro'
            : 'border-ouro/70 bg-gradient-to-r from-ouro/10 via-white to-pomodoro/10 ring-1 ring-ouro/50'
          : 'border-borda-suave hover:border-ouro/60 hover:shadow-sm'
      }`}
    >
      {/* Linha: foto (esquerda) + título e valor (direita) */}
      <div className="flex gap-4 items-center w-full min-w-0">
        <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-massa-bg">
          {product.imagem_url ? (
            <Image
              src={product.imagem_url}
              alt={product.nome}
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-ouro/20 to-pomodoro/20 flex items-center justify-center">
              <span className="text-3xl">🍕</span>
            </div>
          )}
          {isSelected && (
            <div className="absolute top-1 right-1 w-10 h-10 rounded-md overflow-hidden shadow-md border border-white/70">
              {selectedSide === 'both' ? (
                <div className="flex h-full w-full">
                  <div className="flex-1 bg-ouro flex items-center justify-center text-[10px] font-bold text-white">1</div>
                  <div className="flex-1 bg-pomodoro flex items-center justify-center text-[10px] font-bold text-white">2</div>
                </div>
              ) : (
                <div className={`flex h-full w-full items-center justify-center text-sm font-semibold text-white ${
                  selectedSide === 1 ? 'bg-ouro' : 'bg-pomodoro'
                }`}>
                  {selectedSide}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-carbono text-lg leading-tight">
            {product.nome}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-display text-lg font-bold text-pomodoro">
              {formatarPreco(menorPreco(product))}
            </span>
            {tamanhoBebida && (
              <span className="bg-ouro/10 text-ouro text-xs font-semibold px-2 py-0.5 rounded-full">
                {tamanhoBebida}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Descrição em largura total, abaixo de tudo */}
      {product.descricao && (
        <p className="text-sm text-creme-muted leading-relaxed">
          {product.descricao}
        </p>
      )}
    </button>
  );
}