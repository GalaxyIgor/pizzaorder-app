// packages/supabase-mock/src/select-parser.ts
//
// Parser do subconjunto de sintaxe de select do PostgREST usado pelos apps:
//   "id, nome, variacoes_produto (id, preco), grupos_adicionais!inner(pizzaria_id)"
// Suporta alias (`apelido:coluna`), `*` e embeds aninhados com `!inner`.

export type SelectNode =
  | { kind: 'column'; name: string; alias: string }
  | { kind: 'star' }
  | { kind: 'embed'; relation: string; alias: string; inner: boolean; children: SelectNode[] };

export function parseSelect(input: string | undefined | null): SelectNode[] {
  const texto = (input ?? '*').trim() || '*';
  return parseLista(texto);
}

function parseLista(texto: string): SelectNode[] {
  return dividirNoTopo(texto)
    .map((parte) => parte.trim())
    .filter(Boolean)
    .map(parseItem);
}

/** Divide por vírgulas que não estão dentro de parênteses. */
function dividirNoTopo(texto: string): string[] {
  const partes: string[] = [];
  let nivel = 0;
  let atual = '';
  for (const ch of texto) {
    if (ch === '(') nivel++;
    if (ch === ')') nivel--;
    if (nivel < 0) throw new Error(`select inválido: parêntese sobrando em "${texto}"`);
    if (ch === ',' && nivel === 0) {
      partes.push(atual);
      atual = '';
    } else {
      atual += ch;
    }
  }
  if (nivel !== 0) throw new Error(`select inválido: parêntese aberto em "${texto}"`);
  partes.push(atual);
  return partes;
}

function parseItem(item: string): SelectNode {
  if (item === '*') return { kind: 'star' };

  const abre = item.indexOf('(');
  if (abre === -1) {
    const [alias, nome] = separarAlias(item);
    return { kind: 'column', name: nome, alias };
  }

  if (!item.endsWith(')')) throw new Error(`select inválido: "${item}"`);
  const cabeca = item.slice(0, abre).trim();
  const corpo = item.slice(abre + 1, -1);
  const [alias, nomeComHint] = separarAlias(cabeca);
  const [relation, ...hints] = nomeComHint.split('!').map((s) => s.trim());
  return {
    kind: 'embed',
    relation,
    alias: alias === nomeComHint ? relation : alias,
    inner: hints.includes('inner'),
    children: parseLista(corpo),
  };
}

function separarAlias(texto: string): [alias: string, nome: string] {
  const i = texto.indexOf(':');
  if (i === -1) return [texto.trim(), texto.trim()];
  return [texto.slice(0, i).trim(), texto.slice(i + 1).trim()];
}
