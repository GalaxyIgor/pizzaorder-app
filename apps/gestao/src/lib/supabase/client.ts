// src/lib/supabase/client.ts
//
// Client Supabase para o BROWSER (anon key + sessão do usuário via cookies).
// Para o client server-side, ver src/lib/supabase/server.ts.
// O client service-role (server-only, sem sessão) segue em src/lib/supabase.ts.

import { createBrowserClient } from '@supabase/ssr';
import { isSupabaseMock } from '@pizzaorder/supabase-mock/flag';
import { createMockBrowserClient } from '@pizzaorder/supabase-mock/browser';

export function createClient() {
  const criar = isSupabaseMock()
    ? (createMockBrowserClient as unknown as typeof createBrowserClient)
    : createBrowserClient;

  return criar(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
