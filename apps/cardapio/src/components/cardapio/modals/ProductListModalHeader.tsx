interface ProductListModalHeaderProps {
  id: string;
  title: string;
  onClose: () => void;
}

export function ProductListModalHeader({ id, title, onClose }: ProductListModalHeaderProps) {
  return (
    <div className="bg-white border-b border-borda-suave p-4 flex justify-between items-center">
      <h2 id={id} className="font-display text-2xl font-bold text-carbono">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        className="w-11 h-11 -mr-2 flex items-center justify-center rounded-full text-2xl text-creme-muted hover:text-carbono hover:bg-massa-bg transition-colors"
        aria-label="Fechar"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  );
}
