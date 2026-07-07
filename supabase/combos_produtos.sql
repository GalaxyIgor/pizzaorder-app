-- supabase/combos_produtos.sql
--
-- Combos de produtos com preço fixo (ex.: pizza + bebida), diferente do
-- combos_meia_meia (que junta 2 sabores de pizza numa pizza só, com preço
-- calculado pela config_meia_meia do tenant). Aqui o preço é definido
-- manualmente pelo dono da pizzaria e os dois produtos podem ser de
-- categorias diferentes.
--
-- Rode este arquivo direto no SQL editor do Supabase do seu projeto
-- (não mexe nas tabelas existentes, só cria esta nova).

create table if not exists combos_produtos (
  id uuid primary key default gen_random_uuid(),
  pizzaria_id uuid not null references pizzarias(id) on delete cascade,
  produto1_id uuid not null references produtos(id) on delete cascade,
  produto2_id uuid not null references produtos(id) on delete cascade,
  nome text not null,
  descricao text,
  imagem_url text,
  preco numeric(10,2) not null,
  ordem int not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

grant all privileges on combos_produtos to anon, authenticated, service_role;
