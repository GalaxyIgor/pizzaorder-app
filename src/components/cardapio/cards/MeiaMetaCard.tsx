// src/components/cardapio/MeiaMetaCard.tsx
'use client';

import type { ComboMeiaMeia } from '@/types/product-list-modal';
import { formatarPreco } from '@/lib/cardapio';
import { useCart } from '@/contexts/CartContext';
import Image from 'next/image';

interface MeiaMetaCardProps {
  combo: ComboMeiaMeia;
}

export function MeiaMetaCard({ combo }: MeiaMetaCardProps) {
  const { addCombo } = useCart();

  return (
    <div className="bg-white border border-borda-suave rounded-lg p-4 flex flex-col gap-4 shadow-xs">
      <div>
        <h3 className="font-semibold text-base text-carbono">{combo.nome}</h3>

        <div className="flex gap-2 mt-2">
          <div className="bg-ouro/10 flex-1 px-2 py-1 rounded text-xs font-medium text-carbono">
            {combo.produto1.nome}
          </div>
          <div className="bg-pomodoro/10 flex-1 px-2 py-1 rounded text-xs font-medium text-carbono">
            {combo.produto2.nome}
          </div>
        </div>

        <p className="text-xs text-creme-muted leading-relaxed mt-2">
          {combo.descricao}
        </p>
      </div>

      <div className="flex justify-between items-center gap-3">
        <span className="font-bold text-manjericao">
          {formatarPreco(combo.preco)}
        </span>
        <button
          type="button"
          onClick={() => addCombo(combo)}
          className="bg-pomodoro hover:bg-pomodoro-hover text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer active:scale-[0.98]"
        >
          Adicionar
        </button>
      </div>

      {combo.imagem_url && (
        <div className="relative w-full h-40">
          <Image
            src={combo.imagem_url}
            alt={combo.nome}
            fill
            sizes="100vw"
            className="object-cover rounded-md"
          />
        </div>
      )}
    </div>
  );
}