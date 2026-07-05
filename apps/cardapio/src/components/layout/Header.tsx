// src/components/cardapio/Header.tsx
'use client';

import Image from 'next/image';
import { useMemo } from 'react';
import { statusHorario } from '@pizzaorder/shared';
import { useCardapio } from '@/contexts/CardapioContext';
import { AccountMenu } from '@/components/layout/AccountMenu';

export function Header() {
  const { pizzaria } = useCardapio();

  const statusAtual = useMemo(() => {
    return statusHorario(pizzaria.horario_funcionamento);
  }, [pizzaria.horario_funcionamento]);

  return (
    <header className="py-6 border-b border-borda-suave flex items-center gap-3">
      {pizzaria.logo_url && (
        <div className="relative w-12 h-12 flex-shrink-0 rounded-full overflow-hidden">
          <Image src={pizzaria.logo_url} alt={pizzaria.nome} fill sizes="48px" className="object-cover" />
        </div>
      )}
      <div className="flex-1">
        <h1
          className="font-display text-2xl sm:text-3xl font-bold"
          style={{ color: pizzaria.cor_primaria }}
        >
          {pizzaria.nome}
        </h1>
        <p className="text-sm text-creme-muted mt-1">
          <span className={`font-bold mr-1 ${statusAtual.aberto ? 'text-manjericao' : 'text-pomodoro'}`}>
            {statusAtual.aberto ? '●' : '●'}
          </span>
          {statusAtual.aberto ? 'Aberto' : 'Fechado'} • {statusAtual.horarios}
        </p>
      </div>
      <AccountMenu />
    </header>
  );
}