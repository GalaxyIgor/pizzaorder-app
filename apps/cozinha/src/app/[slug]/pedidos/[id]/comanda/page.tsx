// src/app/[slug]/pedidos/[id]/comanda/page.tsx
//
// Comanda para impressão (~80mm, fonte mono). Abre em nova aba a partir do
// card; o @media print do globals.css esconde o botão de imprimir.

import { notFound } from 'next/navigation';
import {
  formatarPreco,
  MODALIDADE_LABEL,
  METODO_PAGAMENTO_LABEL,
} from '@pizzaorder/shared';
import { createClient } from '@/lib/supabase/server';
import { exigirStaff } from '@/lib/staff';
import { SELECT_PEDIDO_COZINHA, type PedidoCozinha } from '@/types/cozinha';
import { BotaoImprimir } from '@/components/BotaoImprimir';

export default async function ComandaPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const { pizzaria } = await exigirStaff(slug);

  const supabase = await createClient();
  const { data } = await supabase
    .from('pedidos')
    .select(SELECT_PEDIDO_COZINHA)
    .eq('id', id)
    .eq('pizzaria_id', pizzaria.id)
    .single();

  if (!data) notFound();
  const pedido = data as unknown as PedidoCozinha;

  return (
    <div className="min-h-dvh bg-white text-black p-4 flex flex-col items-center gap-4">
      <BotaoImprimir />

      <div className="comanda w-[80mm] font-mono text-[12px] leading-snug">
        <p className="text-center font-bold text-[14px]">{pizzaria.nome}</p>
        <p className="text-center">COMANDA — PEDIDO #{pedido.numero}</p>
        <p className="text-center">
          {new Date(pedido.criado_em).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
        <Separador />

        <p className="font-bold">{MODALIDADE_LABEL[pedido.modalidade].toUpperCase()}</p>
        <p>{pedido.nome_cliente}</p>
        <p>{pedido.telefone_cliente}</p>
        {pedido.endereco_entrega && (
          <>
            <p>
              {pedido.endereco_entrega.rua}, {pedido.endereco_entrega.numero}
              {pedido.endereco_entrega.complemento
                ? ` — ${pedido.endereco_entrega.complemento}`
                : ''}
            </p>
            <p>{pedido.endereco_entrega.bairro}</p>
            {pedido.endereco_entrega.referencia && (
              <p>Ref.: {pedido.endereco_entrega.referencia}</p>
            )}
          </>
        )}
        <Separador />

        {pedido.itens_pedido.map((item) => (
          <div key={item.id} className="mb-1">
            <p className="font-bold">
              {item.quantidade}x {item.nome}
              {item.tamanho ? ` (${item.tamanho})` : ''}
            </p>
            {item.tipo === 'meia-meia' && item.sabores && (
              <p>  1/2 {item.sabores.map((s) => s.nome).join(' + 1/2 ')}</p>
            )}
            {item.adicionais?.map((a) => (
              <p key={a.opcaoId}>  + {a.nome}</p>
            ))}
            <p className="text-right">{formatarPreco(item.preco_unit * item.quantidade)}</p>
          </div>
        ))}

        {pedido.observacao && (
          <>
            <Separador />
            <p className="font-bold">*** OBSERVACAO ***</p>
            <p>{pedido.observacao}</p>
          </>
        )}
        <Separador />

        <Linha rotulo="Subtotal" valor={formatarPreco(pedido.subtotal)} />
        {pedido.modalidade === 'entrega' && (
          <Linha rotulo="Entrega" valor={formatarPreco(pedido.taxa_entrega)} />
        )}
        {pedido.taxa_servico > 0 && (
          <Linha rotulo="Tx. serviço" valor={formatarPreco(pedido.taxa_servico)} />
        )}
        <Linha rotulo="TOTAL" valor={formatarPreco(pedido.total)} forte />

        <p className="mt-1">
          Pagamento:{' '}
          {pedido.forma_pagamento === 'online'
            ? 'PAGO ONLINE'
            : `na ${pedido.modalidade === 'entrega' ? 'entrega' : 'retirada'}${
                pedido.metodo_pagamento_local
                  ? ` — ${METODO_PAGAMENTO_LABEL[pedido.metodo_pagamento_local]}`
                  : ''
              }`}
        </p>
        {pedido.troco_para != null && (
          <p className="font-bold">TROCO PARA {formatarPreco(pedido.troco_para)}</p>
        )}
        {pedido.previsao_pronto_em && (
          <p>
            Previsão:{' '}
            {new Date(pedido.previsao_pronto_em).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
        <Separador />
        <p className="text-center">.</p>
      </div>
    </div>
  );
}

function Separador() {
  return <p aria-hidden="true">--------------------------------</p>;
}

function Linha({ rotulo, valor, forte = false }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <p className={`flex justify-between ${forte ? 'font-bold text-[13px]' : ''}`}>
      <span>{rotulo}</span>
      <span>{valor}</span>
    </p>
  );
}
