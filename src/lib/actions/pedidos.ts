'use server';

// src/lib/actions/pedidos.ts
//
// criarPedido: revalida auth, RECALCULA tudo server-side (preços, frete, taxa,
// pedido mínimo — nunca confia nos valores do client) e insere pedidos + itens.
// Sucesso => redirect para a página do pedido (?novo=1 limpa o carrinho lá).

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabase as admin } from '@/lib/supabase';
import { arredondar, calcularFrete, calcularTaxaServico } from '@/lib/frete';
import type { ConfigFrete, ConfigMeiaMeia, ConfigTaxaServico } from '@/types/cardapio';
import type { CartItem } from '@/types/carrinho';
import type { CriarPedidoInput } from '@/types/pedido';

interface PedidoErro {
  erro: string;
}

// Shapes locais do que o recalculo busca no banco
interface VariacaoRow {
  id: string;
  preco: number;
  tamanho: string | null;
  disponivel: boolean;
  produtos: { id: string; pizzaria_id: string; disponivel: boolean };
}

interface ProdutoSaborRow {
  id: string;
  pizzaria_id: string;
  disponivel: boolean;
  variacoes_produto: { preco: number; disponivel: boolean }[];
}

interface OpcaoRow {
  id: string;
  preco_base: number;
  variar_por_tamanho: boolean;
  disponivel: boolean;
  precos_opcao_por_tamanho: { tamanho: string; preco: number }[];
  grupos_adicionais: { pizzaria_id: string };
}

const ERRO_ITEM_INDISPONIVEL =
  'Um item da sua sacola não está mais disponível. Volte ao cardápio e revise a sacola.';

function menorPrecoDisponivel(variacoes: { preco: number; disponivel: boolean }[]): number | null {
  const precos = variacoes.filter((v) => v.disponivel).map((v) => v.preco);
  return precos.length > 0 ? Math.min(...precos) : null;
}

function precoMeiaMeia(preco1: number, preco2: number, config: ConfigMeiaMeia): number {
  switch (config.estrategia) {
    case 'maior':
      return Math.max(preco1, preco2);
    case 'menor':
      return Math.min(preco1, preco2);
    case 'media':
      return (preco1 + preco2) / 2;
    case 'fixo':
      return config.precoFixo ?? Math.max(preco1, preco2);
  }
}

