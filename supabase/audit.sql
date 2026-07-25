-- supabase/audit.sql
--
-- Auditoria de segurança do banco (SÓ LEITURA — não altera nada).
-- Rode no SQL Editor do painel do Supabase e cole o resultado (um único JSON).
-- Serve para conferir o estado ANTES de aplicar o rls.sql e para validar DEPOIS.

select jsonb_pretty(jsonb_build_object(

  -- true = RLS habilitado; qualquer tabela em false está TOTALMENTE aberta à anon key
  'rls_por_tabela', (
    select jsonb_object_agg(tablename, rowsecurity order by tablename)
    from pg_tables
    where schemaname = 'public'
  ),

  -- policies existentes em public e storage
  'policies', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'schema', schemaname,
      'tabela', tablename,
      'policy', policyname,
      'cmd', cmd,
      'roles', roles::text,
      'using', qual,
      'with_check', with_check
    ) order by schemaname, tablename, policyname), '[]'::jsonb)
    from pg_policies
    where schemaname in ('public', 'storage')
  ),

  -- grants de tabela para os roles expostos pela API REST
  'grants_anon_authenticated', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'tabela', g.table_name,
      'role', g.grantee,
      'privilegios', g.privs
    ) order by g.table_name, g.grantee), '[]'::jsonb)
    from (
      select table_name, grantee,
             jsonb_agg(privilege_type order by privilege_type) as privs
      from information_schema.role_table_grants
      where table_schema = 'public'
        and grantee in ('anon', 'authenticated')
      group by table_name, grantee
    ) g
  ),

  -- todas as colunas de pizzarias (para decidir a lista pública do column-grant)
  'colunas_pizzarias', (
    select jsonb_agg(column_name order by ordinal_position)
    from information_schema.columns
    where table_schema = 'public' and table_name = 'pizzarias'
  ),

  -- bucket de logos (public = leitura aberta via /object/public/)
  'bucket_logos', (
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'public', public)), '[]'::jsonb)
    from storage.buckets
    where id = 'logos'
  ),

  -- quem pode executar a função de número sequencial de pedido
  'grants_proximo_numero_pedido', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'role', grantee, 'privilegio', privilege_type
    ) order by grantee), '[]'::jsonb)
    from information_schema.routine_privileges
    where routine_schema = 'public' and routine_name = 'proximo_numero_pedido'
  )

));
