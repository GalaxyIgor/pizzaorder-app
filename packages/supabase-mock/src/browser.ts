// packages/supabase-mock/src/browser.ts
//
// Client mock para o browser (~ createBrowserClient do @supabase/ssr). Não
// tem acesso ao store: queries, rpc e auth vão por POST /api/mock-supabase
// (same-origin, liberado pelo CSP), que executa com o cookie da sessão.
// Realtime = polling de /api/mock-supabase/changes, entregando payloads no
// formato de postgres_changes. Sem imports de Node.

import { MockQueryBuilder, type QueryResult, type QuerySpec } from './query-builder';

const BASE = '/api/mock-supabase';
const INTERVALO_POLLING_MS = 1500;

async function post<T>(body: unknown): Promise<T> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`mock-supabase: HTTP ${res.status}`);
  return (await res.json()) as T;
}

function erroDeRede(e: unknown): QueryResult {
  return {
    data: null,
    error: { code: 'FETCH_ERROR', message: (e as Error).message, details: null, hint: null },
    count: null,
    status: 0,
    statusText: 'Network error',
  };
}

// ---------------------------------------------------------------------------
// Auth (eventos compartilhados entre instâncias: os apps chamam createClient()
// em vários componentes, e um signIn num deve avisar o useAuth de outro)
// ---------------------------------------------------------------------------

type AuthListener = (event: string, session: unknown) => void;
const listeners = new Set<AuthListener>();

function emitir(event: string, session: unknown) {
  for (const l of listeners) {
    try {
      l(event, session);
    } catch (e) {
      console.error('[mock-supabase] onAuthStateChange listener', e);
    }
  }
}

interface AuthResposta {
  data: { session?: unknown; user?: unknown; url?: string } | null;
  error: unknown;
}

class MockAuthBrowser {
  private chamar(method: string, ...args: unknown[]) {
    return post<AuthResposta>({ kind: 'auth', method, args });
  }

  getUser() {
    return this.chamar('getUser');
  }

  getSession() {
    return this.chamar('getSession');
  }

  getClaims() {
    return this.chamar('getClaims');
  }

  private async comEvento(method: string, ...args: unknown[]) {
    const r = await this.chamar(method, ...args);
    if (!r.error) emitir('SIGNED_IN', r.data?.session ?? null);
    return r;
  }

  signInAnonymously(...args: unknown[]) {
    return this.comEvento('signInAnonymously', ...args);
  }

  signInWithPassword(...args: unknown[]) {
    return this.comEvento('signInWithPassword', ...args);
  }

  signUp(...args: unknown[]) {
    return this.comEvento('signUp', ...args);
  }

  async signInWithOAuth(params: { provider: string; options?: { redirectTo?: string; skipBrowserRedirect?: boolean } }) {
    // Sem Google de verdade: vai direto ao callback com um código que o mock aceita
    const r = await this.chamar('signInWithOAuth', params);
    if (!r.error && r.data?.url && !params.options?.skipBrowserRedirect) {
      window.location.assign(r.data.url);
    }
    return r;
  }

  async signOut() {
    const r = await this.chamar('signOut');
    emitir('SIGNED_OUT', null);
    return r;
  }

