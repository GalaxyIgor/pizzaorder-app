import Image from 'next/image';
import type { ComboMeiaMeia } from '@/types/product-list-modal';

interface ComboOptionCardProps {
  combo: ComboMeiaMeia;
  onSelect: (combo: ComboMeiaMeia) => void;
  formatarPreco: (preco: number) => string;
}

export function ComboOptionCard({ combo, onSelect, formatarPreco }: ComboOptionCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(combo)}
      className="relative w-full flex flex-col gap-3 p-4 rounded-3xl border-2 text-left transition cursor-pointer border-borda-suave hover:border-ouro/60 hover:shadow-sm"
    >
      <div className="flex gap-4 items-center w-full min-w-0">
        <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-massa-bg">
          {combo.imagem_url ? (
            <Image
              src={combo.imagem_url}
              alt=""
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            <div
              aria-hidden="true"
              className="w-full h-full bg-linear-to-br from-ouro/20 to-pomodoro/20 flex items-center justify-center"
            >
              <span className="text-3xl">🍕🥤</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-carbono text-lg leading-tight">
            {combo.nome}
          </h3>
          <span className="font-display text-lg font-bold text-pomodoro tabular-nums">
            {formatarPreco(combo.preco)}
          </span>
        </div>

        {/* Atalho visual: um toque já adiciona */}
        <span
          aria-hidden="true"
          className="w-9 h-9 flex-shrink-0 rounded-full bg-pomodoro text-white text-xl font-bold flex items-center justify-center shadow-sm"
        >
          +
        </span>
      </div>

      <div className="flex gap-2">
        <span className="bg-ouro/10 flex-1 px-2 py-1 rounded text-xs font-medium text-carbono truncate">
          {combo.produto1.nome}
        </span>
        <span className="bg-pomodoro/10 flex-1 px-2 py-1 rounded text-xs font-medium text-carbono truncate">
          {combo.produto2.nome}
        </span>
      </div>

      {combo.descricao && (
        <p className="text-sm text-creme-muted leading-relaxed">{combo.descricao}</p>
      )}
    </button>
  );
}
