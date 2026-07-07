'use client';

// src/components/checkout/DadosStep.tsx
//
// Etapa 3: dados pessoais — nome/telefone pré-preenchidos do perfil, email read-only.

import { formatarTelefone } from '@/lib/telefone';

const inputClass =
  'w-full border border-borda-suave rounded-lg p-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pomodoro/40';

interface DadosStepProps {
  nome: string;
  telefone: string;
  email: string;
  onNomeChange: (nome: string) => void;
  onTelefoneChange: (telefone: string) => void;
}

export function DadosStep({ nome, telefone, email, onNomeChange, onTelefoneChange }: DadosStepProps) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-bold text-carbono">Seus dados</h2>
      <p className="text-sm text-creme-muted -mt-2">
        A pizzaria usa esses dados para falar com você sobre o pedido.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-3">
        <div>
          <label htmlFor="nome" className="block text-sm font-medium text-carbono mb-1">Nome *</label>
          <input id="nome" type="text" required autoComplete="name" value={nome} onChange={(e) => onNomeChange(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label htmlFor="telefone" className="block text-sm font-medium text-carbono mb-1">Telefone (WhatsApp) *</label>
          <input id="telefone" type="tel" required autoComplete="tel" inputMode="numeric" placeholder="(11) 99999-9999" value={telefone} onChange={(e) => onTelefoneChange(formatarTelefone(e.target.value))} className={inputClass} />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-carbono mb-1">Email</label>
        <input id="email" type="email" value={email} readOnly disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
        <p className="text-xs text-creme-muted mt-1">O email é o da sua conta e não pode ser alterado aqui.</p>
      </div>
    </div>
  );
}
