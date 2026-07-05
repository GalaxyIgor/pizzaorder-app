'use client';

// src/components/PedidoCard.tsx
//
// Card de pedido (touch-friendly), focado em PRODUÇÃO: o que preparar e o
// prazo definido pela gestão no aceite. Valores, endereço e cancelamento são
// assunto da gestão (o endereço completo sai na comanda).

import { useState, useTransition } from 'react';
import { MODALIDADE_LABEL, type StatusPedido } from '@pizzaorder/shared';
import { atualizarStatusPedido } from '@/lib/actions/pedidos';
import type { PedidoCozinha } from '@/types/cozinha';

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
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const mudar = (novoStatus: StatusPedido) => {
    setErro(null);
    startTransition(async () => {
      const r = await atualizarStatusPedido({ slug, pedidoId: pedido.id, novoStatus });
      if (r.erro) setErro(r.erro);
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
        {/* prazo prometido ao cliente (a gestão definiu no aceite) */}
        {pedido.previsao_pronto_em && pedido.status !== 'pronto' && (
          <p
            className={`text-xs font-semibold rounded-full px-2.5 py-1 inline-block ${
              atrasado ? 'bg-pomodoro text-white' : 'bg-ouro/20 text-carbono'
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

      {/* observação em destaque (a cozinha não pode perder isso) */}
      {pedido.observacao && (
        <p className="text-sm text-carbono bg-ouro/15 border border-ouro/40 rounded-lg p-2">
          <span className="font-semibold">Obs.:</span> {pedido.observacao}
        </p>
      )}

      <p className="text-xs text-creme-muted border-t border-borda-suave pt-2">
        {pedido.nome_cliente}
      </p>

      {erro && (
        <p role="alert" className="text-xs text-pomodoro bg-pomodoro/5 border border-pomodoro/20 rounded-lg p-2">
          {erro}
        </p>
      )}

      {/* ações por status (só as da cozinha) */}
      <div className="flex gap-2 pt-1">
        {pedido.status === 'aceito' && (
          <BotaoPrimario onClick={() => mudar('em_preparo')} disabled={pending}>
            {pending ? '...' : 'Começar preparo'}
          </BotaoPrimario>
        )}
        {pedido.status === 'em_preparo' && (
          <BotaoPrimario onClick={() => mudar('pronto')} disabled={pending}>
            {pending ? '...' : 'Pronta'}
          </BotaoPrimario>
        )}
        {pedido.status === 'pronto' && (
          <p className="flex-1 text-xs text-creme-muted self-center">
            ✅ Pronta — a gestão cuida da {pedido.modalidade === 'entrega' ? 'entrega' : 'retirada'}.
          </p>
        )}
      </div>
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
