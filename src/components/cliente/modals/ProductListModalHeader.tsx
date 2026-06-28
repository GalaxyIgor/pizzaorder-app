interface ProductListModalHeaderProps {
  title: string;
  onClose: () => void;
}

export function ProductListModalHeader({ title, onClose }: ProductListModalHeaderProps) {
  return (
    <div className="sticky top-0 bg-white border-b border-borda-suave p-4 flex justify-between items-center">
      <h2 className="font-display text-2xl font-bold text-carbono">{title}</h2>
      <button
        onClick={onClose}
        className="text-2xl text-creme-muted hover:text-carbono transition-colors"
        aria-label="Fechar"
      >
        ✕
      </button>
    </div>
  );
}
