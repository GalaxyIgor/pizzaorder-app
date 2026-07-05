// src/app/[slug]/dashboard/page.tsx
//
// Analytics do período: faturamento, ticket médio, modalidades, faturamento
// por dia, produtos mais vendidos e cancelamentos. Números calculados
// server-side (lib/analytics) após exigirStaff.

import Link from 'next/link';
import { formatarPreco, MODALIDADE_LABEL, type Modalidade } from '@pizzaorder/shared';
import { exigirStaff } from '@/lib/staff';
import {
  carregarPedidosPeriodo,
  faturamentoPorDia,
  produtosMaisVendidos,
  resumirPedidos,
} from '@/lib/analytics';
import { intervaloPeriodo, PERIODO_LABEL, diaLocalDe, type Periodo } from '@/lib/datas';
import { GraficoBarras } from '@/components/GraficoBarras';
import { Tile } from '@/components/Tile';

const PERIODOS: Periodo[] = ['hoje', '7d', '30d', 'mes'];

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { slug } = await params;
  const { periodo: periodoParam } = await searchParams;
  const periodo: Periodo = PERIODOS.includes(periodoParam as Periodo)
    ? (periodoParam as Periodo)
    : 'hoje';

  const { pizzaria } = await exigirStaff(slug);
  const intervalo = intervaloPeriodo(periodo);

  const [pedidos, topProdutos] = await Promise.all([
    carregarPedidosPeriodo(pizzaria.id, intervalo),
    produtosMaisVendidos(pizzaria.id, intervalo),
  ]);
  const resumo = resumirPedidos(pedidos);
  const porDia = faturamentoPorDia(pedidos, intervalo);
  const cancelamentos = pedidos.filter((p) => p.status === 'cancelado').slice(0, 5);

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* seletor de período */}
      <div className="flex gap-2 overflow-x-auto">
        {PERIODOS.map((p) => (
          <Link
            key={p}
            href={`/${slug}/dashboard${p === 'hoje' ? '' : `?periodo=${p}`}`}
            className={`px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap border-2 transition-colors ${
              p === periodo
                ? 'border-pomodoro bg-pomodoro text-white'
                : 'border-borda-suave text-carbono hover:border-pomodoro hover:text-pomodoro'
            }`}
          >
            {PERIODO_LABEL[p]}
          </Link>
        ))}
      </div>

      {/* números do período */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile rotulo="Faturamento" valor={formatarPreco(resumo.faturamento)} />
        <Tile rotulo="Pedidos" valor={String(resumo.qtdPedidos)} />
        <Tile rotulo="Ticket médio" valor={formatarPreco(resumo.ticketMedio)} />
        <Tile
          rotulo="Cancelados"
          valor={String(resumo.cancelados.qtd)}
          detalhe={resumo.cancelados.qtd > 0 ? formatarPreco(resumo.cancelados.valor) : undefined}
        />
      </div>

      {/* modalidades */}
      <div className="grid grid-cols-3 gap-3">
        {(Object.keys(resumo.porModalidade) as Modalidade[]).map((m) => (
          <Tile key={m} rotulo={MODALIDADE_LABEL[m]} valor={String(resumo.porModalidade[m])} />
        ))}
      </div>

      {/* faturamento por dia (períodos de mais de um dia) */}
      {porDia.length > 1 && (
        <section className="bg-white border border-borda-suave rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-bold text-carbono uppercase tracking-wide">
            Faturamento por dia
          </h2>
          <GraficoBarras dados={porDia} />
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* produtos mais vendidos */}
        <section className="bg-white border border-borda-suave rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-bold text-carbono uppercase tracking-wide">
            Mais vendidos
          </h2>
          {topProdutos.length === 0 ? (
            <p className="text-sm text-creme-muted py-2">Nenhuma venda no período.</p>
          ) : (
            <ol className="space-y-2">
              {topProdutos.map((prod, i) => (
                <li key={prod.nome} className="flex items-center gap-3 text-sm">
                  <span className="text-xs font-bold text-creme-muted w-5 text-right">
                    {i + 1}.
                  </span>
                  <span className="flex-1 min-w-0 truncate font-semibold text-carbono">
                    {prod.nome}
                  </span>
                  <span className="text-xs text-creme-muted whitespace-nowrap">
                    {prod.qtd}× · {formatarPreco(prod.receita)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* cancelamentos e motivos */}
        <section className="bg-white border border-borda-suave rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-bold text-carbono uppercase tracking-wide">
            Últimos cancelamentos
          </h2>
          {cancelamentos.length === 0 ? (
            <p className="text-sm text-creme-muted py-2">Nenhum cancelamento no período. 🎉</p>
          ) : (
            <ul className="space-y-2">
              {cancelamentos.map((p) => (
                <li key={`${p.numero}-${p.criado_em}`} className="text-sm">
                  <p className="font-semibold text-carbono">
                    #{p.numero} · {formatarPreco(Number(p.total))} ·{' '}
                    {diaLocalDe(p.criado_em).slice(8, 10)}/{diaLocalDe(p.criado_em).slice(5, 7)}
                  </p>
                  {p.motivo_cancelamento && (
                    <p className="text-xs text-creme-muted">Motivo: {p.motivo_cancelamento}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
