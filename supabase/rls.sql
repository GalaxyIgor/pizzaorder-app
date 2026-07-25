-- supabase/rls.sql
--
-- Estado-desejado de RLS/grants do banco. Idempotente: pode rodar quantas
-- vezes quiser; sempre converge para o estado descrito aqui.
--
-- Modelo de segurança:
--   * anon/authenticated leem apenas o catálogo público (lojas ativas, itens
--     ativos/disponíveis) e cada usuário lê os próprios dados (pedidos, perfil,
--     endereços); staff lê os pedidos da sua pizzaria (vínculo staff_pizzaria).
--   * TODA escrita de negócio é exclusiva do service-role (bypassa RLS),
--     sempre depois da validação em JS (exigirStaff / criarPedido). As únicas
--     exceções com policy são escritas do usuário nos próprios dados
--     (perfis update, enderecos_cliente) — hoje não usadas pelo client, mas
--     alinhadas com o que o app pode vir a fazer via SSR.
--   * pizzarias tem column-grant: anon/authenticated só enxergam as colunas
--     públicas listadas abaixo. ATENÇÃO: isso quebra select('*') em pizzarias
--     via anon/SSR — use sempre lista explícita de colunas (o código já usa).
--
-- Rode no SQL Editor do painel. Roda em transação: ou aplica tudo, ou nada.

begin;

-- ---------------------------------------------------------------------------
-- 1. RLS habilitado em todas as tabelas do app
-- ---------------------------------------------------------------------------

alter table public.pizzarias                 enable row level security;
alter table public.pedidos                   enable row level security;
alter table public.itens_pedido              enable row level security;
alter table public.perfis                    enable row level security;
alter table public.enderecos_cliente         enable row level security;
alter table public.staff_pizzaria            enable row level security;
alter table public.categorias                enable row level security;
alter table public.produtos                  enable row level security;
alter table public.variacoes_produto         enable row level security;
alter table public.grupos_adicionais         enable row level security;
alter table public.opcoes_adicionais         enable row level security;
alter table public.precos_opcao_por_tamanho  enable row level security;
alter table public.destaques                 enable row level security;
alter table public.combos_meia_meia          enable row level security;
alter table public.combos_produtos           enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Remove TODAS as policies existentes dessas tabelas (estado-desejado:
--    o que não for recriado abaixo deixa de existir)
-- ---------------------------------------------------------------------------

do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'pizzarias', 'pedidos', 'itens_pedido', 'perfis', 'enderecos_cliente',
        'staff_pizzaria', 'categorias', 'produtos', 'variacoes_produto',
        'grupos_adicionais', 'opcoes_adicionais', 'precos_opcao_por_tamanho',
        'destaques', 'combos_meia_meia', 'combos_produtos'
      )
  loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Catálogo público (leitura anon + authenticated)
--
-- Nas tabelas filhas o filtro é pelo PAI ativo/disponível, não pela própria
-- flag: a rota pública retorna variações/opções indisponíveis de propósito
-- (o front mostra "indisponível"). Subqueries de policy também passam pelo
-- RLS da tabela referenciada, então a corrente pai→pizzaria ativa se mantém.
-- ---------------------------------------------------------------------------

create policy pizzarias_select_public on public.pizzarias
  for select to anon, authenticated
  using (ativo = true);

create policy categorias_select_public on public.categorias
  for select to anon, authenticated
  using (
    ativo = true
    and exists (select 1 from public.pizzarias z where z.id = pizzaria_id and z.ativo = true)
  );

create policy produtos_select_public on public.produtos
  for select to anon, authenticated
  using (
    disponivel = true
    and exists (select 1 from public.pizzarias z where z.id = pizzaria_id and z.ativo = true)
  );

create policy variacoes_select_public on public.variacoes_produto
  for select to anon, authenticated
  using (
    exists (select 1 from public.produtos p where p.id = produto_id and p.disponivel = true)
  );

create policy grupos_adicionais_select_public on public.grupos_adicionais
  for select to anon, authenticated
  using (
    ativo = true
    and exists (select 1 from public.pizzarias z where z.id = pizzaria_id and z.ativo = true)
  );

create policy opcoes_select_public on public.opcoes_adicionais
  for select to anon, authenticated
  using (
    exists (select 1 from public.grupos_adicionais g where g.id = grupo_id and g.ativo = true)
  );

create policy precos_opcao_select_public on public.precos_opcao_por_tamanho
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.opcoes_adicionais o
      join public.grupos_adicionais g on g.id = o.grupo_id
      where o.id = opcao_id and g.ativo = true
    )
  );

create policy destaques_select_public on public.destaques
  for select to anon, authenticated
  using (
    ativo = true
    and exists (select 1 from public.pizzarias z where z.id = pizzaria_id and z.ativo = true)
  );

create policy combos_mm_select_public on public.combos_meia_meia
  for select to anon, authenticated
  using (
    ativo = true
    and exists (select 1 from public.pizzarias z where z.id = pizzaria_id and z.ativo = true)
  );

