'use client';

// src/components/RecusarDialog.tsx
//
// Recusar (pendente) ou cancelar (demais status) com motivo obrigatório.
// O motivo é interno — o cliente vê apenas "Cancelado".

import { useState } from 'react';
import { Overlay } from '@/components/AceitarDialog';

const MOTIVOS = [
  'Ingrediente em falta',
  'Cozinha sobrecarregada',
  'Fora do horário de funcionamento',
  'Problema no endereço de entrega',
];

interface Props {
  numero: number;
  /** true = recusa de pedido novo; false = cancelamento de pedido já aceito */
  recusa: boolean;
  pending: boolean;
  onConfirmar: (motivo: string) => void;
  onFechar: () => void;
}

export function RecusarDialog({ numero, recusa, pending, onConfirmar, onFechar }: Props) {
  const [motivo, setMotivo] = useState('');
  const acao = recusa ? 'Recusar' : 'Cancelar';

  return (
    <Overlay onFechar={onFechar}>
      <h3 className="font-display text-xl font-bold text-carbono">
        {acao} pedido #{numero}
      </h3>
      <p className="text-sm text-creme-muted">
        Informe o motivo (uso interno — o cliente vê apenas &quot;Cancelado&quot;).
      </p>

      <div className="space-y-2">
        {MOTIVOS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMotivo(m)}
            className={`block w-full text-left p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
              motivo === m
                ? 'border-pomodoro bg-pomodoro/5 text-pomodoro'
                : 'border-borda-suave text-carbono hover:border-pomodoro/50'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="motivo" className="block text-sm font-medium text-carbono mb-1">
          Ou descreva o motivo
        </label>
        <textarea
          id="motivo"
          rows={2}
          value={MOTIVOS.includes(motivo) ? '' : motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ex.: acabou a mussarela"
          className="w-full border border-borda-suave rounded-lg p-3 text-sm bg-massa-bg focus:outline-none focus:ring-2 focus:ring-pomodoro/40"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          disabled={pending || motivo.trim() === ''}
          onClick={() => onConfirmar(motivo.trim())}
          className="flex-1 bg-pomodoro hover:bg-pomodoro-hover disabled:opacity-60 text-white p-3 rounded-lg font-semibold text-sm transition-all active:scale-[0.99]"
        >
          {pending ? 'Enviando...' : `${acao} pedido`}
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
