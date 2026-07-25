// src/lib/supabase/anon.ts
//
// Client anon puro (sem cookies/sessão) para dados públicos: enxerga só o que
// as policies de catálogo público liberam. Use no lugar do service-role em
// leituras que não dependem de usuário — a rota pública do cardápio, p.ex.

import { createClient } from '@supabase/supabase-js';

export const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
