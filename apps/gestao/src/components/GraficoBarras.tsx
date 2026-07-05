'use client';

// src/components/GraficoBarras.tsx
//
// Faturamento por dia em SVG próprio (sem lib). Segue as specs da skill
// dataviz: série única (sem legenda — o título nomeia), cor validada
// #1E7A46 sobre superfície clara, barras finas com topo arredondado de 4px
// ancoradas na baseline (clipPath), grid recessivo, rótulos em tokens de
// texto e tooltip por barra com alvo de hover na coluna inteira.

import { useState } from 'react';
import { formatarPreco } from '@pizzaorder/shared';
import type { DiaFaturamento } from '@/lib/analytics';

const COR_SERIE = '#1E7A46'; // verde validado (scripts/validate_palette.js, modo claro)
const W = 720;
const H = 220;
const PAD = { top: 12, right: 8, bottom: 26, left: 8 };

/** Teto "bonito" para o eixo: 1/2/2.5/5 × 10^k logo acima do máximo. */
function tetoBonito(max: number): number {
  if (max <= 0) return 100;
  const exp = Math.floor(Math.log10(max));
  const base = Math.pow(10, exp);
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (max <= m * base) return m * base;
  }
  return 10 * base;
}

function rotuloDia(dia: string): string {
  return `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
}

export function GraficoBarras({ dados }: { dados: DiaFaturamento[] }) {
  const [hover, setHover] = useState<number | null>(null);

  if (dados.length === 0) return null;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const teto = tetoBonito(Math.max(...dados.map((d) => d.total)));

  const passo = plotW / dados.length;
  const larguraBarra = Math.max(4, Math.min(40, passo - 2)); // gap ≥ 2px entre barras

  const alturaDe = (total: number) => (total / teto) * plotH;
  const xDe = (i: number) => PAD.left + i * passo + (passo - larguraBarra) / 2;

  // no máximo ~8 rótulos no eixo x
  const cadaN = Math.max(1, Math.ceil(dados.length / 8));

  const emHover = hover !== null ? dados[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Faturamento por dia">
        <defs>
          {/* topo arredondado SEM arredondar a base: a barra desce 4px além da
              baseline e o clip corta na área do gráfico */}
          <clipPath id="plot-clip">
            <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        {/* grid recessivo: meia altura + topo */}
        {[0.5, 1].map((f) => (
          <line
            key={f}
            x1={PAD.left}
            x2={PAD.left + plotW}
            y1={PAD.top + plotH - f * plotH}
            y2={PAD.top + plotH - f * plotH}
            stroke="#E8E3DF"
            strokeWidth="1"
          />
        ))}
        {/* rótulos do grid (tokens de texto, não cor de série) */}
        {[0.5, 1].map((f) => (
          <text
            key={f}
            x={PAD.left + 2}
            y={PAD.top + plotH - f * plotH - 4}
            fontSize="10"
            fill="#7A726E"
          >
            {formatarPreco(teto * f)}
          </text>
        ))}

        {/* baseline */}
        <line
          x1={PAD.left}
          x2={PAD.left + plotW}
          y1={PAD.top + plotH}
          y2={PAD.top + plotH}
          stroke="#7A726E"
          strokeWidth="1"
        />

        {/* barras */}
        <g clipPath="url(#plot-clip)">
          {dados.map((d, i) => {
            const h = alturaDe(d.total);
            if (h <= 0) return null;
            return (
              <rect
                key={d.dia}
                x={xDe(i)}
                y={PAD.top + plotH - h}
                width={larguraBarra}
                height={h + 4}
                rx="4"
                fill={COR_SERIE}
                opacity={hover === null || hover === i ? 1 : 0.45}
              />
            );
          })}
        </g>

        {/* rótulos do eixo x (esparsos) */}
        {dados.map((d, i) =>
          i % cadaN === 0 ? (
            <text
              key={d.dia}
              x={xDe(i) + larguraBarra / 2}
              y={H - 8}
              fontSize="10"
              fill="#7A726E"
              textAnchor="middle"
            >
              {rotuloDia(d.dia)}
            </text>
          ) : null
        )}

        {/* alvos de hover: a coluna inteira, maior que a marca */}
        {dados.map((d, i) => (
          <rect
            key={d.dia}
            x={PAD.left + i * passo}
            y={PAD.top}
            width={passo}
            height={plotH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>

      {/* tooltip */}
      {emHover && hover !== null && (
        <div
          className="absolute -top-1 -translate-x-1/2 -translate-y-full bg-carbono text-white text-xs rounded-lg px-3 py-2 pointer-events-none whitespace-nowrap shadow-lg"
          style={{ left: `${((PAD.left + hover * passo + passo / 2) / W) * 100}%` }}
        >
          <p className="font-semibold">{rotuloDia(emHover.dia)}</p>
          <p>
            {formatarPreco(emHover.total)} · {emHover.qtd} pedido{emHover.qtd === 1 ? '' : 's'}
          </p>
        </div>
      )}
    </div>
  );
}
