'use client';

// src/components/checkout/PagamentoStep.tsx
//
// Etapa 4: forma de pagamento. Na fase atual só "pagar na entrega/retirada",
// limitado aos métodos que a pizzaria marcou na personalização. Dinheiro
// pergunta "troco para quanto?" (opcional). Mercado Pago entra na fase 4 do
// plano e aparece desabilitado como "em breve".

import type { Modalidade, MetodoPagamentoLocal } from '@/types/pedido';
import { METODO_PAGAMENTO_LABEL } from '@/types/pedido';
import { formatarPreco } from '@/lib/cardapio';

interface PagamentoStepProps {
  modalidade: Modalidade;
  /** Métodos que a pizzaria aceita (personalização da gestão). */
  metodosAceitos: MetodoPagamentoLocal[];
  metodo: MetodoPagamentoLocal | null;
  onMetodoChange: (metodo: MetodoPagamentoLocal) => void;
  trocoPara: string;
  onTrocoChange: (valor: string) => void;
  /** Total do pedido (preview) — o troco precisa cobrir. */
  total: number;
}

const ORDEM: MetodoPagamentoLocal[] = ['dinheiro', 'cartao', 'pix'];

export function PagamentoStep({
  modalidade,
  metodosAceitos,
  metodo,
  onMetodoChange,
  trocoPara,
  onTrocoChange,
  total,
}: PagamentoStepProps) {
  const rotulo = modalidade === 'entrega' ? 'Pagar na entrega' : 'Pagar no balcão';
  // fallback: config antiga sem a coluna = aceita tudo
  const metodos = ORDEM.filter((m) => metodosAceitos.length === 0 || metodosAceitos.includes(m));

  const trocoNumero = Number(trocoPara.trim().replace(',', '.'));
  const trocoInsuficiente =
    trocoPara.trim() !== '' && Number.isFinite(trocoNumero) && trocoNumero < total;

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-bold text-carbono">Pagamento</h2>

      <div className="rounded-xl border border-pomodoro bg-pomodoro/5 p-4 space-y-3">
        <p className="font-semibold text-sm text-carbono">{rotulo}</p>
        <p className="text-xs text-creme-muted -mt-2">
          Você paga direto à pizzaria. Escolha como prefere pagar:
        </p>
        <div className="flex flex-wrap gap-2">
          {metodos.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onMetodoChange(m)}
              aria-pressed={metodo === m}
              className={`text-sm rounded-full px-4 py-2 border transition-colors ${
                metodo === m
                  ? 'border-pomodoro bg-pomodoro text-white font-semibold'
                  : 'border-borda-suave bg-white text-carbono hover:border-pomodoro'
              }`}
            >
              {METODO_PAGAMENTO_LABEL[m]}
            </button>
          ))}
        </div>

        {metodo === 'dinheiro' && (
          <div>
            <label htmlFor="troco" className="block text-sm font-medium text-carbono mb-1">
              Troco para quanto? — deixe vazio se não precisar
            </label>
            <input
              id="troco"
              type="text"
              inputMode="decimal"
              value={trocoPara}
              onChange={(e) => onTrocoChange(e.target.value)}
              placeholder="ex.: 100,00"
              className="w-full border border-borda-suave rounded-lg p-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pomodoro/40"
            />
            {trocoInsuficiente && (
              <p className="text-xs text-pomodoro mt-1">
                O valor precisa cobrir o total do pedido ({formatarPreco(total)}).
              </p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-borda-suave bg-white p-4 opacity-60">
        <p className="font-semibold text-sm text-carbono flex items-center gap-2">
          Pagar online agora
          <span className="text-[10px] font-bold uppercase tracking-wide bg-ouro/20 text-carbono rounded-full px-2 py-0.5">
            Em breve
          </span>
        </p>
        <p className="text-xs text-creme-muted mt-1">
          Cartão ou Pix pelo Mercado Pago, sem contato na entrega.
        </p>
      </div>
    </div>
  );
}