export async function criarPedido(input: CriarPedidoInput): Promise<PedidoErro> {
  // 1. Auth — o proxy é só UX; a action revalida sempre.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { erro: 'Sua sessão expirou. Faça login novamente.' };

  // 2. Validações básicas do input
  const nome = input.nome?.trim();
  const telefone = input.telefone?.trim();
  if (!nome || !telefone) return { erro: 'Informe nome e telefone.' };
  if (!input.itens || input.itens.length === 0) return { erro: 'Sua sacola está vazia.' };

  if (input.formaPagamento === 'online') {
    return { erro: 'Pagamento online ainda não está disponível. Escolha pagar na entrega/retirada.' };
  }
  if (input.formaPagamento !== 'na_entrega' || !input.metodoPagamentoLocal) {
    return { erro: 'Escolha a forma de pagamento.' };
  }

  // 3. Pizzaria + regras da modalidade
  const { data: pizzaria, error: errPizzaria } = await admin
    .from('pizzarias')
    .select(
      'id, config_meia_meia, config_frete, config_taxa_servico, pedido_minimo, aceita_entrega, aceita_retirada, aceita_local'
    )
    .eq('slug', input.slug)
    .eq('ativo', true)
    .single();

  if (errPizzaria || !pizzaria) return { erro: 'Pizzaria não encontrada.' };

  const aceita: Record<string, boolean> = {
    entrega: pizzaria.aceita_entrega,
    retirada: pizzaria.aceita_retirada,
    local: pizzaria.aceita_local,
  };
  if (!aceita[input.modalidade]) {
    return { erro: 'Essa modalidade não está disponível nesta pizzaria.' };
  }

  const endereco = input.modalidade === 'entrega' ? input.endereco : null;
  if (input.modalidade === 'entrega') {
    if (!endereco?.rua?.trim() || !endereco?.numero?.trim() || !endereco?.bairro?.trim()) {
      return { erro: 'Preencha o endereço de entrega (rua, número e bairro).' };
    }
  }

  // 4. Recalcula cada linha da sacola a partir do banco
  const itensProduto = input.itens.filter((i) => i.tipo === 'produto');
  const itensMeiaMeia = input.itens.filter((i) => i.tipo === 'meia-meia');

  const variacaoIds = [...new Set(itensProduto.map((i) => i.variacaoId).filter(Boolean))] as string[];
  const saborIds = [
    ...new Set(itensMeiaMeia.flatMap((i) => (i.sabores ?? []).map((s) => s.produtoId))),
  ];
  const opcaoIds = [
    ...new Set(input.itens.flatMap((i) => (i.adicionais ?? []).map((a) => a.opcaoId))),
  ];

  const [variacoesRes, saboresRes, opcoesRes] = await Promise.all([
    variacaoIds.length > 0
      ? admin
          .from('variacoes_produto')
          .select('id, preco, tamanho, disponivel, produtos!inner(id, pizzaria_id, disponivel)')
          .in('id', variacaoIds)
      : Promise.resolve({ data: [], error: null }),
    saborIds.length > 0
      ? admin
          .from('produtos')
          .select('id, pizzaria_id, disponivel, variacoes_produto(preco, disponivel)')
          .in('id', saborIds)
      : Promise.resolve({ data: [], error: null }),
    opcaoIds.length > 0
      ? admin
          .from('opcoes_adicionais')
          .select(
            'id, preco_base, variar_por_tamanho, disponivel, precos_opcao_por_tamanho(tamanho, preco), grupos_adicionais!inner(pizzaria_id)'
          )
          .in('id', opcaoIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (variacoesRes.error || saboresRes.error || opcoesRes.error) {
    return { erro: 'Erro ao validar os itens do pedido. Tente novamente.' };
  }

  const variacoes = new Map(
    (variacoesRes.data as unknown as VariacaoRow[]).map((v) => [v.id, v])
  );
  const sabores = new Map(
    (saboresRes.data as unknown as ProdutoSaborRow[]).map((p) => [p.id, p])
  );
  const opcoes = new Map((opcoesRes.data as unknown as OpcaoRow[]).map((o) => [o.id, o]));

  const configMeiaMeia = pizzaria.config_meia_meia as ConfigMeiaMeia;

  const precoAdicionais = (item: CartItem, tamanho: string | null): number | null => {
    let total = 0;
    for (const adicional of item.adicionais ?? []) {
      const opcao = opcoes.get(adicional.opcaoId);
      if (!opcao || !opcao.disponivel) return null;
      if (opcao.grupos_adicionais.pizzaria_id !== pizzaria.id) return null;
      if (opcao.variar_por_tamanho && tamanho) {
        const porTamanho = opcao.precos_opcao_por_tamanho.find((p) => p.tamanho === tamanho);
        total += porTamanho?.preco ?? opcao.preco_base;
      } else {
        total += opcao.preco_base;
      }
    }
    return total;
  };

  const linhas: {
    tipo: string;
    nome: string;
    descricao: string | null;
    produto_id: string | null;
    variacao_id: string | null;
    tamanho: string | null;
    preco_unit: number;
    quantidade: number;
    sabores: CartItem['sabores'] | null;
    adicionais: CartItem['adicionais'] | null;
  }[] = [];

  for (const item of input.itens) {
    if (!Number.isInteger(item.quantidade) || item.quantidade < 1 || item.quantidade > 50) {
      return { erro: 'Quantidade inválida em um item da sacola.' };
    }

    let precoUnit: number;

    if (item.tipo === 'produto') {
      const variacao = item.variacaoId ? variacoes.get(item.variacaoId) : undefined;
      if (
        !variacao ||
        !variacao.disponivel ||
        !variacao.produtos.disponivel ||
        variacao.produtos.pizzaria_id !== pizzaria.id ||
        variacao.produtos.id !== item.produtoId
      ) {
        return { erro: ERRO_ITEM_INDISPONIVEL };
      }
      const extras = precoAdicionais(item, variacao.tamanho);
      if (extras === null) return { erro: ERRO_ITEM_INDISPONIVEL };
      precoUnit = variacao.preco + extras;
    } else {
      const ids = (item.sabores ?? []).map((s) => s.produtoId);
      if (ids.length !== 2) return { erro: ERRO_ITEM_INDISPONIVEL };
      const precos: number[] = [];
      for (const id of ids) {
        const produto = sabores.get(id);
        if (!produto || !produto.disponivel || produto.pizzaria_id !== pizzaria.id) {
          return { erro: ERRO_ITEM_INDISPONIVEL };
        }
        const menor = menorPrecoDisponivel(produto.variacoes_produto);
        if (menor === null) return { erro: ERRO_ITEM_INDISPONIVEL };
        precos.push(menor);
      }
      precoUnit = precoMeiaMeia(precos[0], precos[1], configMeiaMeia);
    }

    linhas.push({
      tipo: item.tipo,
      nome: item.nome,
      descricao: item.descricao,
      produto_id: item.produtoId ?? null,
      variacao_id: item.variacaoId ?? null,
      tamanho: item.tamanho ?? null,
      preco_unit: arredondar(precoUnit),
      quantidade: item.quantidade,
      sabores: item.sabores ?? null,
      adicionais: item.adicionais ?? null,
    });
  }

  // 5. Totais
  const subtotal = arredondar(
    linhas.reduce((acc, l) => acc + l.preco_unit * l.quantidade, 0)
  );

  if (pizzaria.pedido_minimo != null && subtotal < pizzaria.pedido_minimo) {
    return {
      erro: `O pedido mínimo desta pizzaria é ${pizzaria.pedido_minimo.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })} (sem contar a entrega).`,
    };
  }

  let taxaEntrega = 0;
  if (input.modalidade === 'entrega') {
    const frete = calcularFrete(
      pizzaria.config_frete as ConfigFrete,
      endereco?.bairro ?? null,
      subtotal
    );
    if (!frete.entrega) {
      return { erro: frete.motivo ?? 'Não entregamos nesse endereço.' };
    }
    taxaEntrega = arredondar(frete.valor);
  }

  const taxaServico = calcularTaxaServico(
    pizzaria.config_taxa_servico as ConfigTaxaServico | null,
    subtotal
  );
  const total = arredondar(subtotal + taxaEntrega + taxaServico);

  // 6. Número sequencial por pizzaria (função SQL atômica)
  const { data: numero, error: errNumero } = await admin.rpc('proximo_numero_pedido', {
    p_pizzaria: pizzaria.id,
  });
  if (errNumero || typeof numero !== 'number') {
    return { erro: 'Erro ao registrar o pedido. Tente novamente.' };
  }

  // 7. Insere pedido + itens (INSERT é exclusivo do service-role — RLS bloqueia o client)
  const { data: pedido, error: errPedido } = await admin
    .from('pedidos')
    .insert({
      pizzaria_id: pizzaria.id,
      cliente_id: user.id,
      numero,
      modalidade: input.modalidade,
      nome_cliente: nome,
      telefone_cliente: telefone,
      endereco_entrega: endereco,
      observacao: input.observacao?.trim() || null,
      subtotal,
      taxa_entrega: taxaEntrega,
      taxa_servico: taxaServico,
      total,
      forma_pagamento: input.formaPagamento,
      metodo_pagamento_local: input.metodoPagamentoLocal,
    })
    .select('id')
    .single();

  if (errPedido || !pedido) {
    return { erro: 'Erro ao registrar o pedido. Tente novamente.' };
  }

  const { error: errItens } = await admin
    .from('itens_pedido')
    .insert(linhas.map((l) => ({ ...l, pedido_id: pedido.id })));

  if (errItens) {
    // rollback manual (supabase-js não tem transação entre duas chamadas)
    await admin.from('pedidos').delete().eq('id', pedido.id);
    return { erro: 'Erro ao registrar os itens do pedido. Tente novamente.' };
  }

  // 8. Extras best-effort: salvar endereço no caderninho do cliente
  if (input.salvarEndereco && endereco) {
    await admin.from('enderecos_cliente').insert({
      cliente_id: user.id,
      rua: endereco.rua,
      numero: endereco.numero,
      complemento: endereco.complemento || null,
      bairro: endereco.bairro,
      cidade: endereco.cidade || null,
      cep: endereco.cep || null,
      referencia: endereco.referencia || null,
    });
  }

  // Sucesso: página do pedido limpa o carrinho ao ver ?novo=1
  redirect(`/${input.slug}/conta/pedidos/${pedido.id}?novo=1`);
}
