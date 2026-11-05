'use client';

// src/components/carrinho/CartDrawer.tsx
//
// Sacola: painel deslizante que lista os itens do carrinho, permite ajustar
// quantidade / remover, e mostra o total.

import { useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { estaAberto } from '@pizzaorder/shared';
import { useCart } from '@/contexts/CartContext';
import { useCardapio } from '@/contexts/CardapioContext';
import { formatarPreco } from '@/lib/cardapio';
import { useDialog } from '@/hooks/useDialog';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, totalItems, totalPrice, increment, decrement, remove, clear } = useCart();
  const { pizzaria } = useCardapio();
  const [expandido, setExpandido] = useState<string | null>(null);
  // esvaziar é destrutivo: o 1º toque só pede confirmação
  const [confirmandoLimpar, setConfirmandoLimpar] = useState(false);
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const painelRef = useDialog<HTMLDivElement>(isOpen, onClose);

  const lojaFechada = pizzaria.pedidos_pausados || !estaAberto(pizzaria.horario_funcionamento);
  // pedido mínimo avisado já na sacola, não só na última etapa do checkout
  const faltaParaMinimo =
    pizzaria.pedido_minimo != null && totalPrice < pizzaria.pedido_minimo
      ? pizzaria.pedido_minimo - totalPrice
      : 0;
  const podeComprar = !lojaFechada && faltaParaMinimo === 0;

  if (!isOpen) return null;

  const toggleExpandido = (id: string) =>
    setExpandido((atual) => (atual === id ? null : id));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* painel */}
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sacola-titulo"
        className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85dvh] flex flex-col shadow-xl"
      >
        <header className="flex items-center justify-between p-4 border-b border-borda-suave">
          <h2 id="sacola-titulo" className="font-display text-xl font-bold text-carbono">
            Sua sacola{totalItems > 0 && <span className="text-creme-muted font-normal text-base"> ({totalItems})</span>}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar sacola"
            className="text-creme-muted hover:text-carbono hover:bg-massa-bg rounded-full text-2xl leading-none w-11 h-11 -mr-2 flex items-center justify-center transition-colors"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 px-4 text-center">
            <span className="text-4xl" aria-hidden="true">🛒</span>
            <p className="text-creme-muted">Sua sacola está vazia.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 bg-pomodoro hover:bg-pomodoro-hover text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Ver cardápio
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
              {items.map((item) => {
                const aberto = expandido === item.id;
                return (
                  <li key={item.id} className="border border-borda-suave rounded-lg">
                    <div className="flex gap-3 items-center p-3">
                      <button
                        type="button"
                        onClick={() => toggleExpandido(item.id)}
                        aria-expanded={aberto}
                        aria-label={`${aberto ? 'Ocultar' : 'Ver'} detalhes de ${item.nome}`}
                        className="flex gap-3 items-center flex-1 min-w-0 text-left cursor-pointer"
                      >
                        <div className="relative w-14 h-14 flex-shrink-0 rounded-md overflow-hidden bg-massa-bg">
                          {item.imagem_url ? (
                            <Image src={item.imagem_url} alt="" fill sizes="56px" className="object-cover" />
                          ) : (
                            <div aria-hidden="true" className="w-full h-full flex items-center justify-center text-xl">🍕</div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-carbono truncate">{item.nome}</h3>
                          <span className="text-sm font-bold text-manjericao tabular-nums">
                            {formatarPreco(item.precoUnit * item.quantidade)}
                          </span>
                        </div>

                        <span
                          aria-hidden="true"
                          className={`text-creme-muted text-xs transition-transform ${aberto ? 'rotate-180' : ''}`}
                        >
                          ▾
                        </span>
                      </button>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => decrement(item.id)}
                          aria-label={`Diminuir quantidade de ${item.nome}`}
                          className="w-9 h-9 rounded-full border border-borda-suave text-carbono font-bold flex items-center justify-center hover:bg-massa-bg"
                        >
                          <span aria-hidden="true">−</span>
                        </button>
                        <span className="w-5 text-center text-sm font-semibold text-carbono tabular-nums">{item.quantidade}</span>
                        <button
                          type="button"
                          onClick={() => increment(item.id)}
                          aria-label={`Aumentar quantidade de ${item.nome}`}
                          className="w-9 h-9 rounded-full bg-pomodoro text-white font-bold flex items-center justify-center hover:bg-pomodoro-hover"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        aria-label={`Remover ${item.nome}`}
                        className="w-9 h-9 flex items-center justify-center rounded-full text-creme-muted hover:text-pomodoro hover:bg-pomodoro/10 flex-shrink-0 transition-colors"
                      >
                        <IconeLixeira />
                      </button>
                    </div>

                    {aberto && (
                      <div className="px-3 pb-3 pt-1 border-t border-borda-suave text-xs text-creme-muted space-y-2">
                        <p>
                          <span className="font-semibold text-carbono">Preço unitário:</span>{' '}
                          {formatarPreco(item.precoUnit)}
                        </p>
                        {item.tamanho && (
                          <p>
                            <span className="font-semibold text-carbono">Tamanho:</span> {item.tamanho}
                          </p>
                        )}
                        {item.adicionais && item.adicionais.length > 0 && (
                          <div>
                            <p className="font-semibold text-carbono mb-1">Adicionais:</p>
                            <ul className="space-y-1">
                              {item.adicionais.map((a) => (
                                <li key={a.opcaoId} className="flex justify-between gap-2">
                                  <span>• {a.nome}</span>
                                  <span>{a.preco > 0 ? formatarPreco(a.preco) : 'Grátis'}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {item.tipo === 'meia-meia' && item.sabores ? (
                          <div>
                            <p className="font-semibold text-carbono mb-1">Sabores:</p>
                            <ul className="space-y-1">
                              {item.sabores.map((sabor, i) => (
                                <li key={sabor.produtoId + i}>
                                  <span className="text-carbono">• {sabor.nome}</span>
                                  {sabor.descricao && <span> — {sabor.descricao}</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          item.descricao && (
                            <p>
                              <span className="font-semibold text-carbono">Descrição:</span> {item.descricao}
                            </p>
                          )
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <footer className="border-t border-borda-suave p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-carbono font-medium">Total</span>
                <span className="font-display text-xl font-bold text-carbono tabular-nums">
                  {formatarPreco(totalPrice)}
                </span>
              </div>
              {lojaFechada ? (
                <p role="status" className="text-sm text-carbono bg-ouro/15 border border-ouro/40 rounded-lg p-3">
                  {pizzaria.pedidos_pausados
                    ? `${pizzaria.nome} não está aceitando pedidos agora. Sua sacola fica guardada — tente mais tarde.`
                    : `${pizzaria.nome} está fechada agora. Sua sacola fica guardada para quando abrir.`}
                </p>
              ) : faltaParaMinimo > 0 ? (
                <p role="status" className="text-sm text-carbono bg-ouro/15 border border-ouro/40 rounded-lg p-3">
                  Faltam <strong className="tabular-nums">{formatarPreco(faltaParaMinimo)}</strong> para o
                  pedido mínimo de {formatarPreco(pizzaria.pedido_minimo!)}.
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => podeComprar && router.push(`/${slug}/checkout`)}
                disabled={!podeComprar}
                className={`w-full p-3 rounded-lg font-semibold transition active:scale-[0.99] ${
                  podeComprar
                    ? 'bg-pomodoro hover:bg-pomodoro-hover text-white cursor-pointer'
                    : 'bg-creme-muted/30 text-carbono/70 cursor-not-allowed'
                }`}
              >
                Finalizar pedido
              </button>
              {faltaParaMinimo > 0 && !lojaFechada && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full p-3 rounded-lg border-2 border-borda-suave text-carbono font-semibold text-sm hover:bg-massa-bg transition-colors"
                >
                  Adicionar mais itens
                </button>
              )}
              {confirmandoLimpar ? (
                <div className="flex items-center justify-center gap-3 text-sm py-1">
                  <span className="text-carbono">Remover todos os itens?</span>
                  <button
                    type="button"
                    onClick={() => {
                      clear();
                      setConfirmandoLimpar(false);
                    }}
                    className="font-semibold text-pomodoro hover:underline px-2 py-1"
                  >
                    Sim, esvaziar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmandoLimpar(false)}
                    className="text-creme-muted hover:text-carbono px-2 py-1"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmandoLimpar(true)}
                  className="w-full text-creme-muted hover:text-pomodoro text-sm py-2"
                >
                  Esvaziar sacola
                </button>
              )}
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

function IconeLixeira() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[18px] h-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}
