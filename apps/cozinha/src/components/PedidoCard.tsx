'use client';

// src/components/PedidoCard.tsx
//
// Card de pedido (touch-friendly). As ações mudam com o status e chamam a
// Server Action atualizarStatusPedido; aceite e recusa abrem diálogos.

import { useState, useTransition } from 'react';
import {
  formatarPreco,
  MODALIDADE_LABEL,
  METODO_PAGAMENTO_LABEL,
  type StatusPedido,
} from '@pizzaorder/shared';
import { atualizarStatusPedido } from '@/lib/actions/pedidos';
import type { PedidoCozinha } from '@/types/cozinha';
import { AceitarDialog } from '@/components/AceitarDialog';
import { RecusarDialog } from '@/components/RecusarDialog';

interface Props {
  slug: string;
  pedido: PedidoCozinha;
  /** timestamp compartilhado do painel — base do "há X min" */
  agora: number;
}

function tempoDecorrido(desde: string, agora: number): string {
  const min = Math.max(0, Math.floor((agora - new Date(desde).getTime()) / 60_000));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  return `há ${h}h${String(min % 60).padStart(2, '0')}`;
}

function horaLocal(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function PedidoCard({ slug, pedido, agora }: Props) {
  const [dialogo, setDialogo] = useState<'aceitar' | 'recusar' | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const mudar = (novoStatus: StatusPedido, extras?: { minutosEstimados?: number; motivo?: string }) => {
    setErro(null);
    startTransition(async () => {
      const r = await atualizarStatusPedido({
        slug,
        pedidoId: pedido.id,
        novoStatus,
        ...extras,
      });
      if (r.erro) setErro(r.erro);
      else setDialogo(null);
    });
  };

  const atrasado =
    pedido.status === 'em_preparo' &&
    pedido.previsao_pronto_em != null &&
    agora > new Date(pedido.previsao_pronto_em).getTime();

  return (
    <article className="bg-white border border-borda-suave rounded-xl p-3 space-y-2.5 shadow-xs">
      {/* topo: número + comanda + tempo */}
      <header className="flex items-baseline justify-between gap-2">
        <p className="font-display text-lg font-bold text-carbono">#{pedido.numero}</p>
        <span className="flex items-baseline gap-2">
          <a
            href={`/${slug}/pedidos/${pedido.id}/comanda`}
            target="_blank"
            rel="noopener"
            className="text-xs font-semibold text-creme-muted hover:text-carbono underline"
          >
            Comanda
          </a>
          <p className="text-xs text-creme-muted whitespace-nowrap">
            {tempoDecorrido(pedido.criado_em, agora)}
          </p>
        </span>
      </header>
      <p className="text-xs font-semibold text-carbono bg-borda-suave/60 rounded-full px-2.5 py-1 inline-block">
        {MODALIDADE_LABEL[pedido.modalidade]}
      </p>

      {/* itens */}
      <ul className="space-y-1.5 text-sm border-t border-borda-suave pt-2">
        {pedido.itens_pedido.map((item) => (
          <li key={item.id}>
            <p className="font-semibold text-carbono">
              {item.quantidade}× {item.nome}
              {item.tamanho ? ` (${item.tamanho})` : ''}
            </p>
            {item.tipo === 'meia-meia' && item.sabores && (
              <p className="text-xs text-creme-muted">
                {item.sabores.map((s) => s.nome).join(' / ')}
              </p>
            )}
            {item.adicionais && item.adicionais.length > 0 && (
              <p className="text-xs text-creme-muted">
                + {item.adicionais.map((a) => a.nome).join(', ')}
              </p>
            )}
          </li>
        ))}
      </ul>

      {/* observação em destaque (a cozinha não pode perder isso) */}
      {pedido.observacao && (
        <p className="text-sm text-carbono bg-ouro/15 border border-ouro/40 rounded-lg p-2">
          <span className="font-semibold">Obs.:</span> {pedido.observacao}
        </p>
      )}

      {/* cliente / entrega / pagamento */}
      <div className="text-xs text-creme-muted space-y-0.5 border-t border-borda-suave pt-2">
        <p>
          {pedido.nome_cliente} · {pedido.telefone_cliente}
        </p>
        {pedido.endereco_entrega && (
          <p>
            {pedido.endereco_entrega.rua}, {pedido.endereco_entrega.numero}
            {pedido.endereco_entrega.complemento ? ` — ${pedido.endereco_entrega.complemento}` : ''} ·{' '}
            {pedido.endereco_entrega.bairro}
          </p>
        )}
        <p>
          <span className="font-semibold text-carbono">{formatarPreco(pedido.total)}</span>{' '}
          {pedido.forma_pagamento === 'online'
            ? '· pago online'
            : `· pagar na ${pedido.modalidade === 'entrega' ? 'entrega' : 'retirada'}${
                pedido.metodo_pagamento_local
                  ? ` (${METODO_PAGAMENTO_LABEL[pedido.metodo_pagamento_local]})`
                  : ''
              }`}
        </p>
        {pedido.status === 'em_preparo' && pedido.previsao_pronto_em && (
          <p className={atrasado ? 'text-pomodoro font-semibold' : ''}>
            Previsão: {horaLocal(pedido.previsao_pronto_em)}
            {atrasado ? ' — atrasado' : ''}
          </p>
        )}
      </div>

      {erro && (
        <p role="alert" className="text-xs text-pomodoro bg-pomodoro/5 border border-pomodoro/20 rounded-lg p-2">
          {erro}
        </p>
      )}

      {/* ações por status */}
      <div className="flex gap-2 pt-1">
        {pedido.status === 'pendente' && (
          <>
            <BotaoPrimario onClick={() => setDialogo('aceitar')} disabled={pending}>
              Aceitar
            </BotaoPrimario>
            <BotaoSecundario onClick={() => setDialogo('recusar')} disabled={pending}>
              Recusar
            </BotaoSecundario>
          </>
        )}
        {pedido.status === 'em_preparo' && (
          <>
            <BotaoPrimario onClick={() => mudar('pronto')} disabled={pending}>
              {pending ? '...' : 'Pronto'}
            </BotaoPrimario>
            <BotaoSecundario onClick={() => setDialogo('recusar')} disabled={pending}>
              Cancelar
            </BotaoSecundario>
          </>
        )}
        {pedido.status === 'pronto' && (
          <>
            <BotaoPrimario
              onClick={() => mudar(pedido.modalidade === 'entrega' ? 'saiu_para_entrega' : 'concluido')}
              disabled={pending}
            >
              {pending ? '...' : pedido.modalidade === 'entrega' ? 'Saiu para entrega' : 'Concluir'}
            </BotaoPrimario>
            <BotaoSecundario onClick={() => setDialogo('recusar')} disabled={pending}>
              Cancelar
            </BotaoSecundario>
          </>
        )}
        {pedido.status === 'saiu_para_entrega' && (
          <>
            {/* quem confirma a entrega é a gestão — a cozinha só acompanha */}
            <p className="flex-1 text-xs text-creme-muted self-center">
              🛵 Em rota — a gestão confirma a entrega.
            </p>
            <BotaoSecundario onClick={() => setDialogo('recusar')} disabled={pending}>
              Cancelar
            </BotaoSecundario>
          </>
        )}
      </div>

      {dialogo === 'aceitar' && (
        <AceitarDialog
          numero={pedido.numero}
          pending={pending}
          onConfirmar={(minutos) => mudar('em_preparo', { minutosEstimados: minutos })}
          onFechar={() => setDialogo(null)}
        />
      )}
      {dialogo === 'recusar' && (
        <RecusarDialog
          numero={pedido.numero}
          recusa={pedido.status === 'pendente'}
          pending={pending}
          onConfirmar={(motivo) => mudar('cancelado', { motivo })}
          onFechar={() => setDialogo(null)}
        />
      )}
    </article>
  );
}

function BotaoPrimario(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="flex-1 bg-manjericao hover:opacity-90 disabled:opacity-60 text-white p-3 rounded-lg font-semibold text-sm transition-all active:scale-[0.99]"
    />
  );
}

function BotaoSecundario(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="px-4 border-2 border-pomodoro/30 text-pomodoro hover:bg-pomodoro/5 disabled:opacity-60 rounded-lg font-semibold text-sm transition-colors"
    />
  );
}