create policy combos_produtos_select_public on public.combos_produtos
  for select to anon, authenticated
  using (
    ativo = true
    and exists (select 1 from public.pizzarias z where z.id = pizzaria_id and z.ativo = true)
  );

-- ---------------------------------------------------------------------------
-- 4. Dados do cliente (dono da linha)
--
-- (select auth.uid()) em vez de auth.uid(): o Postgres avalia como InitPlan
-- (uma vez por query, não por linha) — recomendação oficial da Supabase.
-- ---------------------------------------------------------------------------

create policy perfis_select_own on public.perfis
  for select to authenticated
  using (id = (select auth.uid()));

create policy perfis_update_own on public.perfis
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy enderecos_select_own on public.enderecos_cliente
  for select to authenticated
  using (cliente_id = (select auth.uid()));

create policy enderecos_insert_own on public.enderecos_cliente
  for insert to authenticated
  with check (cliente_id = (select auth.uid()));

create policy enderecos_update_own on public.enderecos_cliente
  for update to authenticated
  using (cliente_id = (select auth.uid()))
  with check (cliente_id = (select auth.uid()));

create policy enderecos_delete_own on public.enderecos_cliente
  for delete to authenticated
  using (cliente_id = (select auth.uid()));

create policy pedidos_select_own on public.pedidos
  for select to authenticated
  using (cliente_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 5. Staff (gestão e cozinha): lê os pedidos da própria pizzaria
-- ---------------------------------------------------------------------------

create policy staff_select_own on public.staff_pizzaria
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy pedidos_select_staff on public.pedidos
  for select to authenticated
  using (
    exists (
      select 1 from public.staff_pizzaria s
      where s.user_id = (select auth.uid()) and s.pizzaria_id = pizzaria_id
    )
  );

create policy itens_pedido_select_own_ou_staff on public.itens_pedido
  for select to authenticated
  using (
    exists (
      select 1 from public.pedidos p
      where p.id = pedido_id
        and (
          p.cliente_id = (select auth.uid())
          or exists (
            select 1 from public.staff_pizzaria s
            where s.user_id = (select auth.uid()) and s.pizzaria_id = p.pizzaria_id
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Column-grant em pizzarias: anon/authenticated só leem as colunas públicas
--    (RLS filtra linhas, não colunas). Ajuste a lista se o audit.sql mostrar
--    colunas novas que a loja pública precise.
-- ---------------------------------------------------------------------------

revoke select on public.pizzarias from anon, authenticated;
grant select (
  id, nome, slug, ativo, logo_url, cor_primaria, whatsapp, endereco, descricao,
  aviso, aviso_ativo, instagram, metodos_pagamento, config_meia_meia,
  config_frete, config_taxa_servico, pedido_minimo, aceita_retirada,
  aceita_entrega, aceita_local, pedidos_pausados, horario_funcionamento
) on public.pizzarias to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Grants de escrita (defesa em profundidade além do default-deny do RLS):
--    anon não escreve nada; authenticated só onde existe policy própria.
-- ---------------------------------------------------------------------------

revoke insert, update, delete on all tables in schema public from anon;
revoke insert, update, delete on all tables in schema public from authenticated;
grant insert, update, delete on public.enderecos_cliente to authenticated;
grant update on public.perfis to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Função de número sequencial: só o service-role executa
--    (por padrão o Postgres dá EXECUTE a PUBLIC em toda função)
-- ---------------------------------------------------------------------------

do $$
declare
  fn record;
begin
  for fn in
    select oid::regprocedure as assinatura
    from pg_proc
    where proname = 'proximo_numero_pedido'
      and pronamespace = 'public'::regnamespace
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn.assinatura);
    execute format('grant execute on function %s to service_role', fn.assinatura);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 9. Índices que sustentam as policies (no-op se já existirem)
-- ---------------------------------------------------------------------------

create index if not exists idx_pedidos_cliente          on public.pedidos (cliente_id);
create index if not exists idx_pedidos_pizzaria         on public.pedidos (pizzaria_id);
create index if not exists idx_itens_pedido_pedido      on public.itens_pedido (pedido_id);
create index if not exists idx_enderecos_cliente_dono   on public.enderecos_cliente (cliente_id);
create index if not exists idx_staff_pizzaria_user      on public.staff_pizzaria (user_id, pizzaria_id);

commit;

-- ---------------------------------------------------------------------------
-- Storage (bucket `logos`) — conferir com o resultado do audit.sql:
--   * o bucket deve estar public = true (leitura via /object/public/ não passa
--     por policy); o upload é feito pelo service-role e não precisa de policy.
--   * se o audit mostrar alguma policy de INSERT/UPDATE/DELETE em
--     storage.objects para anon/authenticated no bucket `logos`, remova:
--       drop policy "<nome>" on storage.objects;
--   Não removemos policies de storage às cegas aqui porque outros buckets
--   podem ter regras legítimas.
-- ---------------------------------------------------------------------------
