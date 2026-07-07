// packages/shared/src/pizzaria.ts
//
// Configurações do tenant (colunas jsonb de `pizzarias`) usadas pelos dois
// lados: o cardápio calcula frete/preço com elas, a gestão as edita em forms.
// Movidas de apps/cardapio/src/types/cardapio.ts (que re-exporta daqui).

// ============================================================
// MEIA-MEIA
// ============================================================

export type EstrategiaMeiaMeia = 'maior' | 'menor' | 'media' | 'fixo';

export interface ConfigMeiaMeia {
  estrategia: EstrategiaMeiaMeia;
  precoFixo?: number;
}

// ============================================================
// FRETE
// ============================================================

export type TipoFrete = 'faixas_km' | 'preco_por_km' | 'por_bairro' | 'fixo' | 'gratis';

export interface FaixaKm {
  kmInicio: number;
  kmFim: number;
  valor: number;
  entrega: boolean;
}

export interface BairroFrete {
  bairro: string;
  valor: number;
  entrega: boolean;
}

export interface ConfigFrete {
  tipo: TipoFrete;
  faixas?: FaixaKm[];
  valorPorKm?: number;
  minimoFrete?: number;
  bairros?: BairroFrete[];
  valorFixo?: number;
  gratisPedidoAcimaDe?: number;
}

// ============================================================
// TAXA DE SERVIÇO
// ============================================================

export type TipoTaxaServico = 'percentual' | 'fixo';

export interface ConfigTaxaServico {
  tipo: TipoTaxaServico;
  valor: number;
}

// ============================================================
// HORÁRIO DE FUNCIONAMENTO (pizzarias.horario_funcionamento jsonb)
//
// Chave = dia da semana como string '0'..'6' (0 = domingo, padrão getDay()).
// Valor = faixas de atendimento no horário LOCAL da pizzaria
// (America/Sao_Paulo). Array vazio ou chave ausente = fechado no dia.
// Coluna null = sempre aberto (pizzaria não configurou horário).
// ============================================================

export interface FaixaHorario {
  /** "HH:MM" no fuso America/Sao_Paulo. */
  abre: string;
  /** "HH:MM"; se menor que `abre`, a faixa cruza a meia-noite (ex.: 18:00–01:00). */
  fecha: string;
}

export type HorarioFuncionamento = Partial<Record<string, FaixaHorario[]>>;

const FUSO_PIZZARIA = 'America/Sao_Paulo';

/** "HH:MM" -> minutos desde 00:00. Retorna null se malformado. */
function minutosDoDia(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Dia da semana (0 = domingo) e minutos desde 00:00 no fuso da pizzaria. */
function agoraLocal(agora: Date): { semana: number; agoraMin: number } {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSO_PIZZARIA,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(agora);

  const DIA: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const semana = DIA[partes.find((p) => p.type === 'weekday')?.value ?? ''] ?? 0;
  const hora = Number(partes.find((p) => p.type === 'hour')?.value ?? 0) % 24;
  const minuto = Number(partes.find((p) => p.type === 'minute')?.value ?? 0);
  return { semana, agoraMin: hora * 60 + minuto };
}

function cobre(faixa: FaixaHorario, min: number, viradaDeOntem: boolean): boolean {
  const abre = minutosDoDia(faixa.abre);
  const fecha = minutosDoDia(faixa.fecha);
  if (abre === null || fecha === null) return false;
  if (fecha > abre) {
    // faixa normal, só vale no próprio dia
    return !viradaDeOntem && min >= abre && min < fecha;
  }
  // faixa que cruza a meia-noite: hoje depois de `abre`, ou madrugada seguinte antes de `fecha`
  return viradaDeOntem ? min < fecha : min >= abre;
}

/** Faixa que cobre `agora` (de hoje ou a virada de ontem), ou null se nenhuma. */
function faixaAberta(
  horario: HorarioFuncionamento,
  agora: Date
): FaixaHorario | null {
  const { semana, agoraMin } = agoraLocal(agora);

  const hoje = horario[String(semana)] ?? [];
  const deHoje = hoje.find((f) => cobre(f, agoraMin, false));
  if (deHoje) return deHoje;

  const ontem = horario[String((semana + 6) % 7)] ?? [];
  return ontem.find((f) => cobre(f, agoraMin, true)) ?? null;
}

/**
 * A pizzaria está aberta em `agora`?
 * Puro (recebe Date) para servir gestão, cardápio e testes. Faixas que cruzam
 * a meia-noite (fecha < abre) contam também nas primeiras horas do dia seguinte.
 */
export function estaAberto(
  horario: HorarioFuncionamento | null | undefined,
  agora: Date = new Date()
): boolean {
  if (!horario) return true; // sem configuração = sempre aberto
  return faixaAberta(horario, agora) !== null;
}

/**
 * Status para o header do cardápio.
 * - aberto: `fechaAs` traz o fim da faixa atual ("23:00") e `horarios` as faixas de hoje.
 * - fechado: `horarios` vira a próxima abertura de hoje ("Abre às 18:00") ou "Fechado por hoje".
 */
export function statusHorario(
  horario: HorarioFuncionamento | null | undefined,
  agora: Date = new Date()
): { aberto: boolean; horarios: string; fechaAs?: string } {
  if (!horario) {
    return { aberto: true, horarios: 'Sempre aberto' };
  }

  const faixa = faixaAberta(horario, agora);
  const { semana, agoraMin } = agoraLocal(agora);
  const hoje = horario[String(semana)] ?? [];

  if (faixa) {
    const faixas = hoje.map((f) => `${f.abre} - ${f.fecha}`).join(' / ');
    return { aberto: true, horarios: faixas || `${faixa.abre} - ${faixa.fecha}`, fechaAs: faixa.fecha };
  }

  // fechado: existe faixa mais tarde hoje?
  const proxima = hoje
    .filter((f) => (minutosDoDia(f.abre) ?? -1) > agoraMin)
    .sort((a, b) => (minutosDoDia(a.abre) ?? 0) - (minutosDoDia(b.abre) ?? 0))[0];

  if (proxima) {
    return { aberto: false, horarios: `Abre às ${proxima.abre}` };
  }
  return { aberto: false, horarios: 'Fechado por hoje' };
}
