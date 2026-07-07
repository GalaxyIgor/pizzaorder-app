// src/components/layout/InfoStrip.tsx
'use client';

// Faixa de informações práticas logo abaixo do header: responde frete e
// pedido mínimo antes de o cliente escolher qualquer coisa.

import type { ConfigFrete } from '@pizzaorder/shared';
import { useCardapio } from '@/contexts/CardapioContext';
import { formatarPreco } from '@/lib/cardapio';

function labelFrete(config: ConfigFrete): string {
  switch (config.tipo) {
    case 'gratis':
      return 'Grátis';
    case 'fixo':
      return formatarPreco(config.valorFixo ?? 0);
    default:
      // por km / por bairro: depende do endereço, calculado no checkout
      return 'A calcular';
  }
}

interface Pill {
  valor: string;
  rotulo: string;
}

export function InfoStrip() {
  const { pizzaria } = useCardapio();

  const pills: Pill[] = [];

  if (pizzaria.aceita_entrega) {
    pills.push({ valor: labelFrete(pizzaria.config_frete), rotulo: 'Frete' });
  }
  if (pizzaria.pedido_minimo != null && pizzaria.pedido_minimo > 0) {
    pills.push({ valor: formatarPreco(pizzaria.pedido_minimo), rotulo: 'Pedido mínimo' });
  }
  if (pizzaria.aceita_retirada) {
    pills.push({ valor: 'Sem taxa', rotulo: 'Retirada' });
  }

  if (pills.length === 0) return null;

  return (
    <div className="flex gap-2 sm:gap-3 mt-4">
      {pills.map((pill) => (
        <div
          key={pill.rotulo}
          className="flex-1 bg-white border border-borda-suave rounded-xl px-2 py-2 text-center"
        >
          <span className="block font-bold text-sm text-carbono">{pill.valor}</span>
          <span className="block text-[0.65rem] uppercase tracking-wide text-creme-muted">
            {pill.rotulo}
          </span>
        </div>
      ))}
    </div>
  );
}
