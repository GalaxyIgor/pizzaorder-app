// src/app/[slug]/historico/page.tsx
//
// Pedidos finalizados (concluídos/cancelados) do dia + totais simples.
// "Dia" = dia local do Brasil (America/Sao_Paulo, UTC-3 fixo desde 2019).

import Link from 'next/link';
import { formatarPreco, MODALIDADE_LABEL, STATUS_LABEL } from '@pizzaorder/shared';
import { createClient } from '@/lib/supabase/server';
import { exigirStaff } from '@/lib/staff';
import { HeaderCozinha } from '@/components/HeaderCozinha';
import type { PedidoResumo } from '@pizzaorder/shared';

interface PedidoHistorico extends PedidoResumo {
  nome_cliente: string;
  motivo_cancelamento: string | null;
}

function inicioDoDiaBrasil(): string {
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  return new Date(`${hoje}T00:00:00-03:00`).toISOString();
}

export default async function HistoricoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { pizzaria } = await exigirStaff(slug);

  const supabase = await createClient();
  const { data } = await supabase
    .from('pedidos')
    .select('id, numero, status, modalidade, total, criado_em, nome_cliente, motivo_cancelamento')
    .eq('pizzaria_id', pizzaria.id)
    .in('status', ['concluido', 'cancelado'])
    .gte('criado_em', inicioDoDiaBrasil())
    .order('criado_em', { ascending: false });

  const pedidos = (data ?? []) as PedidoHistorico[];
  const concluidos = pedidos.filter((p) => p.status === 'concluido');
  const cancelados = pedidos.filter((p) => p.status === 'cancelado');
  const faturamento = concluidos.reduce((soma, p) => soma + Number(p.total), 0);

  return (
    <div className="min-h-dvh flex flex-col">
      <HeaderCozinha pizzaria={pizzaria} />
      <main className="flex-1 p-4 max-w-3xl mx-auto w-full space-y-4">
        <div className="flex items-center gap-3">
          <Link href={`/${slug}`} aria-label="Voltar ao painel" className="text-creme-muted hover:text-carbono text-xl">
            ←
          </Link>
          <h2 className="font-display text-xl font-bold text-carbono">Histórico de hoje</h2>
        </div>

        {/* totais simples */}
        <div className="grid grid-cols-3 gap-3">
          <Total rotulo="Concluídos" valor={String(concluidos.length)} />
          <Total rotulo="Faturamento" valor={formatarPreco(faturamento)} />
          <Total rotulo="Cancelados" valor={String(cancelados.length)} />
        </div>

        {pedidos.length === 0 ? (
          <p className="text-sm text-creme-muted text-center py-8">
            Nenhum pedido finalizado hoje ainda.
          </p>
        ) : (
          <ul className="space-y-2">
            {pedidos.map((p) => (
              <li
                key={p.id}
                className="bg-white border border-borda-suave rounded-xl p-3 flex items-center gap-3 text-sm"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-carbono">
                    #{p.numero} · {p.nome_cliente}
                  </p>
                  <p className="text-xs text-creme-muted">
                    {new Date(p.criado_em).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    · {MODALIDADE_LABEL[p.modalidade]}
                    {p.motivo_cancelamento ? ` · Motivo: ${p.motivo_cancelamento}` : ''}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold rounded-full px-3 py-1 whitespace-nowrap ${
                    p.status === 'concluido'
                      ? 'bg-manjericao/15 text-manjericao'
                      : 'bg-pomodoro/10 text-pomodoro'
                  }`}
                >
                  {STATUS_LABEL[p.status]}
                </span>
                <span className="font-semibold text-carbono whitespace-nowrap">
                  {formatarPreco(Number(p.total))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function Total({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="bg-white border border-borda-suave rounded-xl p-3 text-center">
      <p className="text-xs text-creme-muted uppercase tracking-wide">{rotulo}</p>
      <p className="font-display text-lg font-bold text-carbono">{valor}</p>
    </div>
  );
}
