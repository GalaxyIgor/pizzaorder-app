// src/components/cliente/CategoryButtons.tsx

interface CategoryButtonsProps {
  onOpen: (chave: string) => void;
}

export function CategoryButtons({ onOpen }: CategoryButtonsProps) {
  return (
    <section className="mt-8 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => onOpen('pizzas-completas')}
          className="p-6 bg-gradient-to-br from-pomodoro to-pomodoro/80 hover:from-pomodoro/90 hover:to-pomodoro/70 text-white rounded-lg shadow-lg transition-all hover:shadow-xl active:scale-95"
        >
          <div className="text-4xl mb-2">🍕</div>
          <h3 className="font-display font-bold text-lg">Pizzas Completas</h3>
          <p className="text-sm text-white/80 mt-1">Tradicionais e Especiais</p>
        </button>

        <button
          onClick={() => onOpen('meia-meia')}
          className="p-6 bg-gradient-to-br from-manjericao to-manjericao/80 hover:from-manjericao/90 hover:to-manjericao/70 text-white rounded-lg shadow-lg transition-all hover:shadow-xl active:scale-95"
        >
          <div className="text-4xl mb-2">🍕✨</div>
          <h3 className="font-display font-bold text-lg">Meia Meia</h3>
          <p className="text-sm text-white/80 mt-1">Dois sabores, uma pizza</p>
        </button>

        <button
          onClick={() => onOpen('bebidas')}
          className="p-6 bg-gradient-to-br from-ouro to-ouro/80 hover:from-ouro/90 hover:to-ouro/70 text-carbono rounded-lg shadow-lg transition-all hover:shadow-xl active:scale-95"
        >
          <div className="text-4xl mb-2">🥤</div>
          <h3 className="font-display font-bold text-lg">Bebidas</h3>
          <p className="text-sm text-carbono/80 mt-1">Refrescos e Sucos</p>
        </button>
      </div>
    </section>
  );
}