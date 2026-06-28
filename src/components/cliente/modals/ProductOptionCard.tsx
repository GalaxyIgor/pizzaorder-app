import Image from 'next/image';
import type { ProdutoCardapio } from '@/src/types/types';
import type { ProductListModalCategory } from '@/src/types/ProductListModal.types';

interface ProductOptionCardProps {
  product: ProdutoCardapio;
  category: ProductListModalCategory;
  isSelected: boolean;
  onSelect: (product: ProdutoCardapio) => void;
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
        {product.imagemUrl ? (
          <Image
            src={product.imagemUrl}
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

        {product.categoria === 'Bebida' && product.volume && (
          <p className="text-xs text-ouro font-semibold mb-2">{product.volume}</p>
        )}

        {product.categoria === 'MeiaMeia' && (
          <p className="text-xs text-creme-muted mb-2">
            {product.sabor1.nome} + {product.sabor2.nome}
          </p>
        )}

        <p className="font-display text-lg font-bold text-pomodoro">
          {formatarPreco(product.preco)}
        </p>
      </div>

      {isSelected && (
        <div className="flex items-center justify-center text-ouro text-2xl">✓</div>
      )}
    </div>
  );
}
