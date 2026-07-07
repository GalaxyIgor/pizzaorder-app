-- supabase/sobremesas.sql
--
-- Novo tipo de categoria 'sobremesa' (card próprio na primeira tela do cardápio).
-- Script incremental — rode no SQL editor do Supabase em bancos já criados
-- (o schema.sql novo já inclui o tipo para bancos do zero).
--
-- Seguro rodar mais de uma vez.

alter table categorias drop constraint if exists categorias_tipo_check;
alter table categorias add constraint categorias_tipo_check
  check (tipo in ('pizza', 'bebida', 'meia_meia', 'sobremesa', 'outro'));

-- Exemplo de uso (opcional — troque o slug e os valores):
-- do $$
-- declare
--   v_pizzaria_id uuid;
--   v_cat_sobremesas uuid;
--   v_produto uuid;
-- begin
--   select id into v_pizzaria_id from pizzarias where slug = 'pizzaria-teste';
--   insert into categorias (pizzaria_id, nome, tipo, ordem)
--     values (v_pizzaria_id, 'Sobremesas', 'sobremesa', 5)
--     returning id into v_cat_sobremesas;
--   insert into produtos (pizzaria_id, categoria_id, nome, descricao, ordem)
--     values (v_pizzaria_id, v_cat_sobremesas, 'Pizza de Chocolate', 'Chocolate ao leite com morango', 1)
--     returning id into v_produto;
--   insert into variacoes_produto (produto_id, tamanho, preco) values (v_produto, 'M', 34.90);
-- end $$;
