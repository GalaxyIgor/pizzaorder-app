// src/lib/supabase/anon.ts
//
// Client anon puro (sem cookies/sessão) para dados públicos: enxerga só o que
// as policies de catálogo público liberam. Use no lugar do service-role em
// leituras que não dependem de usuário — a rota pública do cardápio, p.ex.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseMock } from '@pizzaorder/supabase-mock/flag';
import { createMockAnonClient } from '@pizzaorder/supabase-mock/server';

export const supabaseAnon: SupabaseClient = isSupabaseMock()
  ? (createMockAnonClient() as unknown as SupabaseClient)
  : createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
