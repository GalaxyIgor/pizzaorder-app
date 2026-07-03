-- supabase/grants.sql
--
-- Permissões dos roles do Supabase sobre o schema public.
-- Necessário quando as tabelas são criadas sem os privilégios padrão
-- (sintoma: "permission denied for table ..." mesmo com a service key).

grant usage on schema public to anon, authenticated, service_role;

grant all privileges on all tables in schema public to anon, authenticated, service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;
grant all privileges on all functions in schema public to anon, authenticated, service_role;

-- Garante que tabelas criadas daqui pra frente já nasçam com as permissões.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
