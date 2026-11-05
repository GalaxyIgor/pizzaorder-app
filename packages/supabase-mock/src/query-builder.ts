// packages/supabase-mock/src/query-builder.ts
//
// Builder "thenable" com a mesma superfície do postgrest-js usada nos apps.
// Só acumula a consulta num QuerySpec serializável; quem executa é o
// `executor` (engine direto no servidor, ou fetch para a rota no browser).

export type FilterOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'is' | 'like' | 'ilike';

export interface Filter {
  column: string;
  op: FilterOp;
  value: unknown;
}

export interface Order {
  column: string;
  ascending: boolean;
  nullsFirst?: boolean;
  referencedTable?: string;
}

export interface QuerySpec {
  table: string;
  action: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
  /** select da consulta, ou o `.select()` encadeado depois de uma escrita. */
  columns: string | null;
  count: 'exact' | null;
  head: boolean;
  filters: Filter[];
  orders: Order[];
  limit: number | null;
  range: [number, number] | null;
  single: 'one' | 'maybe' | null;
  values: unknown;
  onConflict: string | null;
  ignoreDuplicates: boolean;
}

export interface PostgrestError {
  message: string;
  details: string | null;
  hint: string | null;
  code: string;
}

export interface QueryResult {
  data: unknown;
  error: PostgrestError | null;
  count: number | null;
  status: number;
  statusText: string;
}

export type Executor = (spec: QuerySpec) => Promise<QueryResult>;

export class MockQueryBuilder implements PromiseLike<QueryResult> {
  private spec: QuerySpec;
  private readonly executor: Executor;

  constructor(table: string, executor: Executor) {
    this.executor = executor;
    this.spec = {
      table,
      action: 'select',
      columns: null,
      count: null,
      head: false,
      filters: [],
      orders: [],
      limit: null,
      range: null,
      single: null,
      values: null,
      onConflict: null,
      ignoreDuplicates: false,
    };
  }

  select(columns = '*', options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
    this.spec.columns = columns;
    if (options?.count) this.spec.count = 'exact';
    if (options?.head) this.spec.head = true;
    return this;
  }

  insert(values: unknown, _options?: unknown) {
    this.spec.action = 'insert';
    this.spec.values = values;
    return this;
  }

  upsert(values: unknown, options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.spec.action = 'upsert';
    this.spec.values = values;
    this.spec.onConflict = options?.onConflict ?? null;
    this.spec.ignoreDuplicates = options?.ignoreDuplicates ?? false;
    return this;
  }

  update(values: unknown) {
    this.spec.action = 'update';
    this.spec.values = values;
    return this;
  }

  delete() {
    this.spec.action = 'delete';
    return this;
  }

  private filtro(column: string, op: FilterOp, value: unknown) {
    this.spec.filters.push({ column, op, value });
    return this;
  }

  eq(column: string, value: unknown) {
    return this.filtro(column, 'eq', value);
  }
  neq(column: string, value: unknown) {
    return this.filtro(column, 'neq', value);
  }
  gt(column: string, value: unknown) {
    return this.filtro(column, 'gt', value);
  }
  gte(column: string, value: unknown) {
    return this.filtro(column, 'gte', value);
  }
  lt(column: string, value: unknown) {
    return this.filtro(column, 'lt', value);
  }
  lte(column: string, value: unknown) {
    return this.filtro(column, 'lte', value);
  }
  in(column: string, values: readonly unknown[]) {
    return this.filtro(column, 'in', [...values]);
  }
  is(column: string, value: unknown) {
    return this.filtro(column, 'is', value);
  }
  like(column: string, pattern: string) {
    return this.filtro(column, 'like', pattern);
  }
  ilike(column: string, pattern: string) {
    return this.filtro(column, 'ilike', pattern);
  }
  /** `.match({a: 1, b: 2})` = vários eq. */
  match(query: Record<string, unknown>) {
    for (const [k, v] of Object.entries(query)) this.eq(k, v);
    return this;
  }

  order(
    column: string,
    options?: { ascending?: boolean; nullsFirst?: boolean; referencedTable?: string; foreignTable?: string }
  ) {
    this.spec.orders.push({
      column,
      ascending: options?.ascending ?? true,
      nullsFirst: options?.nullsFirst,
      referencedTable: options?.referencedTable ?? options?.foreignTable,
    });
    return this;
  }

  limit(count: number) {
    this.spec.limit = count;
    return this;
  }

  range(from: number, to: number) {
    this.spec.range = [from, to];
    return this;
  }

  single() {
    this.spec.single = 'one';
    return this;
  }

  maybeSingle() {
    this.spec.single = 'maybe';
    return this;
  }

  /** postgrest-js: `.returns<T>()` só muda o tipo. */
  returns() {
    return this;
  }

  abortSignal(_signal: AbortSignal) {
    return this;
  }

  then<R1 = QueryResult, R2 = never>(
    onfulfilled?: ((value: QueryResult) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null
  ): PromiseLike<R1 | R2> {
    return this.executor(structuredClone(this.spec)).then(onfulfilled, onrejected);
  }
}
