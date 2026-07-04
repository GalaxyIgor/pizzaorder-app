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
//
// Arrastar: segurar um card (~250ms) e soltar na próxima coluna avança o
// status (pointer events — mouse e toque, sem lib). Só transições da máquina
// de estados: Novos→Em preparo abre o diálogo de previsão; Em preparo→Prontos
// marca pronto. Os botões continuam existindo como caminho alternativo.

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { atualizarStatusPedido } from '@/lib/actions/pedidos';
import type { StatusPedido } from '@pizzaorder/shared';
import type { PedidoCozinha } from '@/types/cozinha';
import { PedidoCard } from '@/components/PedidoCard';
import { AceitarDialog } from '@/components/AceitarDialog';

const FALLBACK_REFRESH_MS = 45_000;
const TITULO_PADRAO = 'PizzaOrder Cozinha';
const SEGURAR_MS = 250;
const TOLERANCIA_SCROLL_PX = 12;

type ColunaAlvo = 'pendente' | 'em_preparo' | 'prontos';

interface DragState {
  pedido: PedidoCozinha;
  x: number;
  y: number;
  alvo: ColunaAlvo | null;
}

interface Props {
  slug: string;
  pizzariaId: string;
  pedidosIniciais: PedidoCozinha[];
}

function colunaDoStatus(status: StatusPedido): ColunaAlvo {
  if (status === 'pendente') return 'pendente';
  if (status === 'em_preparo') return 'em_preparo';
  return 'prontos';
}

function colunaEm(x: number, y: number): ColunaAlvo | null {
  const el = document.elementFromPoint(x, y);
  const col = el?.closest('[data-coluna]') as HTMLElement | null;
  return (col?.dataset.coluna as ColunaAlvo | undefined) ?? null;
}

