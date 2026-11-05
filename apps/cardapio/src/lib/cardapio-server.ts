// src/lib/cardapio-server.ts
//
// Busca do cardápio público no servidor: usada pelo layout do [slug] (SSR,
// sem fetch do browser depois da hidratação) e pela rota /api/cardapio/[slug].
// Client anon (RLS de catálogo público), não o service-role.

import { cache } from 'react';
import { supabaseAnon as supabase } from '@/lib/supabase/anon';
import type { CardapioResponse } from '@/types/cardapio';

export type ResultadoCardapio =
  | { ok: true; dados: CardapioResponse }
  | { ok: false; status: 404 | 500; error: string };

// cache(): layout e generateMetadata/página no mesmo request compartilham a busca.
export const buscarCardapio = cache(async (slug: string): Promise<ResultadoCardapio> => {
  // 1. Pizzaria (as demais consultas dependem do id dela)
  const { data: pizzaria, error: errPizzaria } = await supabase
    .from('pizzarias')
    .select(
      'id, nome, slug, logo_url, cor_primaria, whatsapp, endereco, descricao, aviso, aviso_ativo, instagram, metodos_pagamento, config_meia_meia, config_frete, config_taxa_servico, pedido_minimo, aceita_retirada, aceita_entrega, aceita_local, pedidos_pausados, horario_funcionamento'
    )
    .eq('slug', slug)
    .eq('ativo', true)
    .single();

  if (errPizzaria || !pizzaria) {
    return { ok: false, status: 404, error: 'Pizzaria não encontrada' };
  }

  // 2-7. Independentes entre si: em paralelo
  const [categorias, produtos, destaques, gruposAdicionais, combos, comboProdutos] =
    await Promise.all([
      supabase
        .from('categorias')
        .select('id, nome, tipo, ordem')
        .eq('pizzaria_id', pizzaria.id)
        .eq('ativo', true)
        .order('ordem'),
      supabase
        .from('produtos')
        .select(
          `
          id, nome, descricao, imagem_url, ordem, categoria_id,
          variacoes_produto (id, tamanho, preco, disponivel)
        `
        )
        .eq('pizzaria_id', pizzaria.id)
        .eq('disponivel', true)
        .order('ordem'),
      supabase
        .from('destaques')
        .select(
          `
          ordem,
          produtos (id, nome, descricao, imagem_url)
        `
        )
        .eq('pizzaria_id', pizzaria.id)
        .eq('ativo', true)
        .order('ordem'),
      // Grupos de adicionais (borda, opcionais) com opções e preços por tamanho
      supabase
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
        .order('ordem'),
      // Combos sugeridos de meia-meia (vitrine "Meia Meia")
      supabase
        .from('combos_meia_meia')
        .select('id, nome, descricao, imagem_url, ordem, produto1_id, produto2_id')
        .eq('pizzaria_id', pizzaria.id)
        .eq('ativo', true)
        .order('ordem'),
      // Combos de produtos (ex.: pizza + bebida, preço fixo)
      supabase
        .from('combos_produtos')
        .select('id, nome, descricao, imagem_url, ordem, produto1_id, produto2_id, preco')
        .eq('pizzaria_id', pizzaria.id)
        .eq('ativo', true)
        .order('ordem'),
    ]);

  if (categorias.error) return { ok: false, status: 500, error: 'Erro ao buscar categorias' };
  if (produtos.error) return { ok: false, status: 500, error: 'Erro ao buscar produtos' };
  if (destaques.error) return { ok: false, status: 500, error: 'Erro ao buscar destaques' };
  if (gruposAdicionais.error) return { ok: false, status: 500, error: 'Erro ao buscar adicionais' };
  if (combos.error) return { ok: false, status: 500, error: 'Erro ao buscar combos' };
  if (comboProdutos.error) {
    return { ok: false, status: 500, error: 'Erro ao buscar combos de produtos' };
  }

  return {
    ok: true,
    dados: {
      pizzaria,
      categorias: categorias.data,
      produtos: produtos.data,
      destaques: destaques.data,
      gruposAdicionais: gruposAdicionais.data,
      combos: combos.data,
      comboProdutos: comboProdutos.data,
    } as unknown as CardapioResponse,
  };
});
