// src/lib/frete.ts
//
// Cálculo de frete e taxa de serviço — helpers PUROS, usados tanto no client
// (preview no checkout) quanto no server (recalculo em criarPedido).

import type { ConfigFrete, ConfigTaxaServico } from '@/types/cardapio';

export interface ResultadoFrete {
  /** A pizzaria entrega nesse endereço? */
  entrega: boolean;
  valor: number;
  /** Motivo quando entrega = false (ou observação, ex.: frete grátis). */
  motivo?: string;
}

export function calcularFrete(
  config: ConfigFrete,
  bairro: string | null,
  subtotal: number
): ResultadoFrete {
  const gratisAcima = config.gratisPedidoAcimaDe;

  const comGratisAcima = (valor: number): ResultadoFrete => {
    if (gratisAcima != null && subtotal >= gratisAcima) {
      return { entrega: true, valor: 0, motivo: 'Frete grátis para este pedido!' };
    }
    return { entrega: true, valor };
  };

  switch (config.tipo) {
    case 'gratis':
      return { entrega: true, valor: 0 };

    case 'fixo':
      return comGratisAcima(config.valorFixo ?? 0);

    case 'por_bairro': {
      if (!bairro?.trim()) {
        return { entrega: false, valor: 0, motivo: 'Informe o bairro para calcular a entrega.' };
      }
      const normalizado = bairro.trim().toLowerCase();
      const faixa = config.bairros?.find((b) => b.bairro.trim().toLowerCase() === normalizado);
      if (!faixa || !faixa.entrega) {
        return { entrega: false, valor: 0, motivo: 'Ainda não entregamos nesse bairro.' };
      }
      return comGratisAcima(faixa.valor);
    }

    // Cálculo por distância precisa de geolocalização (não temos ainda no site).
    case 'faixas_km':
    case 'preco_por_km':
      return {
        entrega: false,
        valor: 0,
        motivo: 'Entrega indisponível para pedidos online no momento — escolha retirada.',
      };
  }
}

export function calcularTaxaServico(
  config: ConfigTaxaServico | null,
  subtotal: number
): number {
  if (!config) return 0;
  if (config.tipo === 'percentual') return arredondar((subtotal * config.valor) / 100);
  return config.valor;
}

/** Arredonda para 2 casas (dinheiro) — evita 0.1 + 0.2 = 0.30000000000000004. */
export function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}
