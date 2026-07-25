// src/components/cardapio/CategoryButtons.tsx
'use client';

// Hero da primeira tela: sem o carrossel de destaques, os 4 cards de categoria
// assumem a vitrine. O chip de cada card traz informação que vende (a pizza
// mais pedida, o menor preço de bebida, a economia do combo) no lugar do
// antigo "Clique aqui →".

import { useCardapio } from '@/contexts/CardapioContext';
import { formatarPreco, menorPreco, produtosPorTipo } from '@/lib/cardapio';

interface CategoryButtonsProps {
  onOpen: (chave: string) => void;
}

export function CategoryButtons({ onOpen }: CategoryButtonsProps) {
  const { produtos, categorias, destaques, comboProdutos } = useCardapio();

  const pizzas = produtosPorTipo(produtos, categorias, 'pizza');
  const bebidas = produtosPorTipo(produtos, categorias, 'bebida');
  const sobremesas = produtosPorTipo(produtos, categorias, 'sobremesa');

  // "A mais pedida": primeiro destaque cadastrado que seja uma pizza.
  const idsPizza = new Set(pizzas.map((p) => p.id));
  const maisPedida = destaques.find((d) => idsPizza.has(d.produtos.id))?.produtos.nome;

  const menorPrecoBebida = bebidas.length
    ? Math.min(...bebidas.map(menorPreco).filter((p) => p > 0))
    : 0;
  const menorPrecoSobremesa = sobremesas.length
    ? Math.min(...sobremesas.map(menorPreco).filter((p) => p > 0))
    : 0;

  // Economia máxima entre os combos: soma dos itens avulsos menos o preço fechado.
  const economiaCombo = comboProdutos.reduce((maior, combo) => {
    const p1 = produtos.find((p) => p.id === combo.produto1_id);
    const p2 = produtos.find((p) => p.id === combo.produto2_id);
    if (!p1 || !p2) return maior;
    return Math.max(maior, menorPreco(p1) + menorPreco(p2) - combo.preco);
  }, 0);

  interface CardCategoria {
    chave: string;
    icone: string;
    titulo: string;
    descricao: string;
    chip: string;
    classes: string;
    chipClasses: string;
    /** true = não renderiza (ex.: tenant sem sobremesas cadastradas) */
    oculto?: boolean;
  }

  const cards: CardCategoria[] = [
    {
      chave: 'pizzas-completas',
      icone: '🍕',
      titulo: 'Pizzas Completas',
      descricao: 'Tradicionais e especiais',
      chip: maisPedida
        ? `🔥 A mais pedida: ${maisPedida}`
        : `${pizzas.length} ${pizzas.length === 1 ? 'sabor' : 'sabores'}`,
      classes: 'bg-linear-to-br from-pomodoro to-pomodoro-hover text-white',
      chipClasses: 'bg-white/15 text-white',
    },
    {
      chave: 'meia-meia',
      icone: '🍕✨',
      titulo: 'Meia a Meia',
      descricao: 'Dois sabores na mesma pizza',
      chip: 'Você escolhe as duas metades',
      classes: 'bg-linear-to-br from-manjericao to-manjericao/80 text-white',
      chipClasses: 'bg-white/15 text-white',
    },
    {
      chave: 'bebidas',
      icone: '🥤',
      titulo: 'Bebidas',
      descricao: 'Refrigerantes e sucos gelados',
      chip: menorPrecoBebida > 0 ? `A partir de ${formatarPreco(menorPrecoBebida)}` : 'Refrescos e sucos',
      classes: 'bg-linear-to-br from-ouro to-ouro/80 text-carbono',
      chipClasses: 'bg-carbono/10 text-carbono',
    },
    {
      chave: 'sobremesas',
      icone: '🍫',
      titulo: 'Sobremesas',
      descricao: 'Doces pra fechar o pedido',
      chip:
        menorPrecoSobremesa > 0
          ? `A partir de ${formatarPreco(menorPrecoSobremesa)}`
          : 'Doces da casa',
      classes: 'bg-linear-to-br from-cacau to-cacau/80 text-white',
      chipClasses: 'bg-white/15 text-white',
      // só aparece quando o tenant cadastrou sobremesas (categoria tipo 'sobremesa')
      oculto: sobremesas.length === 0,
    },
    {
      chave: 'combos',
      icone: '🍕🥤',
      titulo: 'Combos',
      descricao: 'Pizza + bebida com preço fechado',
      chip: economiaCombo > 0 ? `💰 Economize até ${formatarPreco(economiaCombo)}` : 'Preço fechado',
      classes: 'bg-linear-to-br from-carbono to-carbono/80 text-white',
      chipClasses: 'bg-white/15 text-white',
    },
  ];

  return (
    <section className="mt-6 mb-8">
      <h2 className="font-display text-2xl font-bold text-carbono">
        O que você quer pedir hoje?
      </h2>
      <p className="text-sm text-creme-muted mt-1 mb-4">
        Escolha por onde começar — dá pra misturar tudo no carrinho.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {cards.filter((card) => !card.oculto).map((card) => (
          <button
            key={card.chave}
            onClick={() => onOpen(card.chave)}
            className={`group relative overflow-hidden flex items-center gap-4 text-left rounded-2xl p-4 md:p-5 shadow-lg hover:shadow-2xl transition-all duration-300 motion-safe:hover:-translate-y-1.5 motion-safe:hover:scale-[1.02] active:scale-[0.98] ${card.classes}`}
          >
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-lg">{card.titulo}</h3>
              <p className="text-sm opacity-80 mt-0.5">{card.descricao}</p>
              <span
                className={`inline-block mt-3 text-xs font-semibold px-3 py-1 rounded-full truncate max-w-full ${card.chipClasses}`}
              >
                {card.chip}
              </span>
            </div>
            <span
              aria-hidden="true"
              className="text-4xl flex-shrink-0 drop-shadow-md transition-transform duration-300 motion-safe:group-hover:scale-125 motion-safe:group-hover:-rotate-6"
            >
              {card.icone}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
