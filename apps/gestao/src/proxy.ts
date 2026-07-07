// src/proxy.ts
//
// Proxy (o antigo middleware, renomeado no Next 16):
// 1. mantém a sessão Supabase fresca (refresh de token via cookies);
// 2. gate otimista: tudo exceto /login e /auth/** exige usuário logado
//    (/auth/callback chega SEM sessão — é ele que a cria no retorno do OAuth).
//
// Isso é só UX — pages e Server Actions revalidam via exigirStaff().

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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

  const { pathname } = request.nextUrl;

  if (!user && pathname !== '/login' && !pathname.startsWith('/auth/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
