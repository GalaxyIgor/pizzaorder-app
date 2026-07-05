// src/components/conta/StatusBadge.tsx
//
// Badge visual do status do pedido (server-safe, sem estado). O cliente vê o
// rótulo SIMPLIFICADO (statusLabelCliente): a fila interna da cozinha
// (aceito/em_preparo) aparece como um único "Em preparo".

import type { Modalidade, StatusPedido } from '@/types/pedido';
import { statusLabelCliente } from '@pizzaorder/shared';

const COR: Record<StatusPedido, string> = {
  pendente: 'bg-ouro/15 text-carbono',
  aceito: 'bg-ouro/25 text-carbono',
  em_preparo: 'bg-ouro/25 text-carbono',
  pronto: 'bg-manjericao/10 text-manjericao',
  saiu_para_entrega: 'bg-manjericao/10 text-manjericao',
  concluido: 'bg-manjericao/15 text-manjericao',
  cancelado: 'bg-pomodoro/10 text-pomodoro',
};

export function StatusBadge({
  status,
  modalidade,
}: {
  status: StatusPedido;
  modalidade: Modalidade;
}) {
  return (
    <span className={`inline-block text-xs font-semibold rounded-full px-3 py-1 ${COR[status]}`}>
      {statusLabelCliente(status, modalidade)}
    </span>
  );
}
