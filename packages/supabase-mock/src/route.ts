// packages/supabase-mock/src/route.ts
//
// Handler de /api/mock-supabase/[[...path]] (cada app reexporta GET/POST):
//   POST /api/mock-supabase                  query | rpc | auth vindos do client de browser
//   GET  /api/mock-supabase/changes?since=N  "realtime" por polling (só o que o RLS deixa ver)
//   GET  /api/mock-supabase/storage/<bucket>/<arquivo>  arquivos do bucket público
// Com a flag desligada responde 404 — a rota existe mas não faz nada.

import { isSupabaseMock } from './flag';
import type { CookieAdapter } from './auth';
import { podeLer } from './policies';
import type { QuerySpec } from './query-builder';
import {
  MockSupabaseServerClient,
  STORAGE_PUBLIC_PREFIX,
  executarConsulta,
  lerArquivoStorage,
} from './server';
import { lerEstado } from './store';

const METODOS_AUTH = new Set([
  'getUser',
  'getSession',
  'getClaims',
  'signInAnonymously',
  'signInWithPassword',
  'signUp',
  'signOut',
  'exchangeCodeForSession',
  'signInWithOAuth',
]);

export type MockRequestBody =
  | { kind: 'query'; spec: QuerySpec }
  | { kind: 'rpc'; name: string; args: Record<string, unknown> }
  | { kind: 'auth'; method: string; args: unknown[] };

function lerCookies(request: Request): { name: string; value: string }[] {
  const header = request.headers.get('cookie') ?? '';
  return header
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const i = p.indexOf('=');
      return i === -1
        ? { name: p, value: '' }
        : { name: p.slice(0, i), value: decodeURIComponent(p.slice(i + 1)) };
    });
}

function serializarCookie(name: string, value: string, options: Record<string, unknown>): string {
  const partes = [`${name}=${encodeURIComponent(value)}`];
  partes.push(`Path=${options.path ?? '/'}`);
  if (typeof options.maxAge === 'number') partes.push(`Max-Age=${options.maxAge}`);
  if (options.sameSite) partes.push(`SameSite=${String(options.sameSite).replace(/^./, (c) => c.toUpperCase())}`);
  if (options.httpOnly) partes.push('HttpOnly');
  if (options.secure) partes.push('Secure');
  return partes.join('; ');
}

function clientDaRequest(request: Request) {
  const setCookies: string[] = [];
  const cookies: CookieAdapter = {
    getAll: () => lerCookies(request),
    setAll: (lista) => {
      for (const c of lista) setCookies.push(serializarCookie(c.name, c.value, c.options));
    },
  };
  return { client: new MockSupabaseServerClient('server', cookies), setCookies };
}

function json(body: unknown, status = 200, setCookies: string[] = []) {
  const headers = new Headers({ 'content-type': 'application/json', 'cache-control': 'no-store' });
  for (const c of setCookies) headers.append('set-cookie', c);
  return new Response(JSON.stringify(body), { status, headers });
}

const naoEncontrado = () => new Response('Not found', { status: 404 });

function subcaminho(request: Request): string[] {
  const { pathname } = new URL(request.url);
  const resto = pathname.replace(/^.*?\/api\/mock-supabase\/?/, '');
  return resto.split('/').filter(Boolean).map(decodeURIComponent);
}

export async function GET(request: Request): Promise<Response> {
  if (!isSupabaseMock()) return naoEncontrado();
  const partes = subcaminho(request);

  if (partes[0] === 'storage' && partes.length >= 3) {
    const [, bucket, ...arquivo] = partes;
    const lido = lerArquivoStorage(bucket, arquivo.join('/'));
    if (!lido) return naoEncontrado();
    return new Response(new Uint8Array(lido.bytes), {
      headers: { 'content-type': lido.contentType, 'cache-control': 'public, max-age=31536000, immutable' },
    });
  }

  if (partes[0] === 'changes') {
    const param = new URL(request.url).searchParams.get('since') ?? '0';
    const state = lerEstado();
    if (param === 'latest') return json({ seq: state.seq, changes: [] });
    const since = Number(param) || 0;
    const { client } = clientDaRequest(request);
    const ctx = await client.contexto();
    // eventos passam pelo RLS como no Realtime de verdade (postgres_changes)
    const changes = state.changes
      .filter((c) => c.seq > since)
      .filter((c) => c.type === 'DELETE' || podeLer(c.table, c.record, ctx, state.tables))
      .map(({ seq, table, type, record }) => ({ seq, table, type, record }));
    return json({ seq: state.seq, changes });
  }

  return naoEncontrado();
}

export async function POST(request: Request): Promise<Response> {
  if (!isSupabaseMock()) return naoEncontrado();

  let body: MockRequestBody;
  try {
    body = (await request.json()) as MockRequestBody;
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }

  const { client, setCookies } = clientDaRequest(request);

  if (body.kind === 'query') {
    const result = executarConsulta(body.spec, await client.contexto());
    return json(result, 200, setCookies);
  }

  if (body.kind === 'rpc') {
    const result = await client.rpc(body.name, body.args ?? {});
    return json(result, 200, setCookies);
  }

  if (body.kind === 'auth') {
    if (!METODOS_AUTH.has(body.method)) return json({ error: `auth.${body.method} não suportado` }, 400);
    const metodo = (client.auth as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)[body.method];
    const result = await metodo.apply(client.auth, body.args ?? []);
    return json(result, 200, setCookies);
  }

  return json({ error: 'kind desconhecido' }, 400);
}

export { STORAGE_PUBLIC_PREFIX };
