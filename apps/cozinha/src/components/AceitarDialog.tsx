'use client';

// src/components/AceitarDialog.tsx
//
// Aceitar pedido: escolher a previsão em minutos (presets + campo livre).
// A action grava previsao_pronto_em = now() + minutos.

import { useState } from 'react';

const PRESETS = [20, 30, 40, 50, 60];

interface Props {
  numero: number;
  pending: boolean;
  onConfirmar: (minutos: number) => void;
  onFechar: () => void;
}

export function AceitarDialog({ numero, pending, onConfirmar, onFechar }: Props) {
  const [minutos, setMinutos] = useState<number>(40);

  return (
    <Overlay onFechar={onFechar}>
      <h3 className="font-display text-xl font-bold text-carbono">
        Aceitar pedido #{numero}
      </h3>
      <p className="text-sm text-creme-muted">Em quantos minutos fica pronto?</p>

      <div className="grid grid-cols-5 gap-2">
        {PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMinutos(m)}
            className={`p-3 rounded-lg border-2 font-bold text-sm transition-colors ${
              minutos === m
                ? 'border-manjericao bg-manjericao text-white'
                : 'border-borda-suave text-carbono hover:border-manjericao'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="minutos" className="block text-sm font-medium text-carbono mb-1">
          Outro valor (minutos)
        </label>
        <input
          id="minutos"
          type="number"
          min={1}
          max={240}
          value={minutos}
          onChange={(e) => setMinutos(Number(e.target.value))}
          className="w-full border border-borda-suave rounded-lg p-3 text-sm bg-massa-bg focus:outline-none focus:ring-2 focus:ring-manjericao/40"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          disabled={pending || !minutos || minutos < 1 || minutos > 240}
          onClick={() => onConfirmar(minutos)}
          className="flex-1 bg-manjericao hover:opacity-90 disabled:opacity-60 text-white p-3 rounded-lg font-semibold text-sm transition-all active:scale-[0.99]"
        >
          {pending ? 'Aceitando...' : `Aceitar (${minutos} min)`}
        </button>
        <button
          type="button"
          onClick={onFechar}
          disabled={pending}
          className="px-4 border-2 border-borda-suave text-carbono hover:bg-massa-bg rounded-lg font-semibold text-sm transition-colors"
        >
          Voltar
        </button>
      </div>
    </Overlay>
  );
}

export function Overlay({
  children,
  onFechar,
}: {
  children: React.ReactNode;
  onFechar: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-carbono/50 flex items-end sm:items-center justify-center p-4"
      onClick={onFechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl p-5 w-full max-w-md space-y-4 shadow-xl"
      >
        {children}
      </div>
    </div>
  );
}
