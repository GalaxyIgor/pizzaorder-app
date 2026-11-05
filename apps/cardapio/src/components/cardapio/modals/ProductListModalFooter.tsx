interface ProductListModalFooterProps {
  /** true quando os dois sabores do meia-meia já foram escolhidos */
  podeContinuar: boolean;
  onClose: () => void;
  onContinue: () => void;
}

export function ProductListModalFooter({ podeContinuar, onClose, onContinue }: ProductListModalFooterProps) {
  return (
    <div className="sticky bottom-0 z-20 bg-white border-t border-borda-suave p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-3">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 px-4 py-3 rounded-lg border-2 border-borda-suave text-carbono font-semibold hover:bg-massa-bg transition-colors"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onContinue}
        aria-disabled={!podeContinuar}
        className={`flex-[2] px-4 py-3 rounded-lg font-semibold transition-colors ${
          podeContinuar
            ? 'bg-pomodoro text-white hover:bg-pomodoro-hover'
            : 'bg-pomodoro/40 text-white cursor-not-allowed'
        }`}
      >
        {podeContinuar ? 'Continuar' : 'Escolha os 2 sabores'}
      </button>
    </div>
  );
}
