// packages/supabase-mock/src/server.ts
//
// Clients mock para o servidor, um para cada factory dos apps:
//   createMockServerClient  ~ createServerClient (@supabase/ssr), sessão via cookies
//   createMockAdminClient   ~ createClient(url, SERVICE_ROLE_KEY), bypassa RLS
//   createMockAnonClient    ~ createClient(url, ANON_KEY), sem sessão
// Todos executam direto no engine contra o store em disco.

import fs from 'node:fs';
import path from 'node:path';
import { MockAuthServer, type CookieAdapter } from './auth';
import { executar, executarRpc } from './engine';
import { SERVICE_ROLE, type AuthContext } from './policies';
import { MockQueryBuilder, type QueryResult, type QuerySpec } from './query-builder';
import { lerEstado, storageDir, transacao } from './store';

export { isSupabaseMock } from './flag';
export { resetar as resetarMockDb } from './store';

type Papel = 'server' | 'admin' | 'anon';

/** Executa uma consulta com o contexto de auth dado (leitura sem lock). */
export function executarConsulta(spec: QuerySpec, ctx: AuthContext): QueryResult {
  if (spec.action === 'select') {
    // executar não muta em select: pode usar o estado em cache direto
    return executar(spec, lerEstado().tables, ctx).result;
  }
  return transacao((state) => {
    const { result, changes } = executar(spec, state.tables, ctx);
    return { value: result, changes };
  });
}

export function executarRpcComo(nome: string, args: Record<string, unknown>, ctx: AuthContext): QueryResult {
  return transacao((state) => {
    const { result, changes } = executarRpc(nome, args, state.tables, ctx);
    return { value: result, changes };
  });
}

// ---------------------------------------------------------------------------
// Storage (bucket em disco: .mock-db/storage/<bucket>/<path>)
// ---------------------------------------------------------------------------

export const STORAGE_PUBLIC_PREFIX = '/api/mock-supabase/storage';

function caminhoSeguro(bucket: string, arquivo: string): string {
  const base = path.resolve(storageDir(), bucket);
  const destino = path.resolve(base, arquivo);
  if (!destino.startsWith(base + path.sep)) throw new Error('caminho de storage inválido');
  return destino;
}

export function lerArquivoStorage(bucket: string, arquivo: string): { bytes: Buffer; contentType: string } | null {
  try {
    const destino = caminhoSeguro(bucket, arquivo);
    const bytes = fs.readFileSync(destino);
    let contentType = 'application/octet-stream';
    try {
      contentType = fs.readFileSync(`${destino}.content-type`, 'utf8');
    } catch {
      // sem metadado: octet-stream
    }
    return { bytes, contentType };
  } catch {
    return null;
  }
}

class MockBucket {
  private readonly bucket: string;
  private readonly podeEscrever: boolean;

  constructor(bucket: string, podeEscrever: boolean) {
    this.bucket = bucket;
    this.podeEscrever = podeEscrever;
  }

  async upload(
    arquivo: string,
    corpo: Blob | ArrayBuffer | ArrayBufferView | string,
    options?: { contentType?: string; upsert?: boolean }
  ) {
    if (!this.podeEscrever) {
      return { data: null, error: { name: 'StorageApiError', message: 'new row violates row-level security policy', statusCode: '403' } };
    }
    try {
      const destino = caminhoSeguro(this.bucket, arquivo);
      if (!options?.upsert && fs.existsSync(destino)) {
        return { data: null, error: { name: 'StorageApiError', message: 'The resource already exists', statusCode: '409' } };
      }
      let bytes: Buffer;
      if (typeof corpo === 'string') bytes = Buffer.from(corpo);
      else if (corpo instanceof ArrayBuffer) bytes = Buffer.from(corpo);
      else if (ArrayBuffer.isView(corpo)) bytes = Buffer.from(corpo.buffer, corpo.byteOffset, corpo.byteLength);
      else bytes = Buffer.from(await corpo.arrayBuffer());
      const contentType =
        options?.contentType ?? (typeof Blob !== 'undefined' && corpo instanceof Blob ? corpo.type : '') ?? '';
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.writeFileSync(destino, bytes);
      fs.writeFileSync(`${destino}.content-type`, contentType || 'application/octet-stream');
      return { data: { id: crypto.randomUUID(), path: arquivo, fullPath: `${this.bucket}/${arquivo}` }, error: null };
    } catch (e) {
      return { data: null, error: { name: 'StorageError', message: (e as Error).message, statusCode: '500' } };
    }
  }

  getPublicUrl(arquivo: string) {
    return { data: { publicUrl: `${STORAGE_PUBLIC_PREFIX}/${this.bucket}/${arquivo}` } };
  }

  async remove(arquivos: string[]) {
    if (!this.podeEscrever) return { data: null, error: { name: 'StorageApiError', message: 'forbidden', statusCode: '403' } };
    for (const a of arquivos) {
      const destino = caminhoSeguro(this.bucket, a);
      fs.rmSync(destino, { force: true });
      fs.rmSync(`${destino}.content-type`, { force: true });
    }
    return { data: arquivos.map((name) => ({ name })), error: null };
  }
}

// ---------------------------------------------------------------------------
// Realtime no servidor: inerte (os apps só assinam no browser)
// ---------------------------------------------------------------------------

function canalInerte(topic: string) {
  const canal = {
    topic,
    on: () => canal,
    subscribe: (cb?: (status: string) => void) => {
      cb?.('CLOSED');
      return canal;
    },
    unsubscribe: async () => 'ok' as const,
  };
  return canal;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class MockSupabaseServerClient {
  readonly auth: MockAuthServer;
  readonly storage: { from: (bucket: string) => MockBucket };
  readonly realtime = { setAuth: (_token?: string | null) => undefined };
  private readonly papel: Papel;

  constructor(papel: Papel, cookies: CookieAdapter | null) {
    this.papel = papel;
    this.auth = new MockAuthServer(papel === 'server' ? cookies : null);
    this.storage = { from: (bucket: string) => new MockBucket(bucket, papel === 'admin') };
  }

  /** Contexto RLS da próxima consulta (a sessão pode mudar no meio do request). */
  async contexto(): Promise<AuthContext> {
    if (this.papel === 'admin') return SERVICE_ROLE;
    if (this.papel === 'anon') return { role: 'anon', uid: null };
    const uid = await this.auth.uidAtual();
    return uid ? { role: 'authenticated', uid } : { role: 'anon', uid: null };
  }

  from(table: string) {
    return new MockQueryBuilder(table, async (spec) => executarConsulta(spec, await this.contexto()));
  }

  /** postgrest-js: `rpc()` também é thenable e aceita .single() etc. — aqui só o await direto. */
  async rpc(nome: string, args: Record<string, unknown> = {}) {
    return executarRpcComo(nome, args, await this.contexto());
  }

  channel(topic: string) {
    return canalInerte(topic);
  }

  async removeChannel() {
    return 'ok' as const;
  }

  async removeAllChannels() {
    return [];
  }
}

interface ServerClientOptions {
  cookies: CookieAdapter;
}

/** Mesma assinatura do createServerClient do @supabase/ssr. */
export function createMockServerClient(_url: string | undefined, _key: string | undefined, options: ServerClientOptions) {
  return new MockSupabaseServerClient('server', options.cookies);
}

export function createMockAdminClient() {
  return new MockSupabaseServerClient('admin', null);
}

export function createMockAnonClient() {
  return new MockSupabaseServerClient('anon', null);
}
