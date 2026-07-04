'use client';

// src/components/checkout/EnderecoStep.tsx
//
// Etapa 2 (só entrega): endereço + preview do frete (calcularFrete no client;
// o valor definitivo é recalculado server-side em criarPedido).

import { formatarPreco } from '@/lib/cardapio';
import type { ResultadoFrete } from '@/lib/frete';
import type { EnderecoEntrega, EnderecoSalvo } from '@/types/pedido';

const inputClass =
  'w-full border border-borda-suave rounded-lg p-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pomodoro/40';

interface EnderecoStepProps {
  endereco: EnderecoEntrega;
  onChange: (campo: keyof EnderecoEntrega, valor: string) => void;
  salvarEndereco: boolean;
  onSalvarEnderecoChange: (salvar: boolean) => void;
  enderecosSalvos: EnderecoSalvo[];
  onUsarSalvo: (endereco: EnderecoSalvo) => void;
  frete: ResultadoFrete | null;
}

export function EnderecoStep({
  endereco,
  onChange,
  salvarEndereco,
  onSalvarEnderecoChange,
  enderecosSalvos,
  onUsarSalvo,
  frete,
}: EnderecoStepProps) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-bold text-carbono">Endereço de entrega</h2>

      {enderecosSalvos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-creme-muted uppercase tracking-wide">
            Endereços salvos
          </p>
          <div className="flex flex-wrap gap-2">
            {enderecosSalvos.map((salvo) => (
              <button
                key={salvo.id}
                type="button"
                onClick={() => onUsarSalvo(salvo)}
                className="text-xs border border-borda-suave bg-white rounded-full px-3 py-2 hover:border-pomodoro hover:text-pomodoro transition-colors"
              >
                {salvo.apelido || `${salvo.rua}, ${salvo.numero}`}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label htmlFor="rua" className="block text-sm font-medium text-carbono mb-1">Rua *</label>
          <input id="rua" type="text" required value={endereco.rua} onChange={(e) => onChange('rua', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="numero" className="block text-sm font-medium text-carbono mb-1">Número *</label>
          <input id="numero" type="text" required value={endereco.numero} onChange={(e) => onChange('numero', e.target.value)} className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="complemento" className="block text-sm font-medium text-carbono mb-1">Complemento</label>
          <input id="complemento" type="text" value={endereco.complemento ?? ''} onChange={(e) => onChange('complemento', e.target.value)} placeholder="Apto, bloco..." className={inputClass} />
        </div>
        <div>
          <label htmlFor="bairro" className="block text-sm font-medium text-carbono mb-1">Bairro *</label>
          <input id="bairro" type="text" required value={endereco.bairro} onChange={(e) => onChange('bairro', e.target.value)} className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="cidade" className="block text-sm font-medium text-carbono mb-1">Cidade</label>
          <input id="cidade" type="text" value={endereco.cidade ?? ''} onChange={(e) => onChange('cidade', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="cep" className="block text-sm font-medium text-carbono mb-1">CEP</label>
          <input id="cep" type="text" inputMode="numeric" value={endereco.cep ?? ''} onChange={(e) => onChange('cep', e.target.value)} placeholder="00000-000" className={inputClass} />
        </div>
      </div>

      <div>
        <label htmlFor="referencia" className="block text-sm font-medium text-carbono mb-1">Ponto de referência</label>
        <input id="referencia" type="text" value={endereco.referencia ?? ''} onChange={(e) => onChange('referencia', e.target.value)} className={inputClass} />
      </div>

      <label className="flex items-center gap-2 text-sm text-carbono cursor-pointer">
        <input
          type="checkbox"
          checked={salvarEndereco}
          onChange={(e) => onSalvarEnderecoChange(e.target.checked)}
          className="w-4 h-4 accent-pomodoro"
        />
        Salvar este endereço para os próximos pedidos
      </label>

      {frete && (
        <div
          className={`rounded-lg p-3 text-sm border ${
            frete.entrega
              ? 'bg-manjericao/5 border-manjericao/20 text-manjericao'
              : 'bg-pomodoro/5 border-pomodoro/20 text-pomodoro'
          }`}
        >
          {frete.entrega ? (
            <>
              Taxa de entrega: <strong>{frete.valor === 0 ? 'Grátis' : formatarPreco(frete.valor)}</strong>
              {frete.motivo && <span className="block text-xs mt-0.5">{frete.motivo}</span>}
            </>
          ) : (
            frete.motivo
          )}
        </div>
      )}
    </div>
  );
}
