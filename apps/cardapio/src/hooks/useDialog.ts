// src/hooks/useDialog.ts
//
// Comportamento comum dos modais/gavetas do cardápio: fecha com Esc, trava o
// scroll da página, leva o foco para dentro do painel ao abrir (e devolve ao
// elemento de origem ao fechar) e mantém o Tab circulando dentro do painel.
// Uso: <div ref={ref} role="dialog" aria-modal="true" ...>

import { useEffect, useRef } from 'react';

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialog<T extends HTMLElement>(aberto: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  // ref para não reexecutar o efeito quando o pai recria o callback a cada render
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!aberto) return;
    const painel = ref.current;
    const origem = document.activeElement as HTMLElement | null;

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // foco inicial: primeiro elemento focável (normalmente o "fechar")
    painel?.querySelector<HTMLElement>(FOCAVEIS)?.focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !painel) return;
      const itens = [...painel.querySelectorAll<HTMLElement>(FOCAVEIS)];
      if (itens.length === 0) return;
      const primeiro = itens[0];
      const ultimo = itens[itens.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };

    painel?.addEventListener('keydown', onKeyDown);
    return () => {
      painel?.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflowAnterior;
      origem?.focus?.({ preventScroll: true });
    };
  }, [aberto]);

  return ref;
}
