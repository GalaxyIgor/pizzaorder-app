// src/lib/whatsapp.ts
//
// Link wa.me para a gestão chamar o CLIENTE (o telefone é o canal oficial
// de contato do pedido). O inverso — cliente chamando a pizzaria — fica na
// página de confirmação do cardápio, via pizzarias.whatsapp.

/**
 * Monta o link do WhatsApp a partir do telefone como foi digitado
 * ("(37) 98801-3727" vira 5537988013727). Retorna null se o número não
 * tiver 10–11 dígitos (fixo/celular com DDD) — aí o botão nem aparece.
 */
export function linkWhatsAppCliente(telefone: string, mensagem: string): string | null {
  const digitos = telefone.replace(/\D/g, '');
  const semPais = digitos.startsWith('55') && digitos.length > 11 ? digitos.slice(2) : digitos;
  if (semPais.length < 10 || semPais.length > 11) return null;
  return `https://wa.me/55${semPais}?text=${encodeURIComponent(mensagem)}`;
}
