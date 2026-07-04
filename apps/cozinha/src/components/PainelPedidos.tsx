'use client';

// src/components/PainelPedidos.tsx
//
// Colunas do painel (Novos / Em preparo / Prontos & em rota).
//
// Tempo real: assina postgres_changes de `pedidos` (a policy RLS
// pedidos_select_staff é o que autoriza os eventos) e, a cada evento,
// refaz o fetch via router.refresh() — mais simples e imune a evento perdido
// que fazer merge do payload. Polling fica como fallback do socket cair.
//
// Som: gerado com WebAudio (sem asset). Autoplay exige gesto do usuário,
// então o overlay "Iniciar turno" desbloqueia o áudio; sem ele, o alerta
// visual (badge/título da aba) continua funcionando.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { PedidoCozinha } from '@/types/cozinha';
import { PedidoCard } from '@/components/PedidoCard';

const FALLBACK_REFRESH_MS = 45_000;
const TITULO_PADRAO = 'PizzaOrder Cozinha';

interface Props {
  slug: string;
  pizzariaId: string;
  pedidosIniciais: PedidoCozinha[];
}

export function PainelPedidos({ slug, pizzariaId, pedidosIniciais }: Props) {
  const router = useRouter();
  // Relógio compartilhado: re-renderiza os "há X min" dos cards.
  const [agora, setAgora] = useState(() => Date.now());
  const [somAtivo, setSomAtivo] = useState(false);
  const [turnoIniciado, setTurnoIniciado] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const pendentesAnterioresRef = useRef<Set<string> | null>(null);

  const pedidos = pedidosIniciais;
  const novos = pedidos.filter((p) => p.status === 'pendente');
  const emPreparo = pedidos.filter((p) => p.status === 'em_preparo');
  const prontos = pedidos.filter((p) => p.status === 'pronto' || p.status === 'saiu_para_entrega');

  // ------- Realtime + fallback de polling -------
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`pedidos:${pizzariaId}`)
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
      .subscribe();

    // sessões longas de cozinha: repassa o token renovado pro socket
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
      supabase.removeChannel(channel);
      authSub.unsubscribe();
      clearInterval(timer);
      clearInterval(relogio);
    };
  }, [pizzariaId, router]);

  // ------- Alerta de pedido novo (som + título da aba) -------
  // Compara o conjunto de pendentes entre renders: funciona igual para
  // realtime e polling, sem depender do payload do evento.
  useEffect(() => {
    const ids = new Set(novos.map((p) => p.id));
    const anteriores = pendentesAnterioresRef.current;
    pendentesAnterioresRef.current = ids;

    document.title = novos.length > 0 ? `(${novos.length}) Pedidos novos!` : TITULO_PADRAO;

    if (anteriores === null) return; // primeiro render: não alertar o que já estava lá
    const chegouNovo = [...ids].some((id) => !anteriores.has(id));
    if (chegouNovo && somAtivo) tocarAlerta(audioCtxRef.current);

    return () => {
      document.title = TITULO_PADRAO;
    };
  }, [novos, somAtivo]);

  const iniciarTurno = () => {
    // o clique é o gesto que desbloqueia o áudio no browser
    const ctx = audioCtxRef.current ?? new AudioContext();
    audioCtxRef.current = ctx;
    void ctx.resume();
    tocarAlerta(ctx); // confirmação audível de que o som funciona
    setSomAtivo(true);
    setTurnoIniciado(true);
  };

  return (
    <div className="space-y-4">
      {/* barra de status do turno / som */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => (somAtivo ? setSomAtivo(false) : iniciarTurno())}
          className="text-sm font-semibold text-carbono border-2 border-borda-suave rounded-lg px-3 py-2 hover:border-manjericao transition-colors"
        >
          {somAtivo ? '🔔 Som ligado' : '🔕 Som desligado'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <Coluna titulo="Novos" qtd={novos.length} destaque={novos.length > 0}>
          {novos.map((p) => (
            <PedidoCard key={p.id} slug={slug} pedido={p} agora={agora} />
          ))}
        </Coluna>
        <Coluna titulo="Em preparo" qtd={emPreparo.length}>
          {emPreparo.map((p) => (
            <PedidoCard key={p.id} slug={slug} pedido={p} agora={agora} />
          ))}
        </Coluna>
        <Coluna titulo="Prontos & em rota" qtd={prontos.length}>
          {prontos.map((p) => (
            <PedidoCard key={p.id} slug={slug} pedido={p} agora={agora} />
          ))}
        </Coluna>
      </div>

      {/* overlay de início de turno: gesto que desbloqueia o áudio */}
      {!turnoIniciado && (
        <div className="fixed inset-0 z-50 bg-carbono/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center space-y-4 shadow-xl">
            <span className="text-4xl" aria-hidden="true">
              🔔
            </span>
            <h2 className="font-display text-xl font-bold text-carbono">Iniciar o turno</h2>
            <p className="text-sm text-creme-muted">
              Toque para ativar o alerta sonoro de novos pedidos (o navegador exige um
              toque antes de permitir som).
            </p>
            <button
              type="button"
              onClick={iniciarTurno}
              className="w-full bg-manjericao hover:opacity-90 text-white p-4 rounded-lg font-semibold transition-all active:scale-[0.99]"
            >
              Iniciar turno com som
            </button>
            <button
              type="button"
              onClick={() => setTurnoIniciado(true)}
              className="w-full p-2 text-sm text-creme-muted hover:text-carbono transition-colors"
            >
              Continuar sem som
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Dois bipes curtos (campainha) via WebAudio — sem asset de áudio. */
function tocarAlerta(ctx: AudioContext | null) {
  if (!ctx || ctx.state !== 'running') return;
  const bipe = (inicio: number, freq: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + inicio);
    gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + inicio + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + inicio + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + inicio);
    osc.stop(ctx.currentTime + inicio + 0.4);
  };
  bipe(0, 880);
  bipe(0.45, 1174.66);
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
  return (
    <section
      className={`rounded-xl border-2 p-3 space-y-3 min-h-32 ${
        destaque ? 'border-pomodoro/60 bg-pomodoro/5' : 'border-borda-suave bg-white/60'
      }`}
    >
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
