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

  const temContato = pizzaria.endereco || pizzaria.instagram;
  if (pills.length === 0 && !temContato) return null;

  return (
    <div className="mt-4 space-y-2">
      {pills.length > 0 && (
        <div className="flex gap-2 sm:gap-3">
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
      )}

      {/* endereço (quem retira precisa saber onde) + instagram */}
      {temContato && (
        <p className="text-xs text-creme-muted flex items-center gap-1.5 flex-wrap px-0.5">
          {pizzaria.endereco && (
            <span className="inline-flex items-center gap-1">
              <IconePin />
              {pizzaria.endereco}
            </span>
          )}
          {pizzaria.endereco && pizzaria.instagram && <span aria-hidden="true">·</span>}
          {pizzaria.instagram && (
            <a
              href={`https://instagram.com/${pizzaria.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:text-carbono transition-colors"
            >
              @{pizzaria.instagram}
            </a>
          )}
        </p>
      )}
    </div>
  );
}

function IconePin() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-3.5 h-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
