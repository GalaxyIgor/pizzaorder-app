-- supabase/checkout.sql
--
-- Fase 1 do checkout: conta do cliente + pedidos.
-- Script incremental (não dropa nada) — pode rodar em cima do banco atual.
-- Rodar DEPOIS de supabase/schema.sql + grants.sql.
--
-- Vocabulário de `status`: recebido | em_preparo | pronto | saiu_para_entrega |
-- entregue | concluido | cancelado — PRECISA ser validado com o app da cozinha
-- antes de ir pra produção (maior risco de retrabalho do plano).

-- ============================================================
-- PIZZARIA: nova modalidade "comer no local"
-- ============================================================
alter table pizzarias
  add column if not exists aceita_local boolean not null default false;

-- ============================================================
-- PERFIS (conta global da plataforma — não é por tenant)
-- ============================================================
create table if not exists perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  telefone text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ============================================================
-- ENDEREÇOS SALVOS DO CLIENTE
-- ============================================================
create table if not exists enderecos_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references auth.users(id) on delete cascade,
  apelido text,
  rua text not null,
  numero text not null,
  complemento text,
  bairro text not null,
  cidade text,
  cep text,
  referencia text,
  criado_em timestamptz not null default now()
);

create index if not exists idx_enderecos_cliente on enderecos_cliente (cliente_id);

-- ============================================================
-- PEDIDOS
-- ============================================================
create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  pizzaria_id uuid not null references pizzarias(id) on delete restrict,
  cliente_id uuid not null references auth.users(id) on delete restrict,
  numero int not null,
  modalidade text not null check (modalidade in ('entrega', 'retirada', 'local')),
  status text not null default 'recebido'
    check (status in ('recebido', 'em_preparo', 'pronto', 'saiu_para_entrega', 'entregue', 'concluido', 'cancelado')),

  -- snapshot do cliente no momento do pedido
  nome_cliente text not null,
  telefone_cliente text not null,
  endereco_entrega jsonb, -- null quando modalidade != entrega
  observacao text,

  -- valores calculados server-side (nunca confiar no client)
  subtotal numeric(10,2) not null,
  taxa_entrega numeric(10,2) not null default 0,
  taxa_servico numeric(10,2) not null default 0,
  total numeric(10,2) not null,

  -- pagamento
  forma_pagamento text not null check (forma_pagamento in ('online', 'na_entrega')),
  metodo_pagamento_local text check (metodo_pagamento_local in ('dinheiro', 'cartao', 'pix')),
  status_pagamento text not null default 'pendente'
    check (status_pagamento in ('pendente', 'pago', 'falhou', 'estornado')),
  mercadopago_preference_id text,
  mercadopago_payment_id text,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  unique (pizzaria_id, numero)
);

create index if not exists idx_pedidos_cliente on pedidos (cliente_id, criado_em desc);
create index if not exists idx_pedidos_pizzaria on pedidos (pizzaria_id, criado_em desc);

-- ============================================================
-- ITENS DO PEDIDO (espelha CartItem linha a linha)
-- ============================================================
create table if not exists itens_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  tipo text not null check (tipo in ('produto', 'meia-meia')),
  nome text not null,
  descricao text,
  produto_id uuid references produtos(id) on delete set null,
  variacao_id uuid references variacoes_produto(id) on delete set null,
  tamanho text,
  preco_unit numeric(10,2) not null,
  quantidade int not null check (quantidade > 0),
  sabores jsonb,    -- [{produtoId, nome, descricao}] quando tipo = meia-meia
  adicionais jsonb  -- [{grupoId, opcaoId, nome, preco}]
);

create index if not exists idx_itens_pedido on itens_pedido (pedido_id);

-- ============================================================
-- NUMERAÇÃO SEQUENCIAL POR PIZZARIA (atômica, sem corrida)
-- ============================================================
create table if not exists contadores_pedido (
  pizzaria_id uuid primary key references pizzarias(id) on delete cascade,
  proximo int not null default 1
);

create or replace function proximo_numero_pedido(p_pizzaria uuid)
returns int
language sql
security definer
set search_path = public
as $$
  insert into contadores_pedido (pizzaria_id, proximo)
  values (p_pizzaria, 2)
  on conflict (pizzaria_id)
  do update set proximo = contadores_pedido.proximo + 1
  returning proximo - 1;
$$;

-- ============================================================
-- RLS
-- ============================================================
alter table perfis enable row level security;
alter table enderecos_cliente enable row level security;
alter table pedidos enable row level security;
alter table itens_pedido enable row level security;
alter table contadores_pedido enable row level security; -- sem policies: só service_role acessa

-- perfis: dono lê e edita o próprio (insert fica com o service_role no cadastro)
drop policy if exists perfis_select_own on perfis;
create policy perfis_select_own on perfis
  for select to authenticated using (id = auth.uid());

drop policy if exists perfis_update_own on perfis;
create policy perfis_update_own on perfis
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- enderecos_cliente: dono faz tudo
drop policy if exists enderecos_all_own on enderecos_cliente;
create policy enderecos_all_own on enderecos_cliente
  for all to authenticated using (cliente_id = auth.uid()) with check (cliente_id = auth.uid());

-- pedidos: cliente só LÊ os próprios; INSERT/UPDATE são exclusivos do service_role
drop policy if exists pedidos_select_own on pedidos;
create policy pedidos_select_own on pedidos
  for select to authenticated using (cliente_id = auth.uid());

-- itens_pedido: leitura se o pedido pai é do cliente
drop policy if exists itens_select_own on itens_pedido;
create policy itens_select_own on itens_pedido
  for select to authenticated using (
    exists (select 1 from pedidos p where p.id = pedido_id and p.cliente_id = auth.uid())
  );

-- ============================================================
-- PERMISSÕES (mesmo lembrete do grants.sql — sem GRANT dá "permission denied")
-- ============================================================
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to anon, authenticated, service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to service_role;

-- ============================================================
-- REALTIME (fase 5) — habilitar quando for usar status ao vivo:
--   alter publication supabase_realtime add table pedidos;
-- ============================================================