  onAuthStateChange(callback: AuthListener) {
    listeners.add(callback);
    void this.getSession()
      .then((r) => callback('INITIAL_SESSION', r.data?.session ?? null))
      .catch(() => callback('INITIAL_SESSION', null));
    return {
      data: {
        subscription: {
          id: Math.random().toString(36).slice(2),
          callback,
          unsubscribe: () => listeners.delete(callback),
        },
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Realtime por polling
// ---------------------------------------------------------------------------

interface ChangeEvent {
  seq: number;
  table: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  record: Record<string, unknown>;
}

interface Binding {
  event: string;
  table: string;
  filter?: string;
  callback: (payload: unknown) => void;
}

/** filter do Realtime: "coluna=eq.valor" ou "coluna=in.(a,b)". */
function casaFiltro(filter: string | undefined, record: Record<string, unknown>): boolean {
  if (!filter) return true;
  const m = /^([^=]+)=(eq|neq|in)\.(.*)$/.exec(filter);
  if (!m) return true;
  const [, coluna, op, valor] = m;
  const atual = record[coluna] == null ? null : String(record[coluna]);
  if (op === 'eq') return atual === valor;
  if (op === 'neq') return atual !== valor;
  const lista = valor.replace(/^\(|\)$/g, '').split(',').map((s) => s.trim());
  return atual !== null && lista.includes(atual);
}

class MockChannel {
  private bindings: Binding[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private cursor: number | null = null;
  private parado = false;
  readonly topic: string;

  constructor(topic: string) {
    this.topic = topic;
  }

  on(
    type: string,
    config: { event?: string; schema?: string; table?: string; filter?: string },
    callback: (payload: unknown) => void
  ) {
    if (type === 'postgres_changes' && config.table) {
      this.bindings.push({ event: config.event ?? '*', table: config.table, filter: config.filter, callback });
    }
    return this;
  }

  subscribe(callback?: (status: string, err?: Error) => void) {
    void this.poll()
      .then(() => {
        if (this.parado) return;
        callback?.('SUBSCRIBED');
        this.timer = setInterval(() => void this.poll().catch(() => undefined), INTERVALO_POLLING_MS);
      })
      .catch((e: Error) => callback?.('CHANNEL_ERROR', e));
    return this;
  }

  private async poll() {
    if (this.parado) return;
    // 1ª chamada só pega o cursor atual ("latest"); depois, só o que veio depois dele
    const res = await fetch(`${BASE}/changes?since=${this.cursor ?? 'latest'}`, {
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`mock realtime: HTTP ${res.status}`);
    const { seq, changes } = (await res.json()) as { seq: number; changes: ChangeEvent[] };
    const primeiraVez = this.cursor === null;
    this.cursor = seq;
    if (primeiraVez || this.parado) return; // só eventos depois da assinatura

    for (const c of changes) {
      for (const b of this.bindings) {
        if (b.table !== c.table) continue;
        if (b.event !== '*' && b.event !== c.type) continue;
        if (!casaFiltro(b.filter, c.record)) continue;
        b.callback({
          schema: 'public',
          table: c.table,
          commit_timestamp: new Date().toISOString(),
          eventType: c.type,
          new: c.type === 'DELETE' ? {} : c.record,
          old: c.type === 'DELETE' ? c.record : {},
          errors: null,
        });
      }
    }
  }

  async unsubscribe() {
    this.parado = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    return 'ok' as const;
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class MockSupabaseBrowserClient {
  readonly auth = new MockAuthBrowser();
  readonly realtime = { setAuth: (_token?: string | null) => undefined };
  readonly storage = {
    from: (bucket: string) => ({
      getPublicUrl: (arquivo: string) => ({ data: { publicUrl: `${BASE}/storage/${bucket}/${arquivo}` } }),
    }),
  };
  private canais = new Set<MockChannel>();

  from(table: string) {
    return new MockQueryBuilder(table, (spec: QuerySpec) =>
      post<QueryResult>({ kind: 'query', spec }).catch(erroDeRede)
    );
  }

  rpc(name: string, args: Record<string, unknown> = {}) {
    return post<QueryResult>({ kind: 'rpc', name, args }).catch(erroDeRede);
  }

  channel(topic: string) {
    const canal = new MockChannel(topic);
    this.canais.add(canal);
    return canal;
  }

  async removeChannel(canal: MockChannel) {
    this.canais.delete(canal);
    return canal.unsubscribe();
  }

  async removeAllChannels() {
    const todos = [...this.canais];
    this.canais.clear();
    return Promise.all(todos.map((c) => c.unsubscribe()));
  }
}

/** Mesma assinatura do createBrowserClient (url/key ignorados). */
export function createMockBrowserClient(_url?: string, _key?: string) {
  return new MockSupabaseBrowserClient();
}
