'use client';

// src/components/PedidoCardGestao.tsx
//
// Card de pedido na visão da GESTÃO: além do conteúdo, mostra os valores e o
// pagamento, e concentra as ações de orquestração — aceitar (com previsão),
// despachar/confirmar entrega e cancelar (com motivo).

import { useState, useTransition } from 'react';
import {
  formatarPreco,
  MODALIDADE_LABEL,
  METODO_PAGAMENTO_LABEL,
  STATUS_LABEL,
  type StatusPedido,
} from '@pizzaorder/shared';
import { atualizarStatusPedido } from '@/lib/actions/pedidos';
import { linkWhatsAppCliente } from '@/lib/whatsapp';
import type { PedidoGestao } from '@/types/gestao';
import { AceitarDialog } from '@/components/AceitarDialog';
import { RecusarDialog } from '@/components/RecusarDialog';

interface Props {
  slug: string;
  pedido: PedidoGestao;
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

export function PedidoCardGestao({ slug, pedido, agora }: Props) {
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
    (pedido.status === 'aceito' || pedido.status === 'em_preparo') &&
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

      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs font-semibold text-carbono bg-borda-suave/60 rounded-full px-2.5 py-1 inline-block">
          {MODALIDADE_LABEL[pedido.modalidade]}
        </p>
        <p className="text-xs font-semibold text-carbono bg-ouro/20 rounded-full px-2.5 py-1 inline-block">
          {STATUS_LABEL[pedido.status]}
        </p>
        {pedido.previsao_pronto_em &&
          (pedido.status === 'aceito' || pedido.status === 'em_preparo') && (
            <p
              className={`text-xs font-semibold rounded-full px-2.5 py-1 inline-block ${
                atrasado ? 'bg-pomodoro text-white' : 'bg-borda-suave/60 text-carbono'
              }`}
            >
              ⏱ até {horaLocal(pedido.previsao_pronto_em)}
              {atrasado ? ' — atrasado' : ''}
            </p>
          )}
      </div>

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

      {pedido.observacao && (
        <p className="text-sm text-carbono bg-ouro/15 border border-ouro/40 rounded-lg p-2">
          <span className="font-semibold">Obs.:</span> {pedido.observacao}
        </p>
      )}

      {/* cliente / entrega / pagamento — a parte que só a gestão vê inteira */}
      <div className="text-xs text-creme-muted space-y-0.5 border-t border-borda-suave pt-2">
        <p className="flex items-center gap-2 flex-wrap">
          <span>
            {pedido.nome_cliente} · {pedido.telefone_cliente}
          </span>
          <LinkWhatsApp pedido={pedido} />
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
          {pedido.troco_para != null && (
            <span className="font-semibold text-carbono">
              {' '}
              · troco para {formatarPreco(pedido.troco_para)}
            </span>
          )}
        </p>
      </div>

      {erro && (
        <p role="alert" className="text-xs text-pomodoro bg-pomodoro/5 border border-pomodoro/20 rounded-lg p-2">
          {erro}
        </p>
      )}

      {/* ações por status (as da gestão) */}
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
        {pedido.status === 'aceito' && (
          <>
            <p className="flex-1 text-xs text-creme-muted self-center">🕐 Na fila da cozinha.</p>
            <BotaoSecundario onClick={() => setDialogo('recusar')} disabled={pending}>
              Cancelar
            </BotaoSecundario>
          </>
        )}
        {pedido.status === 'em_preparo' && (
          <>
            {/* mesmo gesto da cozinha — pra quando ela esquece ou está sem a tela aberta */}
            <BotaoPrimario onClick={() => mudar('pronto')} disabled={pending}>
              {pending ? '...' : 'Pronta'}
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
              {pending
                ? '...'
                : pedido.modalidade === 'entrega'
                  ? 'Saiu para entrega'
                  : pedido.modalidade === 'retirada'
                    ? 'Cliente retirou'
                    : 'Entregue na mesa'}
            </BotaoPrimario>
            <BotaoSecundario onClick={() => setDialogo('recusar')} disabled={pending}>
              Cancelar
            </BotaoSecundario>
          </>
        )}
        {pedido.status === 'saiu_para_entrega' && (
          <>
            <BotaoPrimario onClick={() => mudar('concluido')} disabled={pending}>
              {pending ? '...' : 'Confirmar entrega'}
            </BotaoPrimario>
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
          onConfirmar={(minutos) => mudar('aceito', { minutosEstimados: minutos })}
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

/** Chama o cliente no WhatsApp com a conversa já contextualizada no pedido. */
function LinkWhatsApp({ pedido }: { pedido: PedidoGestao }) {
  const primeiroNome = pedido.nome_cliente.trim().split(/\s+/)[0];
  const link = linkWhatsAppCliente(
    pedido.telefone_cliente,
    `Olá, ${primeiroNome}! Aqui é da pizzaria, sobre o seu pedido #${pedido.numero}: `
  );
  if (!link) return null;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener"
      className="inline-flex items-center gap-1 font-semibold text-white bg-[#25D366] hover:opacity-90 rounded-full px-2.5 py-1 transition-opacity"
    >
      <IconeWhatsApp />
      WhatsApp
    </a>
  );
}

function IconeWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
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
