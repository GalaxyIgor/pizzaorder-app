// src/app/auth/callback/route.ts
//
// Retorno do OAuth (Google): troca o código pela sessão (PKCE) e aplica a
// MESMA regra do signIn de email+senha — conta sem vínculo de staff é
// deslogada na hora (evita cliente do cardápio logar na gestão).

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { VinculoStaff } from '@/lib/staff';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Mesma instância do client: a sessão recém-criada vive nela.
      const { data } = await supabase
        .from('staff_pizzaria')
        .select('pizzaria_id, papel, pizzarias (nome, slug)')
        .order('criado_em');
      const vinculos = (data ?? []) as unknown as VinculoStaff[];

      if (vinculos.length === 0) {
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL('/login?erro=sem-acesso', request.url));
      }

      // 1 pizzaria => direto ao painel; várias => a raiz lista para escolher.
      return NextResponse.redirect(
        new URL(vinculos.length === 1 ? `/${vinculos[0].pizzarias.slug}` : '/', request.url)
      );
    }
    console.error('[auth/callback] exchange:', error.code, error.message);
  }

  return NextResponse.redirect(new URL('/login?erro=google', request.url));
}
