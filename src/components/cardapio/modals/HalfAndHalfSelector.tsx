import type { SelectedFlavors } from '@/types/product-list-modal';

interface HalfAndHalfSelectorProps {
  selectedFlavors: SelectedFlavors;
  selectingLado: 1 | 2 | null;
  erro: string | null;
  onChooseSide: (side: 1 | 2) => void;
  onResetSide: (side: 1 | 2) => void;
}

export function HalfAndHalfSelector({
  selectedFlavors,
  selectingLado,
  erro,
  onChooseSide,
  onResetSide,
}: HalfAndHalfSelectorProps) {
  return (
    <div className="sticky top-0 z-20 bg-white p-4 border-b border-borda-suave">
      <p className="font-display text-lg font-semibold text-carbono mb-3">
        Selecione os 2 lados:
      </p>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2].map((side) => {
          const flavor = side === 1 ? selectedFlavors.lado1 : selectedFlavors.lado2;
          const isSelecting = selectingLado === side;
          const active = isSelecting || Boolean(flavor);
          return (
            <div
              key={side}
              role="button"
              tabIndex={0}
              onClick={() => onChooseSide(side as 1 | 2)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onChooseSide(side as 1 | 2);
                }
              }}
              className={`relative flex h-full min-h-[170px] cursor-pointer flex-col justify-between p-3 rounded-lg border-2 transition-all ${
                isSelecting
                  ? 'border-ouro bg-ouro/20 shadow-sm'
                  : active
                  ? side === 1
                    ? 'border-ouro bg-ouro/10'
                    : 'border-pomodoro bg-pomodoro/10'
                  : 'border-borda-suave'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-creme-muted">Lado {side}:</p>
                    {isSelecting && (
                      <span className="rounded-full bg-ouro/20 text-ouro text-[11px] font-semibold px-2 py-1">
                        escolhendo
                      </span>
                    )}
                  </div>
                  {flavor && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onResetSide(side as 1 | 2);
                      }}
                      className="text-sm font-bold text-creme-muted hover:text-pomodoro"
                    >
                      ×
                    </button>
                  )}
                </div>

                {flavor ? (
                  <p className="text-carbono font-medium">{flavor.nome}</p>
                ) : (
                  <p className="text-pomodoro font-semibold text-base">Escolher sabor</p>
                )}
              </div>

              <div className="mt-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onChooseSide(side as 1 | 2);
                  }}
                  className="w-full inline-flex items-center justify-center rounded-md border border-pomodoro/20 bg-pomodoro/5 px-3 py-2 text-pomodoro hover:bg-pomodoro/10 hover:text-pomodoro/90 font-semibold text-base"
                >
                  trocar sabor
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {erro && (
        <p className="text-pomodoro text-sm mt-3 font-medium">{erro}</p>
      )}
    </div>
  );
}
