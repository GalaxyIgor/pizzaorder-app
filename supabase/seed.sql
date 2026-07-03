-- supabase/seed.sql
--
-- Dados de teste para o slug "pizzaria-teste" — rodar depois de supabase/schema.sql.
-- Acesse em /pizzaria-teste depois de rodar este script.

do $$
declare
  v_pizzaria_id uuid;
  v_cat_tradicionais uuid;
  v_cat_especiais uuid;
  v_cat_meia_meia uuid;
  v_cat_bebidas uuid;
  v_produto_calabresa uuid;
  v_produto_mussarela uuid;
  v_produto_frango uuid;
  v_produto_quatro_queijos uuid;
  v_produto_coca uuid;
  v_grupo_borda uuid;
begin
  insert into pizzarias (nome, slug, cor_primaria, config_meia_meia, config_frete, pedido_minimo, aceita_retirada, aceita_entrega, aceita_local)
  values (
    'Pizzaria Teste',
    'pizzaria-teste',
    '#e63946',
    '{"estrategia":"maior"}',
    '{"tipo":"fixo","valorFixo":8}',
    30,
    true,
    true,
    true
  )
  returning id into v_pizzaria_id;

  insert into categorias (pizzaria_id, nome, tipo, ordem) values (v_pizzaria_id, 'Pizzas Tradicionais', 'pizza', 1) returning id into v_cat_tradicionais;
  insert into categorias (pizzaria_id, nome, tipo, ordem) values (v_pizzaria_id, 'Pizzas Especiais', 'pizza', 2) returning id into v_cat_especiais;
  insert into categorias (pizzaria_id, nome, tipo, ordem) values (v_pizzaria_id, 'Meia Meia', 'meia_meia', 3) returning id into v_cat_meia_meia;
  insert into categorias (pizzaria_id, nome, tipo, ordem) values (v_pizzaria_id, 'Bebidas', 'bebida', 4) returning id into v_cat_bebidas;

  insert into produtos (pizzaria_id, categoria_id, nome, descricao, ordem)
  values (v_pizzaria_id, v_cat_tradicionais, 'Calabresa', 'Molho de tomate, mussarela, calabresa fatiada e cebola', 1)
  returning id into v_produto_calabresa;
  insert into variacoes_produto (produto_id, tamanho, preco) values
    (v_produto_calabresa, 'M', 39.90),
    (v_produto_calabresa, 'G', 49.90);

  insert into produtos (pizzaria_id, categoria_id, nome, descricao, ordem)
  values (v_pizzaria_id, v_cat_tradicionais, 'Mussarela', 'Molho de tomate, mussarela e orégano', 2)
  returning id into v_produto_mussarela;
  insert into variacoes_produto (produto_id, tamanho, preco) values
    (v_produto_mussarela, 'M', 34.90),
    (v_produto_mussarela, 'G', 44.90);

  insert into produtos (pizzaria_id, categoria_id, nome, descricao, ordem)
  values (v_pizzaria_id, v_cat_especiais, 'Frango com Catupiry', 'Frango desfiado, catupiry e milho', 1)
  returning id into v_produto_frango;
  insert into variacoes_produto (produto_id, tamanho, preco) values
    (v_produto_frango, 'M', 44.90),
    (v_produto_frango, 'G', 54.90);

  insert into produtos (pizzaria_id, categoria_id, nome, descricao, ordem)
  values (v_pizzaria_id, v_cat_especiais, 'Quatro Queijos', 'Mussarela, provolone, parmesão e gorgonzola', 2)
  returning id into v_produto_quatro_queijos;
  insert into variacoes_produto (produto_id, tamanho, preco) values
    (v_produto_quatro_queijos, 'M', 46.90),
    (v_produto_quatro_queijos, 'G', 56.90);

  insert into produtos (pizzaria_id, categoria_id, nome, descricao, ordem)
  values (v_pizzaria_id, v_cat_bebidas, 'Coca-Cola 2L', null, 1)
  returning id into v_produto_coca;
  insert into variacoes_produto (produto_id, tamanho, preco) values (v_produto_coca, '2L', 12.90);

  insert into destaques (pizzaria_id, produto_id, ordem) values
    (v_pizzaria_id, v_produto_calabresa, 1),
    (v_pizzaria_id, v_produto_frango, 2);

  insert into combos_meia_meia (pizzaria_id, produto1_id, produto2_id, nome, descricao, ordem) values
    (v_pizzaria_id, v_produto_calabresa, v_produto_frango, 'Calabresa + Frango com Catupiry', 'Metade calabresa, metade frango com catupiry', 1);

  insert into grupos_adicionais (pizzaria_id, categoria_id, nome, tipo, obrigatorio, min_selecoes, max_selecoes, ordem)
  values (v_pizzaria_id, v_cat_tradicionais, 'Borda recheada', 'unica', false, 0, 1, 1)
  returning id into v_grupo_borda;
  insert into opcoes_adicionais (grupo_id, nome, preco_base, ordem) values
    (v_grupo_borda, 'Sem borda', 0, 1),
    (v_grupo_borda, 'Catupiry', 8, 2),
    (v_grupo_borda, 'Cheddar', 8, 3);
end $$;
