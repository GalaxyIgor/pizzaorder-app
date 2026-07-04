// src/components/conta/StatusBadge.tsx
//
// Badge visual do status do pedido (server-safe, sem estado).

import type { StatusPedido } from '@/types/pedido';
import { STATUS_LABEL } from '@/types/pedido';

const COR: Record<StatusPedido, string> = {
  pendente: 'bg-ouro/15 text-carbono',
  em_preparo: 'bg-ouro/25 text-carbono',
  pronto: 'bg-manjericao/10 text-manjericao',
  saiu_para_entrega: 'bg-manjericao/10 text-manjericao',
  concluido: 'bg-manjericao/15 text-manjericao',
  cancelado: 'bg-pomodoro/10 text-pomodoro',
};

export function StatusBadge({ status }: { status: StatusPedido }) {
  return (
    <span className={`inline-block text-xs font-semibold rounded-full px-3 py-1 ${COR[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
