-- supabase/google_auth.sql
--
-- Login com Google: o telefone (WhatsApp) vira o identificador de contato do
-- cliente — único por conta. Script incremental (não dropa nada); rodar
-- depois de checkout.sql.
--
-- Além deste script, é preciso configurar no painel do Supabase:
--   Authentication -> Providers -> Google (Client ID + Secret do Google Cloud)
--   Authentication -> URL Configuration -> Redirect URLs:
--     http://localhost:3000/auth/callback  (cardápio)
--     http://localhost:3001/auth/callback  (cozinha)
--     http://localhost:3002/auth/callback  (gestão)
--     + as URLs de produção equivalentes.

-- Telefone único por conta, comparando SÓ os dígitos — "(11) 99999-9999" e
-- "11999999999" contam como o mesmo número. Nulo/vazio fica de fora (contas
-- Google recém-criadas ainda não têm telefone; ele chega no primeiro pedido).
--
-- ATENÇÃO: se o banco atual já tiver duas contas com o mesmo telefone, o
-- CREATE INDEX falha. Para achar duplicatas antes:
--   select regexp_replace(telefone, '\D', '', 'g') as tel, count(*)
--   from perfis where telefone is not null and telefone <> ''
--   group by 1 having count(*) > 1;
create unique index if not exists uq_perfis_telefone
  on perfis ((regexp_replace(telefone, '\D', '', 'g')))
  where telefone is not null and telefone <> '';
