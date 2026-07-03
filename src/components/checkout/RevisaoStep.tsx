'use client';

// src/components/checkout/RevisaoStep.tsx
//
// Etapa 5: revisão final — itens (mesmos formatos do CartDrawer), endereço,
// pagamento e totais. O botão de confirmar fica no rodapé da página.

import { formatarPreco } from '@/lib/cardapio';
import type { CartItem } from '@/types/carrinho';
import type { EnderecoEntrega, Modalidade, MetodoPagamentoLocal } from '@/types/pedido';
import { METODO_PAGAMENTO_LABEL, MODALIDADE_LABEL } from '@/types/pedido';

interface RevisaoStepProps {
  itens: CartItem[];
  modalidade: Modalidade;
  endereco: EnderecoEntrega | null;
  nome: string;
  telefone: string;
  metodoPagamento: MetodoPagamentoLocal;
  observacao: string;
  onObservacaoChange: (observacao: string) => void;
  subtotal: number;
  taxaEntrega: number;
  taxaServico: number;
  total: number;
}

export function RevisaoStep({
  itens,
  modalidade,
  endereco,
  nome,
  telefone,
  metodoPagamento,
  observacao,
  onObservacaoChange,
  subtotal,
  taxaEntrega,
  taxaServico,
  total,
}: RevisaoStepProps) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-bold text-carbono">Revise seu pedido</h2>

      {/* Itens */}
      <ul className="space-y-2">
        {itens.map((item) => (
          <li key={item.id} className="flex justify-between gap-3 text-sm bg-white border border-borda-suave rounded-lg p-3">
            <div className="min-w-0">
              <p className="font-semibold text-carbono">
                {item.quantidade}× {item.nome}
              </p>
              {item.descricao && <p className="text-xs text-creme-muted truncate">{item.descricao}</p>}
              {item.adicionais && item.adicionais.length > 0 && (
                <p className="text-xs text-creme-muted">
                  + {item.adicionais.map((a) => a.nome).join(', ')}
                </p>
              )}
            </div>
            <span className="font-semibold text-carbono whitespace-nowrap">
              {formatarPreco(item.precoUnit * item.quantidade)}
            </span>
          </li>
        ))}
      </ul>

      {/* Entrega / retirada */}
      <div className="bg-white border border-borda-suave rounded-lg p-3 text-sm space-y-1">
        <p className="font-semibold text-carbono">{MODALIDADE_LABEL[modalidade]}</p>
        {modalidade === 'entrega' && endereco && (
          <p className="text-creme-muted">
            {endereco.rua}, {endereco.numero}
            {endereco.complemento ? ` — ${endereco.complemento}` : ''} · {endereco.bairro}
            {endereco.cidade ? `, ${endereco.cidade}` : ''}
          </p>
        )}
        <p className="text-creme-muted">
          {nome} · {telefone}
        </p>
        <p className="text-creme-muted">
          Pagamento: {modalidade === 'entrega' ? 'na entrega' : 'no balcão'} —{' '}
          {METODO_PAGAMENTO_LABEL[metodoPagamento]}
        </p>
      </div>

      {/* Observação */}
      <div>
        <label htmlFor="observacao" className="block text-sm font-medium text-carbono mb-1">
          Observações para a pizzaria
        </label>
        <textarea
          id="observacao"
          rows={2}
          value={observacao}
          onChange={(e) => onObservacaoChange(e.target.value)}
          placeholder="Ex.: tirar a cebola, campainha quebrada..."
          className="w-full border border-borda-suave rounded-lg p-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pomodoro/40 resize-none"
        />
      </div>

      {/* Totais */}
      <div className="bg-white border border-borda-suave rounded-lg p-3 text-sm space-y-1.5">
        <div className="flex justify-between text-creme-muted">
          <span>Subtotal</span>
          <span>{formatarPreco(subtotal)}</span>
        </div>
        {modalidade === 'entrega' && (
          <div className="flex justify-between text-creme-muted">
            <span>Taxa de entrega</span>
            <span>{taxaEntrega === 0 ? 'Grátis' : formatarPreco(taxaEntrega)}</span>
          </div>
        )}
        {taxaServico > 0 && (
          <div className="flex justify-between text-creme-muted">
            <span>Taxa de serviço</span>
            <span>{formatarPreco(taxaServico)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-carbono pt-1.5 border-t border-borda-suave">
          <span>Total</span>
          <span className="font-display text-lg">{formatarPreco(total)}</span>
        </div>
      </div>
    </div>
  );
}
