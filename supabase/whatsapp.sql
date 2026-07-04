-- supabase/whatsapp.sql
--
-- WhatsApp da pizzaria (formato internacional sem símbolos, ex. 5511999990000),
-- usado no botão "Acompanhar pelo WhatsApp" da página de confirmação do pedido.
-- Rodar no SQL editor do Supabase.

alter table pizzarias add column if not exists whatsapp text;

-- Número de teste para a pizzaria de desenvolvimento
update pizzarias set whatsapp = '5511999990000' where slug = 'pizzaria-teste';
