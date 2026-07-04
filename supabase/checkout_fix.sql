-- supabase/checkout_fix.sql
--
-- Correção: o banco tinha versões antigas de `pedidos` e `itens_pedido`
-- (de antes do checkout.sql atual), e o `create table if not exists` do
-- checkout.sql pulou a recriação — faltavam colunas como numero, modalidade,
-- nome_cliente e metodo_pagamento_local, e TODO pedido falhava no insert.
--
-- As duas tabelas estão vazias, então é seguro dropar e recriar.
-- Rodar no SQL editor do Supabase. Não mexe em perfis/enderecos_cliente/
-- contadores_pedido (a numeração continua de onde parou).

drop table if exists itens_pedido cascade;
drop table if exists pedidos cascade;

-- ============================================================
-- PEDIDOS (idêntico ao supabase/checkout.sql)
-- ============================================================
create table pedidos (
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

create index idx_pedidos_cliente on pedidos (cliente_id, criado_em desc);
create index idx_pedidos_pizzaria on pedidos (pizzaria_id, criado_em desc);

-- ============================================================
-- ITENS DO PEDIDO (idêntico ao supabase/checkout.sql)
-- ============================================================
create table itens_pedido (
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

create index idx_itens_pedido on itens_pedido (pedido_id);

-- ============================================================
-- RLS + POLICIES (o drop cascade levou as antigas junto)
-- ============================================================
alter table pedidos enable row level security;
alter table itens_pedido enable row level security;

create policy pedidos_select_own on pedidos
  for select to authenticated using (cliente_id = auth.uid());

create policy itens_select_own on itens_pedido
  for select to authenticated using (
    exists (select 1 from pedidos p where p.id = pedido_id and p.cliente_id = auth.uid())
  );

-- ============================================================
-- PERMISSÕES (tabelas novas não herdam os grants antigos)
-- ============================================================
grant all privileges on table pedidos, itens_pedido to anon, authenticated, service_role;
