// src/proxy.ts
//
// Proxy (o antigo middleware, renomeado no Next 16):
// 1. mantém a sessão Supabase fresca (refresh de token via cookies) em toda navegação;
// 2. gate otimista de /[slug]/conta/** e /[slug]/checkout/** → /[slug]/entrar.
//
// Isso é só UX — Server Actions sensíveis revalidam auth.getUser() internamente.

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const ROTA_PROTEGIDA = /^\/([^/]+)\/(conta|checkout)(\/|$)/;

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Importante: getUser() (valida no servidor do Supabase) e não getSession().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const match = pathname.match(ROTA_PROTEGIDA);

  if (!user && match) {
    const url = request.nextUrl.clone();
    url.pathname = `/${match[1]}/entrar`;
    url.search = `?redirect=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Tudo menos assets estáticos e a API (cardápio usa service-role, sem sessão).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