export function PainelPedidos({ slug, pizzariaId, pedidosIniciais }: Props) {
  const router = useRouter();
  // Relógio compartilhado: re-renderiza os "há X min" dos cards.
  const [agora, setAgora] = useState(() => Date.now());
  const [somAtivo, setSomAtivo] = useState(false);
  const [turnoIniciado, setTurnoIniciado] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const pendentesAnterioresRef = useRef<Set<string> | null>(null);

  // ------- arrastar e soltar -------
  const [drag, setDrag] = useState<DragState | null>(null);
  const [aceitarDrop, setAceitarDrop] = useState<PedidoCozinha | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const avisoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingDrop, startDrop] = useTransition();

  const pedidos = pedidosIniciais;
  const novos = pedidos.filter((p) => p.status === 'pendente');
  const emPreparo = pedidos.filter((p) => p.status === 'em_preparo');
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
      cancelado = true;
      if (channel) supabase.removeChannel(channel);
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

  // ------- lógica do soltar -------
  const avisar = (msg: string) => {
    setAviso(msg);
    if (avisoTimerRef.current) clearTimeout(avisoTimerRef.current);
    avisoTimerRef.current = setTimeout(() => setAviso(null), 3500);
  };

  const executar = (
    pedido: PedidoCozinha,
    novoStatus: StatusPedido,
    extras?: { minutosEstimados?: number }
  ) => {
    startDrop(async () => {
      const r = await atualizarStatusPedido({
        slug,
        pedidoId: pedido.id,
        novoStatus,
        ...extras,
      });
      if (r.erro) avisar(r.erro);
      else setAceitarDrop(null);
    });
  };

  const soltar = (pedido: PedidoCozinha, alvo: ColunaAlvo | null) => {
    if (!alvo || alvo === colunaDoStatus(pedido.status)) return;

    if (pedido.status === 'pendente' && alvo === 'em_preparo') {
      setAceitarDrop(pedido); // aceite exige a previsão em minutos
      return;
    }
    if (pedido.status === 'em_preparo' && alvo === 'prontos') {
      executar(pedido, 'pronto');
      return;
    }
    if (pedido.status === 'pendente' && alvo === 'prontos') {
      avisar('Aceite o pedido primeiro — arraste para "Em preparo".');
      return;
    }
    avisar('O pedido só anda para a frente. Para desfazer, use "Cancelar".');
  };

  // ------- segurar e arrastar (pointer events, mouse + toque) -------
  const aoSegurar = (e: React.PointerEvent, pedido: PedidoCozinha) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // botões/links/campos dentro do card continuam clicáveis normalmente
    if ((e.target as HTMLElement).closest('button, a, input, textarea')) return;

    const x0 = e.clientX;
    const y0 = e.clientY;
    const pos = { x: x0, y: y0 };
    let ativo = false;

    const bloquearScroll = (ev: TouchEvent) => {
      if (ativo) ev.preventDefault();
    };

    const limpar = () => {
      clearTimeout(timer);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', limpar);
      window.removeEventListener('touchmove', bloquearScroll);
      setDrag(null);
    };

    const timer = setTimeout(() => {
      ativo = true;
      setDrag({ pedido, x: pos.x, y: pos.y, alvo: colunaEm(pos.x, pos.y) });
    }, SEGURAR_MS);

    const move = (ev: PointerEvent) => {
      pos.x = ev.clientX;
      pos.y = ev.clientY;
      if (!ativo) {
        // mexeu antes de "segurar": é scroll/clique, não arrasto
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > TOLERANCIA_SCROLL_PX) limpar();
        return;
      }
      setDrag({ pedido, x: ev.clientX, y: ev.clientY, alvo: colunaEm(ev.clientX, ev.clientY) });
    };

    const up = () => {
      if (ativo) {
        soltar(pedido, colunaEm(pos.x, pos.y));
        // engole o click fantasma que dispara após soltar sobre um botão
        window.addEventListener(
          'click',
          (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
          },
          { capture: true, once: true }
        );
      }
      limpar();
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', limpar);
    window.addEventListener('touchmove', bloquearScroll, { passive: false });
  };

  // enquanto arrasta, qual coluna é destino válido deste pedido?
  const conviteValido = (coluna: ColunaAlvo): boolean => {
    if (!drag) return false;
    if (drag.pedido.status === 'pendente') return coluna === 'em_preparo';
    if (drag.pedido.status === 'em_preparo') return coluna === 'prontos';
    return false;
  };

  const renderCards = (lista: PedidoCozinha[]) =>
    lista.map((p) => (
      <div
        key={p.id}
        onPointerDown={(e) => aoSegurar(e, p)}
        style={{ touchAction: 'pan-y', userSelect: drag ? 'none' : undefined }}
        className={`${drag?.pedido.id === p.id ? 'opacity-40' : ''} cursor-grab active:cursor-grabbing`}
      >
        <PedidoCard slug={slug} pedido={p} agora={agora} />
      </div>
    ));

  return (
    <div className="space-y-4">
      {/* barra de status do turno / som */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-creme-muted hidden md:block">
          Dica: segure e arraste um pedido para a próxima coluna.
        </p>
        <button
          type="button"
          onClick={() => (somAtivo ? setSomAtivo(false) : iniciarTurno())}
          className="ml-auto text-sm font-semibold text-carbono border-2 border-borda-suave rounded-lg px-3 py-2 hover:border-manjericao transition-colors"
        >
          {somAtivo ? '🔔 Som ligado' : '🔕 Som desligado'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <Coluna
          titulo="Novos"
          coluna="pendente"
          qtd={novos.length}
          destaque={novos.length > 0}
          convite={conviteValido('pendente')}
          sobre={drag?.alvo === 'pendente' && conviteValido('pendente')}
        >
          {renderCards(novos)}
        </Coluna>
        <Coluna
          titulo="Em preparo"
          coluna="em_preparo"
          qtd={emPreparo.length}
          convite={conviteValido('em_preparo')}
          sobre={drag?.alvo === 'em_preparo' && conviteValido('em_preparo')}
        >
          {renderCards(emPreparo)}
        </Coluna>
        <Coluna
          titulo="Prontos & em rota"
          coluna="prontos"
          qtd={prontos.length}
          convite={conviteValido('prontos')}
          sobre={drag?.alvo === 'prontos' && conviteValido('prontos')}
        >
          {renderCards(prontos)}
        </Coluna>
      </div>

      {/* fantasma que segue o dedo/mouse */}
      {drag && (
        <div
          aria-hidden="true"
          className="fixed z-[70] pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{ left: drag.x, top: drag.y }}
        >
          <div className="bg-white border-2 border-manjericao rounded-xl px-4 py-2 shadow-xl font-display font-bold text-carbono">
            #{drag.pedido.numero}
          </div>
        </div>
      )}

      {/* aviso de movimento inválido / erro da action */}
      {aviso && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] bg-carbono text-white text-sm rounded-lg px-4 py-3 shadow-xl">
          {aviso}
        </div>
      )}

      {/* aceite via arrasto: mesma exigência de previsão do botão */}
      {aceitarDrop && (
        <AceitarDialog
          numero={aceitarDrop.numero}
          pending={pendingDrop}
          onConfirmar={(minutos) => executar(aceitarDrop, 'em_preparo', { minutosEstimados: minutos })}
          onFechar={() => setAceitarDrop(null)}
        />
      )}

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
  coluna,
  qtd,
  destaque = false,
  convite = false,
  sobre = false,
  children,
}: {
  titulo: string;
  coluna: ColunaAlvo;
  qtd: number;
  destaque?: boolean;
  /** é destino válido do pedido sendo arrastado */
  convite?: boolean;
  /** o arrasto está em cima desta coluna agora */
  sobre?: boolean;
  children: React.ReactNode;
}) {
  const borda = sobre
    ? 'border-manjericao bg-manjericao/10'
    : convite
      ? 'border-manjericao/50 border-dashed bg-manjericao/5'
      : destaque
        ? 'border-pomodoro/60 bg-pomodoro/5'
        : 'border-borda-suave bg-white/60';

  return (
    <section data-coluna={coluna} className={`rounded-xl border-2 p-3 space-y-3 min-h-32 transition-colors ${borda}`}>
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
