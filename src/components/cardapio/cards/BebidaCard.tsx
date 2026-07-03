// src/components/cardapio/BebidaCard.tsx
'use client';

import type { Produto } from "@/types/cardapio";
import { formatarPreco, menorPreco } from "@/lib/cardapio";
import { useCart } from "@/contexts/CartContext";
import Image from 'next/image';

interface BebidaCardProps {
  bebida: Produto;
}

export function BebidaCard({ bebida }: BebidaCardProps) {
  const { addProduto } = useCart();
  const volume = bebida.variacoes_produto[0]?.tamanho;

  return (
    <div className="bg-white border border-borda-suave rounded-lg p-4 flex flex-col gap-3 shadow-xs">
      {/* Linha: foto (esquerda) + título e valor (direita) */}
      <div className="flex gap-4 items-center w-full min-w-0">
        <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-massa-bg">
          {bebida.imagem_url ? (
            <Image
              src={bebida.imagem_url}
              alt={bebida.nome}
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-ouro/20 to-pomodoro/20 flex items-center justify-center">
              <span className="text-3xl">🥤</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-carbono text-lg leading-tight">
            {bebida.nome}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-display text-lg font-bold text-manjericao">
              {formatarPreco(menorPreco(bebida))}
            </span>
            {volume && (
              <span className="bg-ouro/10 text-ouro text-xs font-semibold px-2 py-0.5 rounded-full">
                {volume}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Descrição em largura total, abaixo de tudo */}
      {bebida.descricao && (
        <p className="text-sm text-creme-muted leading-relaxed">
          {bebida.descricao}
        </p>
      )}

      <button
        type="button"
        onClick={() => addProduto(bebida)}
        className="mt-auto w-full bg-pomodoro hover:bg-pomodoro-hover text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer active:scale-[0.98]"
      >
        Adicionar
      </button>
    </div>
  );
}