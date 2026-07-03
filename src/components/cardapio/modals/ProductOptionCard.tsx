import Image from 'next/image';
import type { Produto } from '@/types/cardapio';
import { menorPreco } from '@/lib/cardapio';
import type { ProductListModalCategory } from '@/types/product-list-modal';

interface ProductOptionCardProps {
  product: Produto;
  category: ProductListModalCategory;
  isSelected: boolean;
  onSelect: (product: Produto) => void;
  formatarPreco: (preco: number) => string;
}

export function ProductOptionCard({
  product,
  category,
  isSelected,
  onSelect,
  formatarPreco,
}: ProductOptionCardProps) {
  return (
    <div
      onClick={() => onSelect(product)}
      className={`flex gap-4 p-3 rounded-lg border-2 transition-all cursor-pointer ${
        isSelected
          ? 'border-ouro bg-ouro/5'
          : category === 'meia-meia'
            ? 'border-borda-suave hover:border-ouro/50'
            : 'border-borda-suave hover:border-ouro'
      }`}
    >
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
            <span className="text-2xl">🍕</span>
          </div>
        )}
      </div>

      <div className="flex-1">
        <h3 className="font-display font-semibold text-carbono text-lg">{product.nome}</h3>
        <p className="text-sm text-creme-muted mb-2">{product.descricao}</p>

        {category === 'bebidas' && product.variacoes_produto[0]?.tamanho && (
          <p className="text-xs text-ouro font-semibold mb-2">{product.variacoes_produto[0].tamanho}</p>
        )}

        <p className="font-display text-lg font-bold text-pomodoro">
          {formatarPreco(menorPreco(product))}
        </p>
      </div>

      {isSelected && (
        <div className="flex items-center justify-center text-ouro text-2xl">✓</div>
      )}
    </div>
  );
}
