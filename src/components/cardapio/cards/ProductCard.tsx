// src/components/cardapio/ProductCard.tsx
'use client';

import type { Produto } from '@/types/cardapio';
import { formatarPreco, menorPreco } from '@/lib/cardapio';
import { useProdutoDetalhe } from '@/contexts/ProdutoDetalheContext';
import Image from 'next/image';

interface ProductCardProps {
  produto: Produto;
}

export function ProductCard({ produto }: ProductCardProps) {
  const { adicionar } = useProdutoDetalhe();

  return (
    <div className="bg-white border border-borda-suave rounded-lg p-4 flex flex-col gap-3 shadow-xs">
      {/* Linha: foto (esquerda) + título e valor (direita) */}
      <div className="flex gap-4 items-center w-full min-w-0">
        <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-massa-bg">
          {produto.imagem_url ? (
            <Image
              src={produto.imagem_url}
              alt={produto.nome}
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-ouro/20 to-pomodoro/20 flex items-center justify-center">
              <span className="text-3xl">🍕</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-carbono text-lg leading-tight">
            {produto.nome}
          </h3>
          <span className="block mt-1 font-display text-lg font-bold text-manjericao">
            {formatarPreco(menorPreco(produto))}
          </span>
        </div>
      </div>

      {/* Descrição em largura total, abaixo de tudo */}
      {produto.descricao && (
        <p className="text-sm text-creme-muted leading-relaxed">
          {produto.descricao}
        </p>
      )}

      <button
        type="button"
        onClick={() => adicionar(produto)}
        className="mt-auto w-full bg-pomodoro hover:bg-pomodoro-hover text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer active:scale-[0.98]"
      >
        Adicionar
      </button>
    </div>
  );
}