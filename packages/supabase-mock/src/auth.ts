// packages/supabase-mock/src/auth.ts
//
// Supabase Auth de mentira, server-side. A sessão é um cookie com o id do
// usuário, lido/escrito pelo MESMO adapter `cookies: { getAll, setAll }` que
// as factories passam ao @supabase/ssr — então funciona igual em Server
// Components (setAll lança e é ignorado), Server Actions, Route Handlers e
// no proxy. Sem JWT, sem refresh: é só para desenvolvimento local.

import { lerEstado, transacao, type MockUser } from './store';

export const COOKIE_SESSAO = 'sb-mock-auth-token';
const UMA_SEMANA = 60 * 60 * 24 * 7;

/** Código que o GoogleButton mockado manda para /auth/callback. */
export const CODIGO_OAUTH_GOOGLE = 'mock-google';
export const EMAIL_USUARIO_GOOGLE = 'google.teste@pizzaorder.test';

export interface CookieAdapter {
  getAll(): { name: string; value: string }[] | Promise<{ name: string; value: string }[]>;
  setAll?(cookies: { name: string; value: string; options: Record<string, unknown> }[]): void | Promise<void>;
}

export interface AuthErrorShape {
  name: string;
  message: string;
  status: number;
  code: string;
}

function authError(name: string, code: string, message: string, status = 400): AuthErrorShape {
  return { name, code, message, status };
}

const SESSAO_AUSENTE = () =>
  authError('AuthSessionMissingError', 'session_missing', 'Auth session missing!', 400);

/** Formato do `User` do supabase-js. */
export function paraUser(u: MockUser) {
  return {
    id: u.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: u.email ?? undefined,
    phone: u.phone ?? '',
    is_anonymous: u.is_anonymous,
    user_metadata: u.user_metadata,
    app_metadata: u.app_metadata,
    identities: [],
    created_at: u.created_at,
    updated_at: u.created_at,
    email_confirmed_at: u.is_anonymous ? undefined : u.created_at,
    last_sign_in_at: new Date().toISOString(),
  };
}

export type MockAuthUser = ReturnType<typeof paraUser>;

export function paraSessao(u: MockUser) {
  const expiresIn = UMA_SEMANA;
  return {
    access_token: `mock-access-token.${u.id}`,
    refresh_token: `mock-refresh-token.${u.id}`,
    token_type: 'bearer',
    expires_in: expiresIn,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    user: paraUser(u),
  };
}

function codificar(uid: string): string {
  return Buffer.from(JSON.stringify({ uid }), 'utf8').toString('base64url');
}

