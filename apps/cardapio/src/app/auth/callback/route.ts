// src/app/auth/callback/route.ts
//
// Retorno do OAuth (Google): troca o código pela sessão (PKCE — o verifier
// está no cookie que o GoogleButton criou) e garante a linha em `perfis`,
// já que quem entra pelo Google não passa pelo formulário de cadastro.
// O telefone entra depois, no primeiro pedido (criarPedido faz o upsert).

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabase as admin } from '@/lib/supabase';
import { destinoSeguro } from '@/lib/redirect';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = destinoSeguro(request.nextUrl.searchParams.get('next'), '/');

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Perfil via service-role (INSERT em perfis não tem policy de client).
      const { data: perfil } = await admin
        .from('perfis')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!perfil) {
        const meta = data.user.user_metadata as Record<string, unknown>;
        const nome =
          (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
          (typeof meta.name === 'string' && meta.name.trim()) ||
          data.user.email?.split('@')[0] ||
          'Cliente';
        const { error: errPerfil } = await admin
          .from('perfis')
          .insert({ id: data.user.id, nome });
        if (errPerfil) {
          console.error('[auth/callback] insert perfis:', errPerfil.code, errPerfil.message);
        }
      }

      return NextResponse.redirect(new URL(next, request.url));
    }
    console.error('[auth/callback] exchange:', error?.code, error?.message);
  }

  // Falhou: volta pro login da pizzaria (se dá pra saber qual) com aviso.
  const slug = next.match(/^\/([^/]+)/)?.[1];
  const url = new URL(slug ? `/${slug}/entrar` : '/', request.url);
  if (slug) {
    url.searchParams.set('erro', 'google');
    if (next !== `/${slug}`) url.searchParams.set('redirect', next);
  }
  return NextResponse.redirect(url);
}
