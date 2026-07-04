-- supabase/seed_turbo.sql
--
-- Semente enriquecida para o slug "pizzaria-teste".
-- Roda depois de supabase/schema.sql e substitui qualquer conteúdo
-- já existente para esta pizzaria.
--
-- Inclui categorias, pizzas, bebidas, sobremesas, destaques, combos meia-meia,
-- bordas/opcionais e preços por tamanho.

do $$
declare
  v_pizzaria_id uuid;
  v_cat_tradicionais uuid;
  v_cat_especiais uuid;
  v_cat_veganas uuid;
  v_cat_meia_meia uuid;
  v_cat_bebidas uuid;
  v_cat_sobremesas uuid;

  v_prod_calabresa uuid;
  v_prod_mussarela uuid;
  v_prod_portuguesa uuid;
  v_prod_marguerita uuid;
  v_prod_frango uuid;
  v_prod_quatro_queijos uuid;
  v_prod_pepperoni uuid;
  v_prod_veggie uuid;
  v_prod_vegan_supreme uuid;
  v_prod_coca uuid;
  v_prod_fanta uuid;
  v_prod_agua uuid;
  v_prod_brownie uuid;
  v_prod_petit uuid;

  v_grupo_bordas uuid;
  v_grupo_extras uuid;
  v_grupo_molhos uuid;
  v_opcao_sem_borda uuid;
  v_opcao_catupiry uuid;
  v_opcao_cheddar uuid;
  v_opcao_bacon uuid;
  v_opcao_oregano uuid;
  v_opcao_picante uuid;
  v_opcao_pimenta uuid;
  v_opcao_queijo uuid;
  v_opcao_mel uuid;
