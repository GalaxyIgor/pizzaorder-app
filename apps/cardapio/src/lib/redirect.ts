// src/lib/redirect.ts
//
// Validação de destino de redirect pós-login. Impede open redirect via
// ?next= / ?redirect= — um atacante manda o cliente autenticado para um
// site externo (phishing) usando a origem confiável da pizzaria.
//
// Só aceita caminhos internos absolutos (uma barra). Um simples
// `startsWith('/') && !startsWith('//')` NÃO basta: o navegador trata "\"
// como "/" e remove whitespace embutido (\t \n \r), então "/\evil.com" ou
// "/\t//evil.com" viram "//evil.com" (protocol-relative) -> origem externa.

// Whitespace (inclui \t \n \r, que o navegador remove da URL) e "\" são as
// rotas de bypass conhecidas para transformar "/..." em "//host".
const CARACTERES_PERIGOSOS = /[\s\\]/;

/**
 * Retorna `destino` se for um caminho interno seguro; senão, `fallback`.
 * O valor devolvido já vem normalizado (pathname + query + hash).
 */
export function destinoSeguro(destino: string | null | undefined, fallback: string): string {
  if (!destino) return fallback;
  if (CARACTERES_PERIGOSOS.test(destino)) return fallback;
  // Precisa ser caminho absoluto interno, não protocol-relative ("//host").
  if (!destino.startsWith('/') || destino.startsWith('//')) return fallback;
  // Defesa em profundidade: tem de resolver para a MESMA origem (interna).
  try {
    const base = 'https://internal.invalid';
    const url = new URL(destino, base);
    if (url.origin !== base) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
