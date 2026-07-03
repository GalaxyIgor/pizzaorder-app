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
    <div className="bg-ouro/5 p-4 border-b border-borda-suave">
      <p className="font-display text-lg font-semibold text-carbono mb-3">
        Selecione os 2 lados:
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className={`p-3 rounded-lg border-2 transition-all ${
          selectingLado === 1 || selectedFlavors.lado1
            ? 'border-ouro bg-ouro/10'
            : 'border-borda-suave'
        }`}>
          <p className="text-sm font-semibold text-creme-muted mb-1">Lado 1:</p>
          {selectedFlavors.lado1 ? (
            <div className="flex justify-between items-center">
              <p className="text-carbono font-medium">{selectedFlavors.lado1.nome}</p>
              <button
                onClick={() => {
                  onResetSide(1);
                  onChooseSide(1);
                }}
                className="text-xs text-creme-muted hover:text-pomodoro ml-2"
              >
                trocar
              </button>
            </div>
          ) : (
            <button
              onClick={() => onChooseSide(1)}
              className="text-pomodoro hover:text-pomodoro/80 font-semibold text-sm"
            >
              Escolher
            </button>
          )}
        </div>

        <div className={`p-3 rounded-lg border-2 transition-all ${
          selectingLado === 2 || selectedFlavors.lado2
            ? 'border-pomodoro bg-pomodoro/10'
            : 'border-borda-suave'
        }`}>
          <p className="text-sm font-semibold text-creme-muted mb-1">Lado 2:</p>
          {selectedFlavors.lado2 ? (
            <div className="flex justify-between items-center">
              <p className="text-carbono font-medium">{selectedFlavors.lado2.nome}</p>
              <button
                onClick={() => {
                  onResetSide(2);
                  onChooseSide(2);
                }}
                className="text-xs text-creme-muted hover:text-pomodoro ml-2"
              >
                trocar
              </button>
            </div>
          ) : (
            <button
              onClick={() => onChooseSide(2)}
              disabled={!selectedFlavors.lado1}
              className="text-pomodoro hover:text-pomodoro/80 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Escolher
            </button>
          )}
        </div>
      </div>

      {erro && (
        <p className="text-pomodoro text-sm mt-3 font-medium">{erro}</p>
      )}
    </div>
  );
}
