-- supabase/cozinha.sql
--
-- Base do app da cozinha (apps/cozinha): novo vocabulário de status com aceite
-- explícito, staff por pizzaria, previsão de pronto, motivo de cancelamento,
-- pausa de pedidos e Realtime.
-- Script incremental — rodar DEPOIS de schema.sql + grants.sql + checkout.sql.
--
-- ATENÇÃO: rodar este script e fazer deploy do cardápio atualizado em sequência
-- (o vocabulário de status muda; o site do cliente precisa acompanhar).

-- ============================================================
-- NOVO VOCABULÁRIO DE STATUS (decidido em 2026-07-04)
--   pendente -> em_preparo (cozinha aceita, com previsão) -> pronto
--     -> saiu_para_entrega (só modalidade entrega) -> concluido
--   cancelado: recusa da cozinha ou cancelamento, antes de concluido
-- Renomeia 'recebido'->'pendente' e funde 'entregue' em 'concluido'.
-- ============================================================
alter table pedidos drop constraint if exists pedidos_status_check;

update pedidos set status = 'pendente'  where status = 'recebido';
update pedidos set status = 'concluido' where status = 'entregue';

alter table pedidos add constraint pedidos_status_check
  check (status in ('pendente', 'em_preparo', 'pronto', 'saiu_para_entrega', 'concluido', 'cancelado'));

alter table pedidos alter column status set default 'pendente';

-- ============================================================
-- COLUNAS NOVAS
-- ============================================================
-- Previsão de ficar pronto: timestamp absoluto (a UI da cozinha digita minutos
-- e a server action grava now() + intervalo) — sem ambiguidade e permite countdown.
alter table pedidos
  add column if not exists previsao_pronto_em timestamptz;

-- Motivo de recusa/cancelamento — USO INTERNO (cozinha/gestão); o cliente vê só "Cancelado".
alter table pedidos
  add column if not exists motivo_cancelamento text;

-- Pausa de novos pedidos (a cozinha liga/desliga; o cardápio avisa e o checkout bloqueia)
alter table pizzarias
  add column if not exists pedidos_pausados boolean not null default false;

-- ============================================================
-- STAFF POR PIZZARIA (contas criadas manualmente por ora; o app de
-- gestão cuidará disso no futuro — ver seed comentado no fim)
-- ============================================================
create table if not exists staff_pizzaria (
  user_id uuid not null references auth.users(id) on delete cascade,
  pizzaria_id uuid not null references pizzarias(id) on delete cascade,
  papel text not null default 'cozinha' check (papel in ('cozinha', 'gerente')),
  criado_em timestamptz not null default now(),
  primary key (user_id, pizzaria_id)
);

alter table staff_pizzaria enable row level security;

-- staff lê o próprio vínculo (o login da cozinha descobre a(s) pizzaria(s) assim)
drop policy if exists staff_select_own on staff_pizzaria;
create policy staff_select_own on staff_pizzaria
  for select to authenticated using (user_id = auth.uid());

-- helper para as policies (security definer evita recursão de RLS na própria staff_pizzaria)
create or replace function is_staff_da_pizzaria(p_pizzaria uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from staff_pizzaria
    where user_id = auth.uid() and pizzaria_id = p_pizzaria
  );
$$;

grant execute on function is_staff_da_pizzaria(uuid) to authenticated;

-- pedidos: staff LÊ os da sua pizzaria (também é o que autoriza o Realtime).
-- Sem policy de UPDATE de propósito: RLS não restringe colunas — toda escrita
-- passa por server action com service-role + máquina de estados (padrão do criarPedido).
drop policy if exists pedidos_select_staff on pedidos;
create policy pedidos_select_staff on pedidos
  for select to authenticated using (is_staff_da_pizzaria(pizzaria_id));

-- itens_pedido: idem, via pedido pai
drop policy if exists itens_select_staff on itens_pedido;
create policy itens_select_staff on itens_pedido
  for select to authenticated using (
    exists (select 1 from pedidos p where p.id = pedido_id and is_staff_da_pizzaria(p.pizzaria_id))
  );

-- ============================================================
-- PIZZARIAS: habilitar RLS (grants.sql deu ALL a anon e a tabela estava
-- sem RLS — ou seja, a anon key conseguia escrever nela). Leitura pública
-- de pizzarias ativas; escrita continua exclusiva do service-role.
-- ============================================================
alter table pizzarias enable row level security;

drop policy if exists pizzarias_select_public on pizzarias;
create policy pizzarias_select_public on pizzarias
  for select to anon, authenticated using (ativo);

-- ============================================================
-- atualizado_em automático em UPDATE (não existia trigger)
-- ============================================================
create or replace function set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_pedidos_atualizado_em on pedidos;
create trigger trg_pedidos_atualizado_em
  before update on pedidos
  for each row execute function set_atualizado_em();

-- ============================================================
-- REALTIME: painel da cozinha (INSERT/UPDATE de pedidos ao vivo).
-- Guardado em DO block para poder rodar o script mais de uma vez.
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pedidos'
  ) then
    alter publication supabase_realtime add table pedidos;
  end if;
end;
$$;

-- payload completo nos eventos de UPDATE (senão só a PK chega no old record)
alter table pedidos replica identity full;

-- ============================================================
-- PERMISSÕES (mesmo lembrete do grants.sql — sem GRANT dá "permission denied")
-- ============================================================
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to anon, authenticated, service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;

-- ============================================================
-- SEED DE STAFF (manual, até existir o app de gestão):
-- 1. Dashboard > Authentication > Add user (email + senha, confirmar email).
-- 2. Vincular à pizzaria:
--
--   insert into staff_pizzaria (user_id, pizzaria_id, papel)
--   select u.id, p.id, 'cozinha'
--   from auth.users u, pizzarias p
--   where u.email = 'cozinha@pizzaria-teste.com' and p.slug = 'pizzaria-teste'
--   on conflict do nothing;
-- ============================================================
