// src/app/[slug]/pedidos/page.tsx
//
// Pedidos ao vivo. Server component: o layout já validou o staff; o fetch usa
// o client de sessão (passa pelo RLS pedidos_select_staff — o mesmo que
// autoriza o Realtime). O PainelPedidosGestao cuida do refresh no client.

import { createClient } from '@/lib/supabase/server';
import { exigirStaff } from '@/lib/staff';
import { PainelPedidosGestao } from '@/components/PainelPedidosGestao';
import { ResumoDia } from '@/components/ResumoDia';
import { SELECT_PEDIDO_PAINEL, STATUS_ATIVOS, type PedidoGestao } from '@/types/gestao';

export default async function PedidosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { pizzaria } = await exigirStaff(slug);

  const supabase = await createClient();
  const { data: pedidos } = await supabase
    .from('pedidos')
    .select(SELECT_PEDIDO_PAINEL)
    .eq('pizzaria_id', pizzaria.id)
    .in('status', STATUS_ATIVOS)
    .order('criado_em', { ascending: true });

  return (
    <div className="space-y-4">
      <ResumoDia pizzariaId={pizzaria.id} />
      <PainelPedidosGestao
        slug={slug}
        pizzariaId={pizzaria.id}
        pedidosIniciais={(pedidos ?? []) as unknown as PedidoGestao[]}
      />
    </div>
  );
}