begin
  delete from pizzarias where slug = 'pizzaria-teste';

  insert into pizzarias (
    nome, slug, logo_url, cor_primaria, config_meia_meia, config_frete,
    config_taxa_servico, pedido_minimo, aceita_retirada, aceita_entrega, aceita_local, ativo
  ) values (
    'Pizzaria Teste',
    'pizzaria-teste',
    'https://example.com/logo-pizzaria-teste.png',
    '#e63946',
    '{"estrategia":"maior"}',
    '{"tipo":"fixo","valorFixo":8}',
    '{"tipo":"percentual","valor":0.05}',
    35,
    true,
    true,
    true,
    true
  ) returning id into v_pizzaria_id;

  insert into categorias (pizzaria_id, nome, tipo, ordem, ativo)
    values (v_pizzaria_id, 'Pizzas Tradicionais', 'pizza', 1, true)
    returning id into v_cat_tradicionais;
  insert into categorias (pizzaria_id, nome, tipo, ordem, ativo)
    values (v_pizzaria_id, 'Pizzas Especiais', 'pizza', 2, true)
    returning id into v_cat_especiais;
  insert into categorias (pizzaria_id, nome, tipo, ordem, ativo)
    values (v_pizzaria_id, 'Pizzas Veganas', 'pizza', 3, true)
    returning id into v_cat_veganas;
  insert into categorias (pizzaria_id, nome, tipo, ordem, ativo)
    values (v_pizzaria_id, 'Meia Meia', 'meia_meia', 4, true)
    returning id into v_cat_meia_meia;
  insert into categorias (pizzaria_id, nome, tipo, ordem, ativo)
    values (v_pizzaria_id, 'Bebidas', 'bebida', 5, true)
    returning id into v_cat_bebidas;
  insert into categorias (pizzaria_id, nome, tipo, ordem, ativo)
    values (v_pizzaria_id, 'Sobremesas', 'outro', 6, true)
    returning id into v_cat_sobremesas;

  insert into produtos (pizzaria_id, categoria_id, nome, descricao, imagem_url, ordem, disponivel)
    values (v_pizzaria_id, v_cat_tradicionais, 'Calabresa', 'Molho de tomate, mussarela, calabresa fatiada e cebola', 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&w=800&q=80', 1, true)
    returning id into v_prod_calabresa;
  insert into variacoes_produto (produto_id, tamanho, preco) values
    (v_prod_calabresa, 'M', 39.90),
    (v_prod_calabresa, 'G', 49.90),
    (v_prod_calabresa, 'GG', 59.90);

  insert into produtos (pizzaria_id, categoria_id, nome, descricao, imagem_url, ordem, disponivel)
    values (v_pizzaria_id, v_cat_tradicionais, 'Mussarela', 'Molho de tomate, mussarela e orégano', 'https://images.unsplash.com/photo-1548365328-6c6a1f9d8a76?auto=format&fit=crop&w=800&q=80', 2, true)
    returning id into v_prod_mussarela;
  insert into variacoes_produto (produto_id, tamanho, preco) values
    (v_prod_mussarela, 'M', 34.90),
    (v_prod_mussarela, 'G', 44.90),
    (v_prod_mussarela, 'GG', 54.90);

  insert into produtos (pizzaria_id, categoria_id, nome, descricao, imagem_url, ordem, disponivel)
    values (v_pizzaria_id, v_cat_tradicionais, 'Portuguesa', 'Molho de tomate, mussarela, presunto, ovos e ervilhas', 'https://images.unsplash.com/photo-1541370107829-577b5cd53d16?auto=format&fit=crop&w=800&q=80', 3, true)
    returning id into v_prod_portuguesa;
  insert into variacoes_produto (produto_id, tamanho, preco) values
    (v_prod_portuguesa, 'M', 42.90),
    (v_prod_portuguesa, 'G', 52.90);

  insert into produtos (pizzaria_id, categoria_id, nome, descricao, imagem_url, ordem, disponivel)
    values (v_pizzaria_id, v_cat_tradicionais, 'Marguerita', 'Molho de tomate, mussarela, tomate fatiado e manjericão', 'https://images.unsplash.com/photo-1601924411378-30fb589f7c4a?auto=format&fit=crop&w=800&q=80', 4, true)
    returning id into v_prod_marguerita;
  insert into variacoes_produto (produto_id, tamanho, preco) values
    (v_prod_marguerita, 'M', 37.90),
    (v_prod_marguerita, 'G', 47.90);

  insert into produtos (pizzaria_id, categoria_id, nome, descricao, imagem_url, ordem, disponivel)
    values (v_pizzaria_id, v_cat_especiais, 'Frango com Catupiry', 'Frango desfiado, catupiry e milho', 'https://images.unsplash.com/photo-1601924582970-7d1d6e23d2b6?auto=format&fit=crop&w=800&q=80', 1, true)
    returning id into v_prod_frango;
  insert into variacoes_produto (produto_id, tamanho, preco) values
    (v_prod_frango, 'M', 44.90),
    (v_prod_frango, 'G', 54.90);

  insert into produtos (pizzaria_id, categoria_id, nome, descricao, imagem_url, ordem, disponivel)
    values (v_pizzaria_id, v_cat_especiais, 'Quatro Queijos', 'Mussarela, provolone, parmesão e gorgonzola', 'https://images.unsplash.com/photo-1594007654665-b997c3c3f9f1?auto=format&fit=crop&w=800&q=80', 2, true)
    returning id into v_prod_quatro_queijos;
  insert into variacoes_produto (produto_id, tamanho, preco) values
    (v_prod_quatro_queijos, 'M', 46.90),
    (v_prod_quatro_queijos, 'G', 56.90);

  insert into produtos (pizzaria_id, categoria_id, nome, descricao, imagem_url, ordem, disponivel)
    values (v_pizzaria_id, v_cat_especiais, 'Pepperoni Suprema', 'Mussarela, pepperoni e borda fina crocante', 'https://images.unsplash.com/photo-1551892589-865f6986947b?auto=format&fit=crop&w=800&q=80', 3, true)
    returning id into v_prod_pepperoni;
  insert into variacoes_produto (produto_id, tamanho, preco) values
    (v_prod_pepperoni, 'M', 47.90),
    (v_prod_pepperoni, 'G', 57.90);

  insert into produtos (pizzaria_id, categoria_id, nome, descricao, imagem_url, ordem, disponivel)
    values (v_pizzaria_id, v_cat_veganas, 'Veggie Garden', 'Molho de tomate, mix de vegetais e queijo vegano', 'https://images.unsplash.com/photo-1523986371872-9d3ba2e2f1b7?auto=format&fit=crop&w=800&q=80', 1, true)
    returning id into v_prod_veggie;
  insert into variacoes_produto (produto_id, tamanho, preco) values
    (v_prod_veggie, 'M', 41.90),
    (v_prod_veggie, 'G', 51.90);

  insert into produtos (pizzaria_id, categoria_id, nome, descricao, imagem_url, ordem, disponivel)
    values (v_pizzaria_id, v_cat_veganas, 'Vegan Supreme', 'Molho de tomate, palmito, brócolis e queijo vegano', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80', 2, true)
    returning id into v_prod_vegan_supreme;
  insert into variacoes_produto (produto_id, tamanho, preco) values
    (v_prod_vegan_supreme, 'M', 43.90),
    (v_prod_vegan_supreme, 'G', 53.90);

  insert into produtos (pizzaria_id, categoria_id, nome, descricao, imagem_url, ordem, disponivel)
    values (v_pizzaria_id, v_cat_bebidas, 'Coca-Cola 2L', 'Refrigerante cola em garrafa de 2 litros', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80', 1, true)
    returning id into v_prod_coca;
  insert into variacoes_produto (produto_id, tamanho, preco) values
    (v_prod_coca, '2L', 12.90),
    (v_prod_coca, '1L', 8.90);

  insert into produtos (pizzaria_id, categoria_id, nome, descricao, imagem_url, ordem, disponivel)
    values (v_pizzaria_id, v_cat_bebidas, 'Fanta Laranja 2L', 'Refrigerante laranja em garrafa de 2 litros', 'https://images.unsplash.com/photo-1525382455947-f319bc05f6b8?auto=format&fit=crop&w=800&q=80', 2, true)
    returning id into v_prod_fanta;
  insert into variacoes_produto (produto_id, tamanho, preco) values
    (v_prod_fanta, '2L', 12.90),
    (v_prod_fanta, '1L', 8.90);

  insert into produtos (pizzaria_id, categoria_id, nome, descricao, imagem_url, ordem, disponivel)
    values (v_pizzaria_id, v_cat_bebidas, 'Água Mineral 500ml', 'Água sem gás em garrafa de 500ml', 'https://images.unsplash.com/photo-1510626176961-4b57f2d4b49d?auto=format&fit=crop&w=800&q=80', 3, true)
    returning id into v_prod_agua;
  insert into variacoes_produto (produto_id, tamanho, preco) values
    (v_prod_agua, '500ml', 5.90);

  insert into produtos (pizzaria_id, categoria_id, nome, descricao, imagem_url, ordem, disponivel)
    values (v_pizzaria_id, v_cat_sobremesas, 'Brownie', 'Brownie de chocolate com castanhas', 'https://images.unsplash.com/photo-1551024730531-7f3a5f37c7d2?auto=format&fit=crop&w=800&q=80', 1, true)
    returning id into v_prod_brownie;
  insert into variacoes_produto (produto_id, tamanho, preco) values
    (v_prod_brownie, 'Unico', 15.90);

  insert into produtos (pizzaria_id, categoria_id, nome, descricao, imagem_url, ordem, disponivel)
    values (v_pizzaria_id, v_cat_sobremesas, 'Petit Gateau', 'Petit gateau de chocolate com sorvete', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80', 2, true)
    returning id into v_prod_petit;
  insert into variacoes_produto (produto_id, tamanho, preco) values
    (v_prod_petit, 'Unico', 18.90);

  insert into destaques (pizzaria_id, produto_id, ordem, ativo) values
    (v_pizzaria_id, v_prod_quatro_queijos, 1, true),
    (v_pizzaria_id, v_prod_frango, 2, true),
    (v_pizzaria_id, v_prod_vegan_supreme, 3, true),
    (v_pizzaria_id, v_prod_coca, 4, true);

  insert into combos_meia_meia (
    pizzaria_id, produto1_id, produto2_id, nome, descricao, imagem_url, ordem, ativo
  ) values
    (v_pizzaria_id, v_prod_calabresa, v_prod_frango, 'Calabresa + Frango com Catupiry', 'Metade calabresa, metade frango com catupiry', null, 1, true),
    (v_pizzaria_id, v_prod_marguerita, v_prod_vegan_supreme, 'Marguerita + Vegan Supreme', 'Metade marguerita, metade vegan supreme', null, 2, true),
    (v_pizzaria_id, v_prod_portuguesa, v_prod_quatro_queijos, 'Portuguesa + Quatro Queijos', 'Metade portuguesa, metade quatro queijos', null, 3, true);

  insert into grupos_adicionais (
    pizzaria_id, categoria_id, nome, tipo, obrigatorio, min_selecoes, max_selecoes, ordem, ativo
  ) values
    (v_pizzaria_id, v_cat_tradicionais, 'Borda recheada', 'unica', false, 0, 1, 1, true)
    returning id into v_grupo_bordas;

  insert into opcoes_adicionais (grupo_id, nome, preco_base, variar_por_tamanho, disponivel, ordem)
    values (v_grupo_bordas, 'Sem borda', 0, false, true, 1)
    returning id into v_opcao_sem_borda;

  insert into opcoes_adicionais (grupo_id, nome, preco_base, variar_por_tamanho, disponivel, ordem)
    values (v_grupo_bordas, 'Catupiry', 0, true, true, 2)
    returning id into v_opcao_catupiry;

  insert into opcoes_adicionais (grupo_id, nome, preco_base, variar_por_tamanho, disponivel, ordem)
    values (v_grupo_bordas, 'Cheddar', 0, true, true, 3)
    returning id into v_opcao_cheddar;

  insert into precos_opcao_por_tamanho (opcao_id, tamanho, preco) values
    (v_opcao_sem_borda, 'M', 0),
    (v_opcao_sem_borda, 'G', 0),
    (v_opcao_sem_borda, 'GG', 0),
    (v_opcao_catupiry, 'M', 8.00),
    (v_opcao_catupiry, 'G', 10.00),
    (v_opcao_catupiry, 'GG', 12.00),
    (v_opcao_cheddar, 'M', 8.00),
    (v_opcao_cheddar, 'G', 10.00),
    (v_opcao_cheddar, 'GG', 12.00);

  insert into grupos_adicionais (
    pizzaria_id, categoria_id, nome, tipo, obrigatorio, min_selecoes, max_selecoes, ordem, ativo
  ) values
    (v_pizzaria_id, v_cat_tradicionais, 'Extras', 'multipla', false, 0, 3, 2, true)
    returning id into v_grupo_extras;

  insert into opcoes_adicionais (grupo_id, nome, preco_base, variar_por_tamanho, disponivel, ordem) values
    (v_grupo_extras, 'Bacon', 6.00, false, true, 1),
    (v_grupo_extras, 'Cebola caramelizada', 5.00, false, true, 2),
    (v_grupo_extras, 'Mushrooms', 5.00, false, true, 3),
    (v_grupo_extras, 'Azeitonas', 4.00, false, true, 4);

  insert into grupos_adicionais (
    pizzaria_id, categoria_id, nome, tipo, obrigatorio, min_selecoes, max_selecoes, ordem, ativo
  ) values
    (v_pizzaria_id, v_cat_tradicionais, 'Molhos extra', 'multipla', false, 0, 2, 3, true)
    returning id into v_grupo_molhos;

  insert into opcoes_adicionais (grupo_id, nome, preco_base, variar_por_tamanho, disponivel, ordem) values
    (v_grupo_molhos, 'Catupiry extra', 7.00, false, true, 1),
    (v_grupo_molhos, 'Molho de pimenta', 3.50, false, true, 2);
end $$;
