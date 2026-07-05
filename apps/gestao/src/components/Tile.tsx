// src/components/Tile.tsx
//
// Stat tile do dashboard: rótulo apagado + número forte (texto usa tokens de
// texto — cor de série fica só nas marcas do gráfico).

export function Tile({
  rotulo,
  valor,
  detalhe,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
}) {
  return (
    <div className="bg-white border border-borda-suave rounded-xl p-4">
      <p className="text-xs text-creme-muted uppercase tracking-wide">{rotulo}</p>
      <p className="font-display text-2xl font-bold text-carbono leading-tight">{valor}</p>
      {detalhe && <p className="text-xs text-creme-muted mt-0.5">{detalhe}</p>}
    </div>
  );
}
