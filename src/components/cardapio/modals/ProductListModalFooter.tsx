interface ProductListModalFooterProps {
  onClose: () => void;
  onAddToCart: () => void;
}

export function ProductListModalFooter({ onClose, onAddToCart }: ProductListModalFooterProps) {
  return (
    <div className="sticky bottom-0 z-20 bg-white border-t border-borda-suave p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex gap-3">
      <button
        onClick={onClose}
        className="flex-1 px-4 py-3 rounded-lg border-2 border-borda-suave text-carbono font-semibold hover:bg-massa-bg transition-colors"
      >
        Cancelar
      </button>
      <button
        onClick={onAddToCart}
        className="flex-1 px-4 py-3 rounded-lg bg-pomodoro text-white font-semibold hover:bg-pomodoro/90 transition-colors"
      >
        Adicionar ao Carrinho
      </button>
    </div>
  );
}
