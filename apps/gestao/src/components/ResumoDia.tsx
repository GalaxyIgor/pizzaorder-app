// src/components/ResumoDia.tsx
//
// Cards do dia no topo da tela de pedidos ao vivo (server component).
// Os números do dia — a parte que a cozinha não mostra de propósito.

import { formatarPreco } from '@pizzaorder/shared';
import { carregarPedidosPeriodo, resumirPedidos } from '@/lib/analytics';
import { intervaloPeriodo } from '@/lib/datas';
import { Tile } from '@/components/Tile';

export async function ResumoDia({ pizzariaId }: { pizzariaId: string }) {
  const pedidos = await carregarPedidosPeriodo(pizzariaId, intervaloPeriodo('hoje'));
  const resumo = resumirPedidos(pedidos);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Tile rotulo="Faturamento hoje" valor={formatarPreco(resumo.faturamento)} />
      <Tile rotulo="Pedidos hoje" valor={String(resumo.qtdPedidos)} />
      <Tile rotulo="Ticket médio" valor={formatarPreco(resumo.ticketMedio)} />
      <Tile
        rotulo="Cancelados hoje"
        valor={String(resumo.cancelados.qtd)}
        detalhe={resumo.cancelados.qtd > 0 ? formatarPreco(resumo.cancelados.valor) : undefined}
      />
    </div>
  );
}
