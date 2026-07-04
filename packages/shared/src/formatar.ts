// packages/shared/src/formatar.ts

/** Formata um valor em Reais (pt-BR). */
export function formatarPreco(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
