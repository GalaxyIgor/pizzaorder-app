'use client';

// src/components/conta/PedidoStatusLive.tsx
//
// Mantém a página do pedido viva: assina mudanças em `pedidos` (a policy
// pedidos_select_own autoriza os eventos do próprio cliente) e dá
// router.refresh() a cada evento, com polling de fallback se o socket cair.
// Não renderiza nada — é só o "motor" de atualização.
//
// filtro: ex. `id=eq.<pedidoId>` (detalhe) ou `cliente_id=eq.<userId>` (lista).

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const FALLBACK_REFRESH_MS = 30_000;

export function PedidoStatusLive({ filtro }: { filtro: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let cancelado = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      // token da sessão no socket ANTES de assinar (RLS decide o que chega);
      // topic único por montagem evita a corrida join/leave do StrictMode.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelado) return;
      if (session?.access_token) supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`pedido-live:${Math.random().toString(36).slice(2)}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'pedidos', filter: filtro },
          () => router.refresh()
        )
        .subscribe((status, err) => {
          if (status !== 'SUBSCRIBED') {
            console.warn('[pedido live]', status, err?.message ?? '');
          }
        });
    })();

    const timer = setInterval(() => router.refresh(), FALLBACK_REFRESH_MS);

    return () => {
      cancelado = true;
      if (channel) supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [filtro, router]);

  return null;
}
