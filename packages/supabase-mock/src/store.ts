// packages/supabase-mock/src/store.ts
//
// Estado do mock num JSON em disco, compartilhado pelos 3 apps (são processos
// separados: um pedido feito no cardápio precisa aparecer na cozinha).
// Leitura: cache em memória, recarregado quando db.json.versao muda.
// Escrita: lock por arquivo (O_EXCL) + reload + mutação + rename atômico.
// Só roda no servidor (Node).

import fs from 'node:fs';
import path from 'node:path';
import type { Change } from './engine';
import type { Tables } from './schema';
import { gerarSeed } from './seed';

export interface MockUser {
  id: string;
  email: string | null;
  /** Só para o mock em dev — nunca use senha real aqui. */
  password: string | null;
  phone: string | null;
  is_anonymous: boolean;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
  created_at: string;
}

export interface ChangeLogEntry extends Change {
  seq: number;
  at: string;
}

export interface MockState {
  /** Muda a cada gravação (também no reset) — invalida o cache dos outros processos. */
  versao?: string;
  /** Incrementa a cada escrita — base do "realtime" por polling. */
  seq: number;
  tables: Tables;
  auth_users: MockUser[];
  /** Últimas mudanças, para o realtime filtrar por tabela/coluna. */
  changes: ChangeLogEntry[];
}

const MAX_CHANGES = 500;

if (typeof window !== 'undefined') {
  throw new Error('@pizzaorder/supabase-mock/store só pode ser importado no servidor.');
}

/** Raiz do monorepo: primeiro package.json com "workspaces" subindo do cwd. */
function raizDoRepo(): string {
  let dir = process.cwd();
  for (;;) {
    const pkg = path.join(dir, 'package.json');
    if (fs.existsSync(pkg)) {
      try {
        if (JSON.parse(fs.readFileSync(pkg, 'utf8')).workspaces) return dir;
      } catch {
        // package.json ilegível: segue subindo
      }
    }
    const pai = path.dirname(dir);
    if (pai === dir) return process.cwd();
    dir = pai;
  }
}

export function mockDir(): string {
  return process.env.MOCK_DB_PATH
    ? path.dirname(path.resolve(process.env.MOCK_DB_PATH))
    : path.join(raizDoRepo(), '.mock-db');
}

export function dbPath(): string {
  return process.env.MOCK_DB_PATH
    ? path.resolve(process.env.MOCK_DB_PATH)
    : path.join(mockDir(), 'db.json');
}

export function storageDir(): string {
  return path.join(mockDir(), 'storage');
}

// Cache por versão, não por mtime: no Windows o mtime tem resolução de ~1-15ms
// e escritas seguidas (rpc + insert do criarPedido) caíam no mesmo valor,
// deixando outro processo/instância do módulo com estado velho.
let cache: MockState | null = null;

const versaoPath = () => `${dbPath()}.versao`;

function lerVersao(): string | null {
  try {
    return fs.readFileSync(versaoPath(), 'utf8');
  } catch {
    return null;
  }
}

function gravar(state: MockState) {
  const destino = dbPath();
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  state.versao = crypto.randomUUID();
  const tmp = `${destino}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state));
  // Windows: rename falha (EPERM/EBUSY) se outro processo estiver lendo — tenta de novo
  for (let tentativa = 0; ; tentativa++) {
    try {
      fs.renameSync(tmp, destino);
      break;
    } catch (e) {
      if (tentativa >= 20) {
        fs.rmSync(tmp, { force: true });
        throw e;
      }
      esperar(25);
    }
  }
  // a versão vai DEPOIS do db: quem a lê já encontra o db.json novo
  fs.writeFileSync(versaoPath(), state.versao);
  cache = state;
}

function esperar(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** Cria o db.json com o seed se ainda não existir. */
export function garantirDb(): void {
  if (fs.existsSync(dbPath())) return;
  comLock(() => {
    if (!fs.existsSync(dbPath())) gravar(gerarSeed());
  });
}

/** Estado atual (somente leitura — não mute o retorno). */
export function lerEstado(): MockState {
  garantirDb();
  const destino = dbPath();
  for (let tentativa = 0; ; tentativa++) {
    try {
      const versao = lerVersao();
      if (cache && versao !== null && cache.versao === versao) return cache;
      const state = JSON.parse(fs.readFileSync(destino, 'utf8')) as MockState;
      cache = state;
      return state;
    } catch (e) {
      // leitura no meio de um rename de outro processo: tenta de novo
      if (tentativa >= 20) throw e;
      esperar(25);
    }
  }
}

function comLock<T>(fn: () => T): T {
  const lock = `${dbPath()}.lock`;
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  const inicio = Date.now();
  let fd: number | null = null;
  while (fd === null) {
    try {
      fd = fs.openSync(lock, 'wx');
    } catch {
      // lock velho (processo morreu no meio): descarta depois de 5s
      try {
        if (Date.now() - fs.statSync(lock).mtimeMs > 5000) fs.rmSync(lock, { force: true });
      } catch {
        // sumiu entre o open e o stat: tenta de novo
      }
      if (Date.now() - inicio > 10_000) throw new Error('mock-db: timeout esperando o lock');
      esperar(10);
    }
  }
  try {
    return fn();
  } finally {
    fs.closeSync(fd);
    fs.rmSync(lock, { force: true });
  }
}

/**
 * Executa `fn` com o estado mais recente do disco, em exclusão mútua entre
 * processos. Se `fn` devolver mudanças, grava e registra no changelog.
 */
export function transacao<T>(fn: (state: MockState) => { value: T; changes: Change[]; dirty?: boolean }): T {
  garantirDb();
  return comLock(() => {
    cache = null; // força reload: outro processo pode ter escrito
    const state = structuredClone(lerEstado());
    const { value, changes, dirty } = fn(state);
    if (changes.length > 0 || dirty) {
      const at = new Date().toISOString();
      for (const c of changes) {
        state.seq += 1;
        state.changes.push({ ...c, seq: state.seq, at });
      }
      if (changes.length === 0) state.seq += 1;
      state.changes = state.changes.slice(-MAX_CHANGES);
      gravar(state);
    }
    return value;
  });
}

/** Apaga o banco (e uploads) e recria a partir do seed. */
export function resetar(): void {
  comLock(() => {
    fs.rmSync(storageDir(), { recursive: true, force: true });
    gravar(gerarSeed());
  });
}
