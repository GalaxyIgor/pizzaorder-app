'use client';

// src/components/checkout/ModalidadeStep.tsx
//
// Etapa 1: escolha da modalidade, filtrada pelo que a pizzaria aceita.

import type { Pizzaria } from '@/types/cardapio';
import type { Modalidade } from '@/types/pedido';

const OPCOES: { valor: Modalidade; titulo: string; descricao: string; icone: string }[] = [
  { valor: 'entrega', titulo: 'Entrega', descricao: 'Receba no seu endereço', icone: '🛵' },
  { valor: 'retirada', titulo: 'Retirar no balcão', descricao: 'Você busca na pizzaria', icone: '🥡' },
  { valor: 'local', titulo: 'Comer no local', descricao: 'Pedido para consumir na pizzaria', icone: '🍽️' },
];

interface ModalidadeStepProps {
  pizzaria: Pizzaria;
  value: Modalidade | null;
  onChange: (modalidade: Modalidade) => void;
}

export function ModalidadeStep({ pizzaria, value, onChange }: ModalidadeStepProps) {
  const aceita: Record<Modalidade, boolean> = {
    entrega: pizzaria.aceita_entrega,
    retirada: pizzaria.aceita_retirada,
    local: pizzaria.aceita_local,
  };
  const disponiveis = OPCOES.filter((o) => aceita[o.valor]);

  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg font-bold text-carbono">Como você quer receber?</h2>

      {disponiveis.map((opcao) => {
        const selecionada = value === opcao.valor;
        return (
          <button
            key={opcao.valor}
            type="button"
            onClick={() => onChange(opcao.valor)}
            aria-pressed={selecionada}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-colors ${
              selecionada
                ? 'border-pomodoro bg-pomodoro/5 ring-1 ring-pomodoro'
                : 'border-borda-suave bg-white hover:border-creme-muted'
            }`}
          >
            <span className="text-2xl" aria-hidden="true">{opcao.icone}</span>
            <span className="flex-1">
              <span className="block font-semibold text-sm text-carbono">{opcao.titulo}</span>
              <span className="block text-xs text-creme-muted">{opcao.descricao}</span>
            </span>
            <span
              aria-hidden="true"
              className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                selecionada ? 'border-pomodoro bg-pomodoro' : 'border-borda-suave'
              }`}
            >
              {selecionada && <span className="w-2 h-2 rounded-full bg-white" />}
            </span>
          </button>
        );
      })}

      {disponiveis.length === 0 && (
        <p className="text-sm text-creme-muted">
          Esta pizzaria não está aceitando pedidos online no momento.
        </p>
      )}
    </div>
  );
}
