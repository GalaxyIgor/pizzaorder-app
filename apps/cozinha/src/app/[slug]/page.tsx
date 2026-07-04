// src/app/[slug]/page.tsx
//
// Painel de pedidos ativos. Server component: exigirStaff + fetch com o client
// de sessão (passa pelo RLS pedidos_select_staff — o mesmo que autoriza o
// Realtime da fase 5). O PainelPedidos cuida do refresh no client.

import { createClient } from '@/lib/supabase/server';
import { exigirStaff } from '@/lib/staff';
import { HeaderCozinha } from '@/components/HeaderCozinha';
import { PainelPedidos } from '@/components/PainelPedidos';
import { SELECT_PEDIDO_COZINHA, STATUS_ATIVOS, type PedidoCozinha } from '@/types/cozinha';

export default async function PainelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { pizzaria } = await exigirStaff(slug);

  const supabase = await createClient();
  const { data: pedidos } = await supabase
    .from('pedidos')
    .select(SELECT_PEDIDO_COZINHA)
    .eq('pizzaria_id', pizzaria.id)
    .in('status', STATUS_ATIVOS)
    .order('criado_em', { ascending: true });

  return (
    <div className="min-h-dvh flex flex-col">
      <HeaderCozinha pizzaria={pizzaria} />
      <main className="flex-1 p-4 max-w-screen-2xl mx-auto w-full">
        <PainelPedidos
          slug={slug}
          pizzariaId={pizzaria.id}
          pedidosIniciais={(pedidos ?? []) as unknown as PedidoCozinha[]}
        />
      </main>
    </div>
  );
}
