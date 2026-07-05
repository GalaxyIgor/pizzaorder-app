'use client';

// src/components/layout/AvisoPausado.tsx
//
// Banner exibido no cardápio quando a loja não está aceitando pedidos:
// pausa manual (pizzarias.pedidos_pausados, ligada pelo staff) ou fora do
// horário de funcionamento (pizzarias.horario_funcionamento, via gestão).
// O bloqueio de verdade é server-side, em criarPedido.

import { estaAberto } from '@pizzaorder/shared';
import { useCardapio } from '@/contexts/CardapioContext';

export function AvisoPausado() {
  const { pizzaria } = useCardapio();

  if (pizzaria.pedidos_pausados) {
    return (
      <Banner icone="⏸️">
        <span className="font-semibold">{pizzaria.nome} está sem aceitar pedidos no momento.</span>{' '}
        Você pode ver o cardápio normalmente e tentar de novo mais tarde.
      </Banner>
    );
  }

  if (!estaAberto(pizzaria.horario_funcionamento)) {
    return (
      <Banner icone="🕐">
        <span className="font-semibold">{pizzaria.nome} está fechada agora.</span> Você pode ver o
        cardápio normalmente e pedir dentro do horário de funcionamento.
      </Banner>
    );
  }

  return null;
}

function Banner({ icone, children }: { icone: string; children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="mt-4 bg-ouro/15 border border-ouro/40 rounded-lg p-3 flex items-start gap-2.5 text-sm text-carbono"
    >
      <span aria-hidden="true">{icone}</span>
      <p>{children}</p>
    </div>
  );
}
