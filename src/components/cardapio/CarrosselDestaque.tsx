// src/components/cardapio/CarrosselDestaque.tsx
'use client';

import Image from 'next/image';
import { formatarPreco } from '@/lib/cardapio';

export interface DestaqueProduto {
  id: string;
  nome: string;
  preco: number;
  imagemUrl?: string;
  categoria: 'Pizza' | 'MeiaMeia' | 'Bebida';
  badge?: string;
}

interface CarrosselDestaqueProps {
  produtos: DestaqueProduto[];
  onAdd: (id: string) => void;
}

export function CarrosselDestaque({ produtos, onAdd }: CarrosselDestaqueProps) {
  return (
    <div className="mb-8">
      <h2 className="font-display text-2xl font-bold mb-4 text-carbono">
        Mais Popular e Pedido
      </h2>

      <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none]">
        {produtos.map((produto) => (
          <div
            key={produto.id}
            className="flex-shrink-0 w-48 bg-white border border-borda-suave rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            {produto.imagemUrl && (
              <div className="relative w-full h-32">
                <Image
                  src={produto.imagemUrl}
                  alt={produto.nome}
                  fill
                  sizes="200px"
                  className="object-cover"
                />
                {produto.badge && (
                  <div className="absolute top-2 right-2 bg-pomodoro text-white text-xs font-bold px-2 py-1 rounded-full">
                    {produto.badge}
                  </div>
                )}
              </div>
            )}

            <div className="p-3">
              <h3 className="font-semibold text-sm text-carbono truncate">
                {produto.nome}
              </h3>
              <span className="block mt-1 font-bold text-manjericao">
                {formatarPreco(produto.preco)}
              </span>
              <button
                type="button"
                onClick={() => onAdd(produto.id)}
                className="mt-2 w-full bg-pomodoro hover:bg-pomodoro-hover text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer active:scale-[0.98]"
              >
                Adicionar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}