-- supabase/schema.sql
--
-- Schema do cardápio (pizzarias, categorias, produtos, adicionais, combos)
-- espelhando exatamente o que src/types/cardapio.ts e
-- src/app/api/cardapio/[slug]/route.ts esperam.
--
-- ATENÇÃO: este script DROPA as tabelas antes de recriar (reset completo).
-- Rode só se tiver certeza de que pode perder o que já existe nelas.

drop table if exists precos_opcao_por_tamanho cascade;
drop table if exists opcoes_adicionais cascade;
drop table if exists grupos_adicionais cascade;
drop table if exists combos_meia_meia cascade;
drop table if exists destaques cascade;
drop table if exists variacoes_produto cascade;
drop table if exists produtos cascade;
drop table if exists categorias cascade;
drop table if exists pizzarias cascade;

-- ============================================================
-- PIZZARIA (tenant)
-- ============================================================
create table pizzarias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  logo_url text,
  cor_primaria text not null default '#e63946',
  config_meia_meia jsonb not null default '{"estrategia":"maior"}',
  config_frete jsonb not null default '{"tipo":"gratis"}',
  config_taxa_servico jsonb,
  pedido_minimo numeric(10,2),
  aceita_retirada boolean not null default true,
  aceita_entrega boolean not null default true,
  aceita_local boolean not null default false,
  ativo boolean not null default true
);

-- ============================================================
-- CATEGORIA
-- ============================================================
create table categorias (
  id uuid primary key default gen_random_uuid(),
  pizzaria_id uuid not null references pizzarias(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('pizza', 'bebida', 'meia_meia', 'outro')),
  ordem int not null default 0,
  ativo boolean not null default true
);

-- ============================================================
-- PRODUTO + VARIAÇÕES
-- ============================================================
create table produtos (
  id uuid primary key default gen_random_uuid(),
  pizzaria_id uuid not null references pizzarias(id) on delete cascade,
  categoria_id uuid not null references categorias(id) on delete cascade,
  nome text not null,
  descricao text,
  imagem_url text,
  ordem int not null default 0,
  disponivel boolean not null default true
);

create table variacoes_produto (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id) on delete cascade,
  tamanho text,
  preco numeric(10,2) not null,
  disponivel boolean not null default true
);

-- ============================================================
-- DESTAQUE (carrossel da home)
-- ============================================================
create table destaques (
  id uuid primary key default gen_random_uuid(),
  pizzaria_id uuid not null references pizzarias(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete cascade,
  ordem int not null default 0,
  ativo boolean not null default true
);

-- ============================================================
-- COMBOS SUGERIDOS DE MEIA-MEIA
-- ============================================================
create table combos_meia_meia (
  id uuid primary key default gen_random_uuid(),
  pizzaria_id uuid not null references pizzarias(id) on delete cascade,
  produto1_id uuid not null references produtos(id) on delete cascade,
  produto2_id uuid not null references produtos(id) on delete cascade,
  nome text not null,
  descricao text,
  imagem_url text,
  ordem int not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ============================================================
-- GRUPOS DE ADICIONAIS (borda, opcionais)
-- ============================================================
create table grupos_adicionais (
  id uuid primary key default gen_random_uuid(),
  pizzaria_id uuid not null references pizzarias(id) on delete cascade,
  categoria_id uuid not null references categorias(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('unica', 'multipla')),
  obrigatorio boolean not null default false,
  min_selecoes int not null default 0,
  max_selecoes int,
  ordem int not null default 0,
  ativo boolean not null default true
);

create table opcoes_adicionais (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references grupos_adicionais(id) on delete cascade,
  nome text not null,
  preco_base numeric(10,2) not null default 0,
  variar_por_tamanho boolean not null default false,
  disponivel boolean not null default true,
  ordem int not null default 0
);

create table precos_opcao_por_tamanho (
  id uuid primary key default gen_random_uuid(),
  opcao_id uuid not null references opcoes_adicionais(id) on delete cascade,
  tamanho text not null,
  preco numeric(10,2) not null
);

-- ============================================================
-- PERMISSÕES (roles do Supabase)
-- ============================================================
-- Sem isso a API responde "permission denied" mesmo com a service key.
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to anon, authenticated, service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;
