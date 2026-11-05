// src/hooks/useAuth.ts
//
// Hook para verificar o estado de autenticação do usuário no client.
// O supabase-js (~60 kB gz) é importado dentro do efeito: fica fora do JS
// inicial do cardápio (o AccountMenu já mostra o placeholder enquanto carrega).

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    let unsubscribe: (() => void) | undefined;

    import('@/lib/supabase/client').then(({ createClient }) => {
      if (cancelado) return;
      const supabase = createClient();

      // Tenta obter a sessão atual
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (cancelado) return;
        setUser(user ?? null);
        setLoading(false);
      });

      // Ouve mudanças de autenticação
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });
      unsubscribe = () => subscription?.unsubscribe();
    });

    return () => {
      cancelado = true;
      unsubscribe?.();
    };
  }, []);

  return { user, loading };
}
