'use client';

// src/components/PainelPedidos.tsx
//
// Colunas do painel (Novos / Em preparo / Prontos & em rota). Os dados vêm do
// server component; aqui só distribuímos nos grupos e mantemos um refresh
// periódico (fase 5 troca por Realtime + fallback).

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PedidoCozinha } from '@/types/cozinha';
import { PedidoCard } from '@/components/PedidoCard';

const REFRESH_MS = 15_000;

interface Props {
  slug: string;
  pizzariaId: string;
  pedidosIniciais: PedidoCozinha[];
}

export function PainelPedidos({ slug, pedidosIniciais }: Props) {
  const router = useRouter();
  // Relógio compartilhado: re-renderiza os "há X min" dos cards junto com o refresh.
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setAgora(Date.now());
      router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [router]);

  const pedidos = pedidosIniciais;
  const novos = pedidos.filter((p) => p.status === 'pendente');
  const emPreparo = pedidos.filter((p) => p.status === 'em_preparo');
  const prontos = pedidos.filter((p) => p.status === 'pronto' || p.status === 'saiu_para_entrega');

  return (
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
            destaque ? 'bg-pomodoro text-white' : 'bg-borda-suave text-carbono'
          }`}
        >
          {qtd}
        </span>
      </h2>
      {qtd === 0 ? <p className="text-sm text-creme-muted py-4 text-center">Nenhum pedido.</p> : children}
    </section>
  );
}
