-- supabase/personalizacao.sql
--
-- Personalização expandida: identidade completa da pizzaria + métodos de
-- pagamento aceitos + troco + bucket de upload de logo.
-- Script incremental (não dropa nada). Rodar no SQL editor do Supabase.

-- ============================================================
-- PIZZARIAS: identidade e comunicação
-- ============================================================
alter table pizzarias add column if not exists whatsapp text;
alter table pizzarias add column if not exists endereco text;
alter table pizzarias add column if not exists descricao text;
alter table pizzarias add column if not exists aviso text;
alter table pizzarias add column if not exists aviso_ativo boolean not null default false;
alter table pizzarias add column if not exists instagram text;

-- Métodos aceitos no "pagar na entrega/retirada" (o checkout só oferece esses
-- e o criarPedido valida). Default: todos, para não mudar o comportamento atual.
alter table pizzarias add column if not exists metodos_pagamento jsonb
  not null default '["dinheiro","cartao","pix"]'::jsonb;

-- ============================================================
-- PEDIDOS: troco (só faz sentido com metodo_pagamento_local = dinheiro)
-- ============================================================
alter table pedidos add column if not exists troco_para numeric(10,2);

-- ============================================================
-- STORAGE: bucket público para o upload de logo pela gestão
-- (escrita só via service-role na Server Action; leitura pública)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;
