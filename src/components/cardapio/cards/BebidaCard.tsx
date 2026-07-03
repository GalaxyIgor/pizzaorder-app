// src/components/cardapio/BebidaCard.tsx
import type { Produto } from "@/types/cardapio";
import { menorPreco } from "@/lib/cardapio";
import Image from 'next/image';

interface BebidaCardProps {
  bebida: Produto;
}

export function BebidaCard({ bebida }: BebidaCardProps) {
  const volume = bebida.variacoes_produto[0]?.tamanho;

  return (
    <div className="bg-white border border-borda-suave rounded-lg p-4 flex flex-col md:flex-row items-start gap-4 shadow-xs">
      <div className="flex flex-col flex-1">
        <h3 className="font-semibold text-base text-carbono">{bebida.nome}</h3>
        <p className="text-xs text-creme-muted leading-relaxed mt-1 mb-1">
          {bebida.descricao}
        </p>
        {volume && (
          <p className="text-xs text-creme-muted font-medium mb-2">
            {volume}
          </p>
        )}
        <span className="font-bold text-manjericao mt-auto">
          {menorPreco(bebida).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      </div>

      {bebida.imagem_url && (
        <div className="relative w-full h-40 md:w-24 md:h-24 flex-shrink-0">
          <Image
            src={bebida.imagem_url}
            alt={bebida.nome}
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
