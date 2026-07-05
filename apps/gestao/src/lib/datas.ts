// src/lib/datas.ts
//
// Limites de período no fuso da pizzaria (America/Sao_Paulo, UTC-3 fixo desde
// 2019 — mesmo padrão do histórico da cozinha). `criado_em` é UTC no banco;
// nunca usar setHours() do servidor (o fuso do host é imprevisível).

export type Periodo = 'hoje' | '7d' | '30d' | 'mes';

export const PERIODO_LABEL: Record<Periodo, string> = {
  hoje: 'Hoje',
  '7d': '7 dias',
  '30d': '30 dias',
  mes: 'Este mês',
};

const FUSO = 'America/Sao_Paulo';

/** Data local de hoje como 'YYYY-MM-DD'. */
export function hojeLocal(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: FUSO });
}

/** 'YYYY-MM-DD' local -> ISO UTC da meia-noite local desse dia. */
export function inicioDoDiaISO(diaLocal: string): string {
  return new Date(`${diaLocal}T00:00:00-03:00`).toISOString();
}

/** Soma dias a uma data local 'YYYY-MM-DD' (aritmética em UTC, sem fuso do host). */
export function somarDias(diaLocal: string, dias: number): string {
  const d = new Date(`${diaLocal}T12:00:00Z`); // meio-dia evita bordas de DST/arredondamento
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export interface IntervaloPeriodo {
  /** inclusive */
  inicioISO: string;
  /** exclusivo (meia-noite local de amanhã) */
  fimISO: string;
  /** dias locais 'YYYY-MM-DD' cobertos, em ordem — base dos buckets do gráfico */
  dias: string[];
}

export function intervaloPeriodo(periodo: Periodo): IntervaloPeriodo {
  const hoje = hojeLocal();
  const amanha = somarDias(hoje, 1);

  let primeiroDia: string;
  switch (periodo) {
    case 'hoje':
      primeiroDia = hoje;
      break;
    case '7d':
      primeiroDia = somarDias(hoje, -6);
      break;
    case '30d':
      primeiroDia = somarDias(hoje, -29);
      break;
    case 'mes':
      primeiroDia = `${hoje.slice(0, 7)}-01`;
      break;
  }

  const dias: string[] = [];
  for (let d = primeiroDia; d <= hoje; d = somarDias(d, 1)) dias.push(d);

  return { inicioISO: inicioDoDiaISO(primeiroDia), fimISO: inicioDoDiaISO(amanha), dias };
}

/** ISO UTC -> dia local 'YYYY-MM-DD' (bucket do gráfico). */
export function diaLocalDe(isoUTC: string): string {
  return new Date(isoUTC).toLocaleDateString('en-CA', { timeZone: FUSO });
}
