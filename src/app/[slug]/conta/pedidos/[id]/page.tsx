// src/app/[slug]/conta/pedidos/[id]/page.tsx
//
// Detalhe do pedido (RLS garante que só o dono enxerga). É o destino do
// redirect do checkout (?novo=1 => banner de sucesso + limpeza do carrinho).

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatarPreco } from '@/lib/cardapio';
import { StatusBadge } from '@/components/conta/StatusBadge';
import { PedidoConfirmado } from '@/components/conta/PedidoConfirmado';
import {
  METODO_PAGAMENTO_LABEL,
  MODALIDADE_LABEL,
  type ItemPedidoRow,
  type PedidoDetalhe,
} from '@/types/pedido';

export default async function PedidoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ novo?: string }>;
}) {
  const { slug, id } = await params;
  const { novo } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${slug}/entrar?redirect=${encodeURIComponent(`/${slug}/conta/pedidos/${id}`)}`);
  }

  const { data: pedido } = await supabase
    .from('pedidos')
    .select(
      'id, numero, status, modalidade, total, criado_em, nome_cliente, telefone_cliente, endereco_entrega, observacao, subtotal, taxa_entrega, taxa_servico, forma_pagamento, metodo_pagamento_local, status_pagamento'
    )
    .eq('id', id)
    .single();

  if (!pedido) notFound();

  const detalhe = pedido as PedidoDetalhe;

  const { data: itens } = await supabase
    .from('itens_pedido')
    .select('id, tipo, nome, descricao, tamanho, preco_unit, quantidade, sabores, adicionais')
    .eq('pedido_id', id);

  const linhas = (itens ?? []) as ItemPedidoRow[];

  return (
    <div className="max-w-full sm:max-w-md mx-auto p-4 min-h-screen">
      <header className="py-4 flex items-center gap-3">
        <Link
          href={`/${slug}/conta/pedidos`}
          aria-label="Voltar aos meus pedidos"
          className="text-creme-muted hover:text-carbono text-xl"
        >
          ←
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold text-carbono">Pedido #{detalhe.numero}</h1>
          <p className="text-xs text-creme-muted">
            {new Date(detalhe.criado_em).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <StatusBadge status={detalhe.status} />
      </header>

      <PedidoConfirmado ativo={novo === '1'} />

      {/* Itens */}
      <section className="bg-white border border-borda-suave rounded-xl p-4 space-y-3">
        <h2 className="text-xs font-semibold text-creme-muted uppercase tracking-wide">Itens</h2>
        <ul className="space-y-3">
          {linhas.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="font-semibold text-carbono">
                  {item.quantidade}× {item.nome}
                  {item.tamanho ? ` (${item.tamanho})` : ''}
                </p>
                {item.tipo === 'meia-meia' && item.sabores ? (
                  <p className="text-xs text-creme-muted">
                    {item.sabores.map((s) => s.nome).join(' / ')}
                  </p>
                ) : (
                  item.descricao && <p className="text-xs text-creme-muted">{item.descricao}</p>
                )}
                {item.adicionais && item.adicionais.length > 0 && (
                  <p className="text-xs text-creme-muted">
                    + {item.adicionais.map((a) => a.nome).join(', ')}
                  </p>
                )}
              </div>
              <span className="font-semibold text-carbono whitespace-nowrap">
                {formatarPreco(item.preco_unit * item.quantidade)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Entrega e pagamento */}
      <section className="bg-white border border-borda-suave rounded-xl p-4 mt-3 text-sm space-y-1">
        <p className="font-semibold text-carbono">{MODALIDADE_LABEL[detalhe.modalidade]}</p>
        {detalhe.endereco_entrega && (
          <p className="text-creme-muted">
            {detalhe.endereco_entrega.rua}, {detalhe.endereco_entrega.numero}
            {detalhe.endereco_entrega.complemento ? ` — ${detalhe.endereco_entrega.complemento}` : ''} ·{' '}
            {detalhe.endereco_entrega.bairro}
          </p>
        )}
        <p className="text-creme-muted">
          {detalhe.nome_cliente} · {detalhe.telefone_cliente}
        </p>
        <p className="text-creme-muted">
          Pagamento:{' '}
          {detalhe.forma_pagamento === 'online'
            ? 'online (Mercado Pago)'
            : `na ${detalhe.modalidade === 'entrega' ? 'entrega' : 'retirada'}${
                detalhe.metodo_pagamento_local
                  ? ` — ${METODO_PAGAMENTO_LABEL[detalhe.metodo_pagamento_local]}`
                  : ''
              }`}
        </p>
        {detalhe.observacao && (
          <p className="text-creme-muted">Obs.: {detalhe.observacao}</p>
        )}
      </section>

      {/* Totais */}
      <section className="bg-white border border-borda-suave rounded-xl p-4 mt-3 text-sm space-y-1.5">
        <div className="flex justify-between text-creme-muted">
          <span>Subtotal</span>
          <span>{formatarPreco(detalhe.subtotal)}</span>
        </div>
        {detalhe.modalidade === 'entrega' && (
          <div className="flex justify-between text-creme-muted">
            <span>Taxa de entrega</span>
            <span>{detalhe.taxa_entrega === 0 ? 'Grátis' : formatarPreco(detalhe.taxa_entrega)}</span>
          </div>
        )}
        {detalhe.taxa_servico > 0 && (
          <div className="flex justify-between text-creme-muted">
            <span>Taxa de serviço</span>
            <span>{formatarPreco(detalhe.taxa_servico)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-carbono pt-1.5 border-t border-borda-suave">
          <span>Total</span>
          <span className="font-display text-lg">{formatarPreco(detalhe.total)}</span>
        </div>
      </section>

      <p className="text-center mt-6">
        <Link href={`/${slug}`} className="text-pomodoro font-semibold text-sm hover:underline">
          Fazer outro pedido
        </Link>
      </p>
    </div>
  );
}
