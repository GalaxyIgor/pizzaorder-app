'use client';

// src/components/carrinho/CartDrawer.tsx
//
// Sacola: painel deslizante que lista os itens do carrinho, permite ajustar
// quantidade / remover, e mostra o total.

import { useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { formatarPreco } from '@/lib/cardapio';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, totalItems, totalPrice, increment, decrement, remove, clear } = useCart();
  const [expandido, setExpandido] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  if (!isOpen) return null;

  const toggleExpandido = (id: string) =>
    setExpandido((atual) => (atual === id ? null : id));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* painel */}
      <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85dvh] flex flex-col shadow-xl">
        <header className="flex items-center justify-between p-4 border-b border-borda-suave">
          <h2 className="font-display text-xl font-bold text-carbono">
            Sua sacola{totalItems > 0 && <span className="text-creme-muted font-normal text-base"> ({totalItems})</span>}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar sacola"
            className="text-creme-muted hover:text-carbono text-2xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 px-4 text-center">
            <span className="text-4xl">🛒</span>
            <p className="text-creme-muted">Sua sacola está vazia.</p>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto p-4 space-y-3">
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
                            <Image src={item.imagem_url} alt={item.nome} fill sizes="56px" className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">🍕</div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-carbono truncate">{item.nome}</h3>
                          <span className="text-sm font-bold text-manjericao">
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

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => decrement(item.id)}
                          aria-label="Diminuir quantidade"
                          className="w-7 h-7 rounded-full border border-borda-suave text-carbono font-bold flex items-center justify-center hover:bg-massa-bg"
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-sm font-semibold text-carbono">{item.quantidade}</span>
                        <button
                          type="button"
                          onClick={() => increment(item.id)}
                          aria-label="Aumentar quantidade"
                          className="w-7 h-7 rounded-full bg-pomodoro text-white font-bold flex items-center justify-center hover:bg-pomodoro-hover"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        aria-label={`Remover ${item.nome}`}
                        className="text-creme-muted hover:text-pomodoro text-lg flex-shrink-0"
                      >
                        🗑
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
                <span className="font-display text-xl font-bold text-carbono">
                  {formatarPreco(totalPrice)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/${slug}/checkout`)}
                className="w-full bg-pomodoro hover:bg-pomodoro-hover text-white p-3 rounded-lg font-semibold transition-colors active:scale-[0.99]"
              >
                Finalizar pedido
              </button>
              <button
                type="button"
                onClick={clear}
                className="w-full text-creme-muted hover:text-pomodoro text-sm py-1"
              >
                Esvaziar sacola
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
