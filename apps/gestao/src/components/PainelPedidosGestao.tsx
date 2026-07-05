'use client';

// src/components/PainelPedidosGestao.tsx
//
// Painel ao vivo da gestão: Novos (aguardando aceite) / Na cozinha / Prontos
// & em rota. Sem arrasto nem som — as ações são por botão no card; o título
// da aba avisa quando há pedido aguardando aceite.
//
// Tempo real: MESMO bloco validado da cozinha (setAuth explícito antes do
// subscribe, canal único por montagem, router.refresh() no evento, renovação
// de token via onAuthStateChange e polling de fallback).

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { PedidoGestao } from '@/types/gestao';
import { PedidoCardGestao } from '@/components/PedidoCardGestao';

const FALLBACK_REFRESH_MS = 45_000;
const TITULO_PADRAO = 'PizzaOrder Gestão';

interface Props {
  slug: string;
  pizzariaId: string;
  pedidosIniciais: PedidoGestao[];
}

export function PainelPedidosGestao({ slug, pizzariaId, pedidosIniciais }: Props) {
  const router = useRouter();
  // Relógio compartilhado: re-renderiza os "há X min" dos cards.
  const [agora, setAgora] = useState(() => Date.now());

  const pedidos = pedidosIniciais;
  const novos = pedidos.filter((p) => p.status === 'pendente');
  const naCozinha = pedidos.filter((p) => p.status === 'aceito' || p.status === 'em_preparo');
  const prontos = pedidos.filter((p) => p.status === 'pronto' || p.status === 'saiu_para_entrega');

  // ------- Realtime + fallback de polling -------
  useEffect(() => {
    const supabase = createClient();
    let cancelado = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      // Garante que o socket usa o token do staff (a policy de SELECT é o que
      // autoriza os eventos) ANTES de assinar — em vez de confiar na hidratação
      // assíncrona da sessão.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelado) return;
      if (session?.access_token) supabase.realtime.setAuth(session.access_token);

      // Nome único por montagem: o client é singleton e, no StrictMode do dev,
      // montar/desmontar/remontar com o MESMO topic cria corrida de join/leave
      // que mata a assinatura silenciosamente.
      channel = supabase
        .channel(`pedidos:${pizzariaId}:${Math.random().toString(36).slice(2)}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'pedidos',
            filter: `pizzaria_id=eq.${pizzariaId}`,
          },
          () => router.refresh()
        )
        .subscribe((status, err) => {
          if (status !== 'SUBSCRIBED') {
            console.warn('[realtime pedidos]', status, err?.message ?? '');
          }
        });
    })();

    // sessões longas: repassa o token renovado pro socket
    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) supabase.realtime.setAuth(session.access_token);
    });

    const timer = setInterval(() => {
      setAgora(Date.now());
      router.refresh();
    }, FALLBACK_REFRESH_MS);

    const relogio = setInterval(() => setAgora(Date.now()), 30_000);

    return () => {
      cancelado = true;
      if (channel) supabase.removeChannel(channel);
      authSub.unsubscribe();
      clearInterval(timer);
      clearInterval(relogio);
    };
  }, [pizzariaId, router]);

  // ------- título da aba avisa pedido aguardando aceite -------
  useEffect(() => {
    document.title = novos.length > 0 ? `(${novos.length}) Pedidos aguardando!` : TITULO_PADRAO;
    return () => {
      document.title = TITULO_PADRAO;
    };
  }, [novos.length]);

  const renderCards = (lista: PedidoGestao[]) =>
    lista.map((p) => <PedidoCardGestao key={p.id} slug={slug} pedido={p} agora={agora} />);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
      <Coluna titulo="Novos" qtd={novos.length} destaque={novos.length > 0}>
        {renderCards(novos)}
      </Coluna>
      <Coluna titulo="Na cozinha" qtd={naCozinha.length}>
        {renderCards(naCozinha)}
      </Coluna>
      <Coluna titulo="Prontos & em rota" qtd={prontos.length}>
        {renderCards(prontos)}
      </Coluna>
    </div>
  );
}

function Coluna({
  titulo,
  qtd,
  destaque = false,
  children,
}: {
  titulo: string;
  qtd: number;
  destaque?: boolean;
  children: React.ReactNode;
}) {
  const borda = destaque ? 'border-pomodoro/60 bg-pomodoro/5' : 'border-borda-suave bg-white/60';

  return (
    <section className={`rounded-xl border-2 p-3 space-y-3 min-h-32 transition-colors ${borda}`}>
      <h2 className="flex items-center justify-between text-sm font-bold text-carbono uppercase tracking-wide">
        {titulo}
        <span
          className={`text-xs rounded-full px-2.5 py-0.5 ${
            destaque ? 'bg-pomodoro text-white animate-pulse' : 'bg-borda-suave text-carbono'
          }`}
        >
          {qtd}
        </span>
      </h2>
      {qtd === 0 ? <p className="text-sm text-creme-muted py-4 text-center">Nenhum pedido.</p> : children}
    </section>
  );
}
