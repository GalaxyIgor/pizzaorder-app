// src/app/api/cardapio/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // 1. Pizzaria
  const { data: pizzaria, error: errPizzaria } = await supabase
    .from('pizzarias')
    .select(
      'id, nome, slug, logo_url, cor_primaria, config_meia_meia, config_frete, config_taxa_servico, pedido_minimo, aceita_retirada, aceita_entrega, aceita_local'
    )
    .eq('slug', slug)
    .eq('ativo', true)
    .single();

  if (errPizzaria || !pizzaria) {
    return NextResponse.json({ error: 'Pizzaria não encontrada' }, { status: 404 });
  }

  // 2. Categorias
  const { data: categorias, error: errCat } = await supabase
    .from('categorias')
    .select('id, nome, tipo, ordem')
    .eq('pizzaria_id', pizzaria.id)
    .eq('ativo', true)
    .order('ordem');

  if (errCat) {
    return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 });
  }

  // 3. Produtos com variações
  const { data: produtos, error: errProd } = await supabase
    .from('produtos')
    .select(
      `
      id, nome, descricao, imagem_url, ordem, categoria_id,
      variacoes_produto (id, tamanho, preco, disponivel)
    `
    )
    .eq('pizzaria_id', pizzaria.id)
    .eq('disponivel', true)
    .order('ordem');

  if (errProd) {
    return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 });
  }

  // 4. Destaques
  const { data: destaques, error: errDest } = await supabase
    .from('destaques')
    .select(
      `
      ordem,
      produtos (id, nome, descricao, imagem_url)
    `
    )
    .eq('pizzaria_id', pizzaria.id)
    .eq('ativo', true)
    .order('ordem');

  if (errDest) {
    return NextResponse.json({ error: 'Erro ao buscar destaques' }, { status: 500 });
  }

  // 5. Grupos de adicionais (borda, opcionais) com opções e preços por tamanho
  const { data: gruposAdicionais, error: errGrupos } = await supabase
    .from('grupos_adicionais')
    .select(
      `
      id, categoria_id, nome, tipo, obrigatorio, min_selecoes, max_selecoes, ordem,
      opcoes_adicionais (
        id, nome, preco_base, variar_por_tamanho, disponivel, ordem,
        precos_opcao_por_tamanho (tamanho, preco)
      )
    `
    )
    .eq('pizzaria_id', pizzaria.id)
    .eq('ativo', true)
    .order('ordem');

  if (errGrupos) {
    return NextResponse.json({ error: 'Erro ao buscar adicionais' }, { status: 500 });
  }

  // 6. Combos sugeridos de meia-meia (vitrine "Meia Meia")
  const { data: combos, error: errCombos } = await supabase
    .from('combos_meia_meia')
    .select('id, nome, descricao, imagem_url, ordem, produto1_id, produto2_id')
    .eq('pizzaria_id', pizzaria.id)
    .eq('ativo', true)
    .order('ordem');

  if (errCombos) {
    return NextResponse.json({ error: 'Erro ao buscar combos' }, { status: 500 });
  }

  return NextResponse.json({
    pizzaria,
    categorias,
    produtos,
    destaques,
    gruposAdicionais,
    combos,
  });
}