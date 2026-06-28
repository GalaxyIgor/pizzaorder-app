// src/components/cliente/ProductCard.tsx
import type { ProdutoBase } from '@/src/types/types';
import Image from 'next/image';

interface ProductCardProps {
  produto: ProdutoBase;
}

export function ProductCard({ produto }: ProductCardProps) {
  return (
    <div className="bg-white border border-borda-suave rounded-lg p-4 flex flex-col md:flex-row items-start gap-4 shadow-xs">
      <div className="flex flex-col flex-1">
        <h3 className="font-semibold text-base text-carbono">{produto.nome}</h3>
        <p className="text-xs text-creme-muted leading-relaxed mt-1 mb-2 line-clamp-2">
          {produto.descricao}
        </p>
        <span className="font-bold text-manjericao mt-auto">
          {produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      </div>

      {produto.imagemUrl && (
        <div className="relative w-full h-40 md:w-24 md:h-24 flex-shrink-0">
          <Image
            src={produto.imagemUrl}
            alt={produto.nome}
            fill
            sizes="(max-width: 768px) 100vw, 96px"
            className="object-cover rounded-md"
          />
          <button className="absolute -bottom-1 -right-1 bg-pomodoro hover:bg-pomodoro-hover text-white w-7 h-7 rounded-full text-lg font-bold flex items-center justify-center shadow-md transition-colors cursor-pointer">
            +
          </button>
        </div>
      )}
    </div>
  );
}