function decodificar(valor: string | undefined): string | null {
  if (!valor) return null;
  try {
    const { uid } = JSON.parse(Buffer.from(valor, 'base64url').toString('utf8'));
    return typeof uid === 'string' ? uid : null;
  } catch {
    return null;
  }
}

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class MockAuthServer {
  /** undefined = ainda não leu o cookie; null = deslogado. */
  private uid: string | null | undefined;
  private listeners = new Set<(event: string, session: unknown) => void>();
  private readonly cookies: CookieAdapter | null;

  constructor(cookies: CookieAdapter | null) {
    this.cookies = cookies;
  }

  /** Id do usuário da sessão atual (valida que ainda existe no banco). */
  async uidAtual(): Promise<string | null> {
    if (this.uid === undefined) {
      const todos = this.cookies ? await this.cookies.getAll() : [];
      this.uid = decodificar(todos.find((c) => c.name === COOKIE_SESSAO)?.value);
    }
    if (this.uid && !lerEstado().auth_users.some((u) => u.id === this.uid)) {
      // usuário sumiu (mock:reset): trata como deslogado
      this.uid = null;
    }
    return this.uid;
  }

  private async gravarSessao(user: MockUser | null) {
    this.uid = user?.id ?? null;
    try {
      await this.cookies?.setAll?.([
        {
          name: COOKIE_SESSAO,
          value: user ? codificar(user.id) : '',
          options: { path: '/', sameSite: 'lax', httpOnly: false, maxAge: user ? UMA_SEMANA : 0 },
        },
      ]);
    } catch {
      // Server Component não escreve cookie — mesma tolerância das factories
    }
    const sessao = user ? paraSessao(user) : null;
    for (const l of this.listeners) l(user ? 'SIGNED_IN' : 'SIGNED_OUT', sessao);
  }

  private usuarioAtual(uid: string | null): MockUser | null {
    if (!uid) return null;
    return lerEstado().auth_users.find((u) => u.id === uid) ?? null;
  }

  async getUser() {
    const user = this.usuarioAtual(await this.uidAtual());
    if (!user) return { data: { user: null }, error: SESSAO_AUSENTE() };
    return { data: { user: paraUser(user) }, error: null };
  }

  async getSession() {
    const user = this.usuarioAtual(await this.uidAtual());
    return { data: { session: user ? paraSessao(user) : null }, error: null };
  }

  async getClaims() {
    const user = this.usuarioAtual(await this.uidAtual());
    if (!user) return { data: null, error: SESSAO_AUSENTE() };
    return {
      data: {
        claims: {
          sub: user.id,
          email: user.email,
          role: 'authenticated',
          is_anonymous: user.is_anonymous,
          aud: 'authenticated',
        },
      },
      error: null,
    };
  }

  async signInWithPassword(credenciais: { email?: string; password: string }) {
    const email = credenciais.email?.trim().toLowerCase();
    const user = lerEstado().auth_users.find(
      (u) => u.email?.toLowerCase() === email && u.password !== null && u.password === credenciais.password
    );
    if (!user) {
      return {
        data: { user: null, session: null },
        error: authError('AuthApiError', 'invalid_credentials', 'Invalid login credentials'),
      };
    }
    await this.gravarSessao(user);
    return { data: { user: paraUser(user), session: paraSessao(user) }, error: null };
  }

  async signUp(credenciais: { email?: string; password: string; options?: { data?: Record<string, unknown> } }) {
    const email = credenciais.email?.trim().toLowerCase() ?? '';
    if (!EMAIL_VALIDO.test(email)) {
      return {
        data: { user: null, session: null },
        error: authError('AuthApiError', 'email_address_invalid', `Email address "${email}" is invalid`),
      };
    }
    if (!credenciais.password || credenciais.password.length < 6) {
      return {
        data: { user: null, session: null },
        error: authError('AuthWeakPasswordError', 'weak_password', 'Password should be at least 6 characters.', 422),
      };
    }
    const resultado = transacao((state) => {
      if (state.auth_users.some((u) => u.email?.toLowerCase() === email)) {
        return { value: null, changes: [] };
      }
      const user: MockUser = {
        id: crypto.randomUUID(),
        email,
        password: credenciais.password,
        phone: null,
        is_anonymous: false,
        user_metadata: credenciais.options?.data ?? {},
        app_metadata: { provider: 'email', providers: ['email'] },
        created_at: new Date().toISOString(),
      };
      state.auth_users.push(user);
      return { value: user, changes: [], dirty: true };
    });
    if (!resultado) {
      return {
        data: { user: null, session: null },
        error: authError('AuthApiError', 'user_already_exists', 'User already registered', 422),
      };
    }
    // projeto mock = "confirmação de email desligada": já devolve sessão
    await this.gravarSessao(resultado);
    return { data: { user: paraUser(resultado), session: paraSessao(resultado) }, error: null };
  }

  async signInAnonymously(options?: { options?: { data?: Record<string, unknown> } }) {
    const user = transacao((state) => {
      const novo: MockUser = {
        id: crypto.randomUUID(),
        email: null,
        password: null,
        phone: null,
        is_anonymous: true,
        user_metadata: options?.options?.data ?? {},
        app_metadata: { provider: 'anonymous', providers: ['anonymous'] },
        created_at: new Date().toISOString(),
      };
      state.auth_users.push(novo);
      return { value: novo, changes: [], dirty: true };
    });
    await this.gravarSessao(user);
    return { data: { user: paraUser(user), session: paraSessao(user) }, error: null };
  }

  async exchangeCodeForSession(code: string) {
    const email = code === CODIGO_OAUTH_GOOGLE ? EMAIL_USUARIO_GOOGLE : code.startsWith(`${CODIGO_OAUTH_GOOGLE}:`) ? code.slice(CODIGO_OAUTH_GOOGLE.length + 1).toLowerCase() : null;
    const user = email ? lerEstado().auth_users.find((u) => u.email?.toLowerCase() === email) : undefined;
    if (!user) {
      return {
        data: { user: null, session: null },
        error: authError('AuthApiError', 'bad_code_verifier', 'invalid flow state, no valid flow state found', 404),
      };
    }
    await this.gravarSessao(user);
    return { data: { user: paraUser(user), session: paraSessao(user) }, error: null };
  }

  async signInWithOAuth(params: { provider: string; options?: { redirectTo?: string } }) {
    const destino = new URL(params.options?.redirectTo ?? '/auth/callback', 'http://localhost');
    destino.searchParams.set('code', CODIGO_OAUTH_GOOGLE);
    return { data: { provider: params.provider, url: destino.pathname + destino.search }, error: null };
  }

  async signOut() {
    await this.gravarSessao(null);
    return { error: null };
  }

  async setSession() {
    return this.getSession();
  }

  async refreshSession() {
    const { data } = await this.getSession();
    return { data: { session: data.session, user: data.session?.user ?? null }, error: null };
  }

  onAuthStateChange(callback: (event: string, session: unknown) => void) {
    this.listeners.add(callback);
    void this.getSession().then(({ data }) => callback('INITIAL_SESSION', data.session));
    return {
      data: {
        subscription: {
          id: crypto.randomUUID(),
          callback,
          unsubscribe: () => this.listeners.delete(callback),
        },
      },
    };
  }
}
