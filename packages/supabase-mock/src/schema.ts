// packages/supabase-mock/src/schema.ts
//
// Espelho mínimo do schema de supabase/*.sql: tabelas, defaults, FKs (para os
// embeds do select e os cascades), constraints que o código dos apps trata.

export type Row = Record<string, unknown>;

export interface Tables {
  [table: string]: Row[];
}

/** FK `from.column -> to.id` (ou `to.toColumn`). */
export interface ForeignKey {
  from: string;
  column: string;
  to: string;
  toColumn?: string;
  onDelete: 'cascade' | 'set null' | 'restrict';
}

export const TABLES = [
  'pizzarias',
  'categorias',
  'produtos',
  'variacoes_produto',
  'destaques',
  'combos_meia_meia',
  'combos_produtos',
  'grupos_adicionais',
  'opcoes_adicionais',
  'precos_opcao_por_tamanho',
  'perfis',
  'enderecos_cliente',
  'pedidos',
  'itens_pedido',
  'contadores_pedido',
  'staff_pizzaria',
] as const;

export type TableName = (typeof TABLES)[number];

export const FOREIGN_KEYS: ForeignKey[] = [
  { from: 'categorias', column: 'pizzaria_id', to: 'pizzarias', onDelete: 'cascade' },
  { from: 'produtos', column: 'pizzaria_id', to: 'pizzarias', onDelete: 'cascade' },
  { from: 'produtos', column: 'categoria_id', to: 'categorias', onDelete: 'cascade' },
  { from: 'variacoes_produto', column: 'produto_id', to: 'produtos', onDelete: 'cascade' },
  { from: 'destaques', column: 'pizzaria_id', to: 'pizzarias', onDelete: 'cascade' },
  { from: 'destaques', column: 'produto_id', to: 'produtos', onDelete: 'cascade' },
  { from: 'combos_meia_meia', column: 'pizzaria_id', to: 'pizzarias', onDelete: 'cascade' },
  { from: 'combos_meia_meia', column: 'produto1_id', to: 'produtos', onDelete: 'cascade' },
  { from: 'combos_meia_meia', column: 'produto2_id', to: 'produtos', onDelete: 'cascade' },
  { from: 'combos_produtos', column: 'pizzaria_id', to: 'pizzarias', onDelete: 'cascade' },
  { from: 'combos_produtos', column: 'produto1_id', to: 'produtos', onDelete: 'cascade' },
  { from: 'combos_produtos', column: 'produto2_id', to: 'produtos', onDelete: 'cascade' },
  { from: 'grupos_adicionais', column: 'pizzaria_id', to: 'pizzarias', onDelete: 'cascade' },
  { from: 'grupos_adicionais', column: 'categoria_id', to: 'categorias', onDelete: 'cascade' },
  { from: 'opcoes_adicionais', column: 'grupo_id', to: 'grupos_adicionais', onDelete: 'cascade' },
  { from: 'precos_opcao_por_tamanho', column: 'opcao_id', to: 'opcoes_adicionais', onDelete: 'cascade' },
  { from: 'pedidos', column: 'pizzaria_id', to: 'pizzarias', onDelete: 'restrict' },
  { from: 'itens_pedido', column: 'pedido_id', to: 'pedidos', onDelete: 'cascade' },
  { from: 'itens_pedido', column: 'produto_id', to: 'produtos', onDelete: 'set null' },
  { from: 'itens_pedido', column: 'variacao_id', to: 'variacoes_produto', onDelete: 'set null' },
  { from: 'contadores_pedido', column: 'pizzaria_id', to: 'pizzarias', toColumn: 'id', onDelete: 'cascade' },
  { from: 'staff_pizzaria', column: 'pizzaria_id', to: 'pizzarias', onDelete: 'cascade' },
];

/** Chave primária (para upsert sem onConflict e unicidade). */
export const PRIMARY_KEYS: Record<string, string[]> = {
  contadores_pedido: ['pizzaria_id'],
  staff_pizzaria: ['user_id', 'pizzaria_id'],
};

export function primaryKey(table: string): string[] {
  return PRIMARY_KEYS[table] ?? ['id'];
}

interface UniqueConstraint {
  name: string;
  /** Valor normalizado da chave; null = não participa (ex.: telefone null). */
  key: (row: Row) => string | null;
}

const digitos = (v: unknown) => (typeof v === 'string' ? v.replace(/\D/g, '') : '');

export const UNIQUE_CONSTRAINTS: Record<string, UniqueConstraint[]> = {
  pizzarias: [{ name: 'pizzarias_slug_key', key: (r) => String(r.slug) }],
  pedidos: [
    { name: 'pedidos_pizzaria_id_numero_key', key: (r) => `${r.pizzaria_id}:${r.numero}` },
  ],
  // google_auth.sql: unique index sobre os dígitos do telefone
  perfis: [
    {
      name: 'uq_perfis_telefone',
      key: (r) => (r.telefone == null || digitos(r.telefone) === '' ? null : digitos(r.telefone)),
    },
  ],
};

