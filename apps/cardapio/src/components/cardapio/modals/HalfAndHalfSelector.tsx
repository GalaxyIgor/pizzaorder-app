import type { SelectedFlavors } from '@/types/product-list-modal';

interface HalfAndHalfSelectorProps {
  selectedFlavors: SelectedFlavors;
  selectingLado: 1 | 2 | null;
  erro: string | null;
  onChooseSide: (side: 1 | 2) => void;
  onResetSide: (side: 1 | 2) => void;
}

// Barra compacta e sticky: precisa ocupar pouca altura para não cobrir a
// lista de sabores no celular — todo o detalhe fica nos cards da lista.
export function HalfAndHalfSelector({
  selectedFlavors,
  selectingLado,
  erro,
  onChooseSide,
  onResetSide,
}: HalfAndHalfSelectorProps) {
  return (
    <div className="bg-white border-b border-borda-suave shadow-xs p-3 sm:p-4">
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {[1, 2].map((side) => {
          const flavor = side === 1 ? selectedFlavors.lado1 : selectedFlavors.lado2;
          const isSelecting = selectingLado === side;

          const containerClass = isSelecting
            ? side === 1
              ? 'border-ouro bg-ouro/15'
              : 'border-pomodoro bg-pomodoro/15'
            : flavor
            ? side === 1
              ? 'border-ouro/50 bg-ouro/5'
              : 'border-pomodoro/50 bg-pomodoro/5'
            : 'border-dashed border-borda-suave bg-white hover:border-carbono/40';

          const status = isSelecting ? 'Escolhendo…' : flavor ? '' : 'A escolher';

          return (
            <div
              key={side}
              className={`relative rounded-xl border-2 transition-colors ${containerClass}`}
            >
              <button
                type="button"
                aria-pressed={isSelecting}
                onClick={() => onChooseSide(side as 1 | 2)}
                className={`w-full text-left cursor-pointer rounded-[10px] p-2.5 sm:p-3 ${flavor ? 'pr-11' : ''}`}
              >
                <span className={`block text-[10px] font-semibold uppercase tracking-[0.18em] truncate ${side === 1 ? 'text-ouro-escuro' : 'text-pomodoro'}`}>
                  Lado {side}
                  {status && <span className="text-creme-muted font-medium normal-case tracking-normal"> · {status}</span>}
                </span>
                <span className={`block font-display text-sm font-semibold mt-0.5 truncate ${flavor ? 'text-carbono' : 'text-creme-muted'}`}>
                  {flavor?.nome ?? 'Toque e escolha abaixo'}
                </span>
              </button>

              {flavor && (
                <button
                  type="button"
                  aria-label={`Remover sabor do lado ${side}`}
                  onClick={() => onResetSide(side as 1 | 2)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full text-lg font-bold text-creme-muted hover:text-pomodoro hover:bg-pomodoro/10 transition-colors"
                >
                  <span aria-hidden="true">×</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {erro && <p role="alert" className="text-pomodoro text-sm mt-2 font-medium">{erro}</p>}
    </div>
  );
}
