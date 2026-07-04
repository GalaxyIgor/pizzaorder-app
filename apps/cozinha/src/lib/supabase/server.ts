// src/lib/supabase/server.ts
//
// Client Supabase para Server Components / Server Actions / Route Handlers,
// autenticado com a sessão do usuário (cookies). Consultas passam pelo RLS.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chamado a partir de um Server Component (não pode escrever cookies).
            // Sem problema: o refresh de sessão é feito no src/proxy.ts.
          }
        },
      },
    }
  );
}
