// packages/supabase-mock/src/flag.ts
//
// Liga/desliga o modo mock. NEXT_PUBLIC_ para o Next inlinar o valor no
// bundle do browser (com a flag desligada o ramo mock vira código morto).

export function isSupabaseMock(): boolean {
  const ligado = process.env.NEXT_PUBLIC_SUPABASE_MOCK === '1';
  if (ligado && process.env.VERCEL_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_SUPABASE_MOCK=1 não pode ser usado em produção.');
  }
  return ligado;
}
