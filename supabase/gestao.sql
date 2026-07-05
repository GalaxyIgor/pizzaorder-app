-- supabase/gestao.sql
--
-- Base do app de gestão (apps/gestao): status 'aceito' (gestão vira a
-- orquestradora do fluxo), horário de funcionamento e hardening de RLS nas
-- tabelas do cardápio (a gestão passa a ser a dona da escrita, via service-role).
-- Script incremental — rodar DEPOIS de schema.sql + grants.sql + checkout.sql
--   + cozinha.sql + whatsapp.sql.
--
-- ATENÇÃO: rodar este script e fazer deploy dos três apps em sequência
-- (o vocabulário de status muda; cozinha e cardápio precisam acompanhar).

-- ============================================================
-- NOVO STATUS 'aceito' (decidido em 2026-07-04)
--   pendente -> aceito (gestão aceita, com previsão) -> em_preparo (cozinha
--   pegou) -> pronto -> saiu_para_entrega (gestão) -> concluido (gestão)
--   cancelado: só a gestão, com motivo.
-- Nenhum status foi removido — pedidos existentes continuam válidos.
-- ============================================================
alter table pedidos drop constraint if exists pedidos_status_check;

alter table pedidos add constraint pedidos_status_check
  check (status in ('pendente', 'aceito', 'em_preparo', 'pronto', 'saiu_para_entrega', 'concluido', 'cancelado'));

-- ============================================================
-- HORÁRIO DE FUNCIONAMENTO (null = sempre aberto)
-- Shape: {"0":[{"abre":"18:00","fecha":"23:30"}], ..., "6":[...]}
--   chave = dia da semana ('0' = domingo), horários locais America/Sao_Paulo;
--   array vazio/chave ausente = fechado no dia; fecha < abre cruza a meia-noite.
-- Editado pela gestão; o cardápio exibe "Fechado" e o criarPedido recusa.
-- ============================================================
alter table pizzarias
  add column if not exists horario_funcionamento jsonb;

-- ============================================================
-- HARDENING: RLS nas tabelas do cardápio.
-- grants.sql deu ALL a anon e elas estavam SEM RLS — a anon key conseguia
-- escrever. Habilitar RLS sem policies = leitura/escrita só service-role
-- (o cardápio já lê via service-role no route handler; a gestão escreve
-- via server actions service-role — mesmo padrão de pedidos/pizzarias).
-- ============================================================
alter table categorias enable row level security;
alter table produtos enable row level security;
alter table variacoes_produto enable row level security;
alter table destaques enable row level security;
alter table combos_meia_meia enable row level security;
alter table grupos_adicionais enable row level security;
alter table opcoes_adicionais enable row level security;
alter table precos_opcao_por_tamanho enable row level security;

-- ============================================================
-- PERMISSÕES (mesmo lembrete dos scripts anteriores)
-- ============================================================
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to anon, authenticated, service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;