export const CHECK_CONSTRAINTS: Record<string, Record<string, readonly unknown[]>> = {
  pedidos: {
    status: ['pendente', 'aceito', 'em_preparo', 'pronto', 'saiu_para_entrega', 'concluido', 'cancelado'],
    modalidade: ['entrega', 'retirada', 'local'],
    forma_pagamento: ['online', 'na_entrega'],
    metodo_pagamento_local: ['dinheiro', 'cartao', 'pix', null],
    status_pagamento: ['pendente', 'pago', 'falhou', 'estornado'],
  },
  itens_pedido: { tipo: ['produto', 'meia-meia'] },
  categorias: { tipo: ['pizza', 'bebida', 'meia_meia', 'sobremesa', 'outro'] },
  grupos_adicionais: { tipo: ['unica', 'multipla'] },
  staff_pizzaria: { papel: ['cozinha', 'gerente'] },
};

const agora = () => new Date().toISOString();

/** Defaults de coluna aplicados no INSERT (só para chaves ausentes). */
export const DEFAULTS: Record<string, Record<string, () => unknown>> = {
  pizzarias: {
    id: () => crypto.randomUUID(),
    cor_primaria: () => '#e63946',
    logo_url: () => null,
    whatsapp: () => null,
    endereco: () => null,
    descricao: () => null,
    aviso: () => null,
    aviso_ativo: () => false,
    instagram: () => null,
    metodos_pagamento: () => ['dinheiro', 'cartao', 'pix'],
    config_meia_meia: () => ({ estrategia: 'maior' }),
    config_frete: () => ({ tipo: 'gratis' }),
    config_taxa_servico: () => null,
    pedido_minimo: () => null,
    aceita_retirada: () => true,
    aceita_entrega: () => true,
    aceita_local: () => true,
    pedidos_pausados: () => false,
    horario_funcionamento: () => null,
    ativo: () => true,
    criado_em: agora,
  },
  categorias: { id: () => crypto.randomUUID(), ordem: () => 0, ativo: () => true, criado_em: agora },
  produtos: {
    id: () => crypto.randomUUID(),
    descricao: () => null,
    imagem_url: () => null,
    ordem: () => 0,
    disponivel: () => true,
    criado_em: agora,
  },
  variacoes_produto: { id: () => crypto.randomUUID(), disponivel: () => true },
  destaques: { id: () => crypto.randomUUID(), ordem: () => 0, ativo: () => true },
  combos_meia_meia: {
    id: () => crypto.randomUUID(),
    descricao: () => null,
    imagem_url: () => null,
    ordem: () => 0,
    ativo: () => true,
    criado_em: agora,
  },
  combos_produtos: {
    id: () => crypto.randomUUID(),
    descricao: () => null,
    imagem_url: () => null,
    ordem: () => 0,
    ativo: () => true,
    criado_em: agora,
  },
  grupos_adicionais: {
    id: () => crypto.randomUUID(),
    obrigatorio: () => false,
    min_selecoes: () => 0,
    max_selecoes: () => 1,
    ordem: () => 0,
    ativo: () => true,
  },
  opcoes_adicionais: {
    id: () => crypto.randomUUID(),
    preco_base: () => 0,
    variar_por_tamanho: () => false,
    disponivel: () => true,
    ordem: () => 0,
  },
  precos_opcao_por_tamanho: { id: () => crypto.randomUUID() },
  perfis: { telefone: () => null, criado_em: agora, atualizado_em: agora },
  enderecos_cliente: {
    id: () => crypto.randomUUID(),
    apelido: () => null,
    complemento: () => null,
    cidade: () => null,
    cep: () => null,
    referencia: () => null,
    criado_em: agora,
  },
  pedidos: {
    id: () => crypto.randomUUID(),
    status: () => 'pendente',
    endereco_entrega: () => null,
    observacao: () => null,
    taxa_entrega: () => 0,
    taxa_servico: () => 0,
    metodo_pagamento_local: () => null,
    troco_para: () => null,
    status_pagamento: () => 'pendente',
    mercadopago_preference_id: () => null,
    mercadopago_payment_id: () => null,
    previsao_pronto_em: () => null,
    motivo_cancelamento: () => null,
    criado_em: agora,
    atualizado_em: agora,
  },
  itens_pedido: {
    id: () => crypto.randomUUID(),
    descricao: () => null,
    produto_id: () => null,
    variacao_id: () => null,
    tamanho: () => null,
    quantidade: () => 1,
    sabores: () => null,
    adicionais: () => null,
  },
  contadores_pedido: { proximo: () => 1 },
  staff_pizzaria: { papel: () => 'cozinha', criado_em: agora },
};

/** Triggers BEFORE UPDATE (cozinha.sql: set_atualizado_em). */
export const UPDATE_TRIGGERS: Record<string, (row: Row) => void> = {
  pedidos: (row) => {
    row.atualizado_em = agora();
  },
};

/** Colunas de `pizzarias` liberadas para anon/authenticated (rls.sql §6). */
export const PIZZARIAS_COLUNAS_PUBLICAS = new Set([
  'id', 'nome', 'slug', 'ativo', 'logo_url', 'cor_primaria', 'whatsapp', 'endereco', 'descricao',
  'aviso', 'aviso_ativo', 'instagram', 'metodos_pagamento', 'config_meia_meia',
  'config_frete', 'config_taxa_servico', 'pedido_minimo', 'aceita_retirada',
  'aceita_entrega', 'aceita_local', 'pedidos_pausados', 'horario_funcionamento',
]);
