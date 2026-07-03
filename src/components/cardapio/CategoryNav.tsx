// src/components/cardapio/CategoryNav.tsx
interface CategoryNavProps {
  categories?: string[];
  onCategoryClick?: (category: string) => void;
}

export function CategoryNav({ categories = ['Pizzas Tradicionais', 'Pizzas Especiais', 'Meia Meia', 'Bebidas'], onCategoryClick }: CategoryNavProps) {
  return (
    <nav className="flex gap-2 overflow-x-auto py-4 [scrollbar-width:none]">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onCategoryClick?.(category)}
          className="bg-white text-carbono border border-borda-suave px-4 py-2 rounded-full whitespace-nowrap font-medium text-sm cursor-pointer hover:bg-ouro/10 transition-colors"
        >
          {category}
        </button>
      ))}
    </nav>
  );
}