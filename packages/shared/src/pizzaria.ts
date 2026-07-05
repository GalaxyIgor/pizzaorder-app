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

  // dia da semana + hora local da pizzaria, independente do fuso do servidor
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
  const agoraMin = hora * 60 + minuto;

  const cobre = (faixa: FaixaHorario, min: number, viradaDeOntem: boolean): boolean => {
    const abre = minutosDoDia(faixa.abre);
    const fecha = minutosDoDia(faixa.fecha);
    if (abre === null || fecha === null) return false;
    if (fecha > abre) {
      // faixa normal, só vale no próprio dia
      return !viradaDeOntem && min >= abre && min < fecha;
    }
    // faixa que cruza a meia-noite: hoje depois de `abre`, ou madrugada seguinte antes de `fecha`
    return viradaDeOntem ? min < fecha : min >= abre;
  };

  const hoje = horario[String(semana)] ?? [];
  if (hoje.some((f) => cobre(f, agoraMin, false))) return true;

  const ontem = horario[String((semana + 6) % 7)] ?? [];
  return ontem.some((f) => cobre(f, agoraMin, true));
}

/**
 * Retorna um objeto com `aberto` (bool) e `horarios` (string formatado).
 * Usado para exibir no header do cardápio: "Aberto • 18:00 - 23:00" ou "Fechado • Abre amanhã às 18:00"
 */
export function statusHorario(
  horario: HorarioFuncionamento | null | undefined,
  agora: Date = new Date()
): { aberto: boolean; horarios: string } {
  const aberto = estaAberto(horario, agora);
  
  if (!horario) {
    return { aberto: true, horarios: 'Sempre aberto' };
  }

  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(agora);

  const DIA: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const semana = DIA[partes.find((p) => p.type === 'weekday')?.value ?? ''] ?? 0;

  const hoje = horario[String(semana)] ?? [];
  
  if (aberto && hoje.length > 0) {
    const faixas = hoje.map((f) => `${f.abre} - ${f.fecha}`).join(' / ');
    return { aberto: true, horarios: faixas };
  }

  if (!aberto && hoje.length > 0) {
    const faixas = hoje.map((f) => `${f.abre} - ${f.fecha}`).join(' / ');
    return { aberto: false, horarios: `Fecha às ${faixas.split(' - ')[1] || '?'}` };
  }

  return { aberto: false, horarios: 'Fechado' };
}
