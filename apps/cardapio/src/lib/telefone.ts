// src/lib/telefone.ts
//
// Máscara e validação de telefone BR (o WhatsApp é o canal de contato do
// pedido, então o número precisa nascer certo). A máscara formata enquanto
// digita: "37988013727" vira "(37) 98801-3727"; colar formatado também funciona.

/** Só os dígitos, no máximo 11 (DDD + celular). */
export function digitosTelefone(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 11);
}

/** Aplica a máscara progressivamente conforme o usuário digita. */
export function formatarTelefone(valor: string): string {
  const d = digitosTelefone(valor);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** 10 dígitos (fixo) ou 11 (celular), sempre com DDD. */
export function telefoneValido(valor: string): boolean {
  const len = valor.replace(/\D/g, '').length;
  return len === 10 || len === 11;
}
