'use client';

// src/components/BotaoImprimir.tsx — some na impressão via .no-print (globals.css)

export function BotaoImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print bg-carbono text-white px-6 py-3 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity"
    >
      🖨️ Imprimir comanda
    </button>
  );
}
