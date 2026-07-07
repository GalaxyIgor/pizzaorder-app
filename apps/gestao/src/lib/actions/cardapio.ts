'use server';

// src/lib/actions/cardapio.ts
//
// CRUD do cardápio (categorias, produtos/variações, destaques, combos,
// grupos de adicionais). Todas as escritas: service-role + exigirStaff +
// verificação de posse (o registro pertence à pizzaria do slug — nas tabelas
// filhas, subindo até o pai: variação→produto→pizzaria, opção→grupo→pizzaria).

import { revalidatePath } from 'next/cache';
import { supabase as admin } from '@/lib/supabase';
import { exigirStaff } from '@/lib/staff';

export interface AcaoCardapioResult {
  erro?: string;
  /** id do registro criado/atualizado (para redirects do form) */
  id?: string;
}

function revalidarCardapio(slug: string) {
  // 'layout' cobre também as subpáginas (produtos/[id], adicionais, ...)
  revalidatePath(`/${slug}/cardapio`, 'layout');
}

async function categoriaDaPizzaria(categoriaId: string, pizzariaId: string): Promise<boolean> {
  const { data } = await admin
    .from('categorias')
    .select('id')
    .eq('id', categoriaId)
    .eq('pizzaria_id', pizzariaId)
    .maybeSingle();
  return !!data;
}

async function produtoDaPizzaria(produtoId: string, pizzariaId: string): Promise<boolean> {
  const { data } = await admin
    .from('produtos')
    .select('id')
    .eq('id', produtoId)
    .eq('pizzaria_id', pizzariaId)
    .maybeSingle();
  return !!data;
}

async function grupoDaPizzaria(grupoId: string, pizzariaId: string): Promise<boolean> {
  const { data } = await admin
    .from('grupos_adicionais')
    .select('id')
    .eq('id', grupoId)
    .eq('pizzaria_id', pizzariaId)
    .maybeSingle();
  return !!data;
}

// ============================================================
// CATEGORIAS
// ============================================================

export interface CategoriaInput {
  id?: string;
  nome: string;
  tipo: 'pizza' | 'bebida' | 'meia_meia' | 'sobremesa' | 'outro';
  ativo: boolean;
}

export async function salvarCategoria(
  slug: string,
  input: CategoriaInput
): Promise<AcaoCardapioResult> {
  const { pizzaria } = await exigirStaff(slug);

  const nome = input.nome?.trim();
  if (!nome) return { erro: 'Informe o nome da categoria.' };
  if (!['pizza', 'bebida', 'meia_meia', 'sobremesa', 'outro'].includes(input.tipo)) {
    return { erro: 'Tipo de categoria inválido.' };
  }

  if (input.id) {
    if (!(await categoriaDaPizzaria(input.id, pizzaria.id))) {
      return { erro: 'Categoria não encontrada.' };
    }
    const { error } = await admin
      .from('categorias')
      .update({ nome, tipo: input.tipo, ativo: input.ativo })
      .eq('id', input.id);
    if (error) {
      console.error('[salvarCategoria]', error.code, error.message);
      return { erro: 'Não foi possível salvar a categoria.' };
    }
    revalidarCardapio(slug);
    return { id: input.id };
  }

  // nova categoria entra no fim
  const { count } = await admin
    .from('categorias')
    .select('id', { count: 'exact', head: true })
    .eq('pizzaria_id', pizzaria.id);

  const { data, error } = await admin
    .from('categorias')
    .insert({ pizzaria_id: pizzaria.id, nome, tipo: input.tipo, ativo: input.ativo, ordem: count ?? 0 })
    .select('id')
    .single();
  if (error || !data) {
    console.error('[salvarCategoria]', error?.code, error?.message);
    return { erro: 'Não foi possível criar a categoria.' };
  }
  revalidarCardapio(slug);
  return { id: data.id };
}

export async function excluirCategoria(slug: string, id: string): Promise<AcaoCardapioResult> {
  const { pizzaria } = await exigirStaff(slug);
  if (!(await categoriaDaPizzaria(id, pizzaria.id))) return { erro: 'Categoria não encontrada.' };

  const { count } = await admin
    .from('produtos')
    .select('id', { count: 'exact', head: true })
    .eq('categoria_id', id);
  if ((count ?? 0) > 0) {
    return { erro: 'A categoria tem produtos — mova ou exclua os produtos antes.' };
  }

  const { error } = await admin.from('categorias').delete().eq('id', id);
  if (error) {
    console.error('[excluirCategoria]', error.code, error.message);
    return { erro: 'Não foi possível excluir a categoria.' };
  }
  revalidarCardapio(slug);
  return {};
}

export async function reordenarCategorias(slug: string, ids: string[]): Promise<AcaoCardapioResult> {
  const { pizzaria } = await exigirStaff(slug);
  for (let i = 0; i < ids.length; i++) {
    await admin
      .from('categorias')
      .update({ ordem: i })
      .eq('id', ids[i])
      .eq('pizzaria_id', pizzaria.id); // posse garantida no próprio update
  }
  revalidarCardapio(slug);
  return {};
}

// ============================================================
// PRODUTOS + VARIAÇÕES
// ============================================================

export interface VariacaoInput {
  id?: string;
  tamanho: string | null;
  preco: number;
  disponivel: boolean;
}

export interface ProdutoInput {
  id?: string;
  categoria_id: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  disponivel: boolean;
  /** lista FINAL desejada — o server faz o diff (update/insert/delete) */
  variacoes: VariacaoInput[];
}

export async function salvarProduto(slug: string, input: ProdutoInput): Promise<AcaoCardapioResult> {
  const { pizzaria } = await exigirStaff(slug);

  const nome = input.nome?.trim();
  if (!nome) return { erro: 'Informe o nome do produto.' };
  if (!(await categoriaDaPizzaria(input.categoria_id, pizzaria.id))) {
    return { erro: 'Categoria inválida.' };
  }
  if (input.variacoes.length === 0) {
    return { erro: 'Adicione ao menos uma variação com preço.' };
  }
  for (const v of input.variacoes) {
    if (!Number.isFinite(v.preco) || v.preco < 0) return { erro: 'Há uma variação com preço inválido.' };
  }

  const campos = {
    categoria_id: input.categoria_id,
    nome,
    descricao: input.descricao?.trim() || null,
    imagem_url: input.imagem_url?.trim() || null,
    disponivel: input.disponivel,
  };

  let produtoId = input.id;

  if (produtoId) {
    if (!(await produtoDaPizzaria(produtoId, pizzaria.id))) {
      return { erro: 'Produto não encontrado.' };
    }
    const { error } = await admin.from('produtos').update(campos).eq('id', produtoId);
    if (error) {
      console.error('[salvarProduto]', error.code, error.message);
      return { erro: 'Não foi possível salvar o produto.' };
    }
  } else {
    const { count } = await admin
      .from('produtos')
      .select('id', { count: 'exact', head: true })
      .eq('categoria_id', input.categoria_id);
    const { data, error } = await admin
      .from('produtos')
      .insert({ ...campos, pizzaria_id: pizzaria.id, ordem: count ?? 0 })
      .select('id')
      .single();
    if (error || !data) {
      console.error('[salvarProduto]', error?.code, error?.message);
      return { erro: 'Não foi possível criar o produto.' };
    }
    produtoId = data.id;
  }

  // diff das variações: a lista enviada é o estado final
  const { data: atuais } = await admin
    .from('variacoes_produto')
    .select('id')
    .eq('produto_id', produtoId);
  const idsAtuais = new Set((atuais ?? []).map((v) => v.id));
  const idsEnviados = new Set(input.variacoes.filter((v) => v.id).map((v) => v.id as string));

  for (const v of input.variacoes) {
    const linha = { tamanho: v.tamanho?.trim() || null, preco: v.preco, disponivel: v.disponivel };
    if (v.id && idsAtuais.has(v.id)) {
      const { error } = await admin
        .from('variacoes_produto')
        .update(linha)
        .eq('id', v.id)
        .eq('produto_id', produtoId);
      if (error) return { erro: 'Não foi possível salvar uma variação.' };
    } else {
      const { error } = await admin
        .from('variacoes_produto')
        .insert({ ...linha, produto_id: produtoId });
      if (error) return { erro: 'Não foi possível criar uma variação.' };
    }
  }
  const remover = [...idsAtuais].filter((id) => !idsEnviados.has(id));
  if (remover.length > 0) {
    await admin.from('variacoes_produto').delete().in('id', remover).eq('produto_id', produtoId);
  }

  revalidarCardapio(slug);
  return { id: produtoId };
}

export async function excluirProduto(slug: string, id: string): Promise<AcaoCardapioResult> {
  const { pizzaria } = await exigirStaff(slug);
  if (!(await produtoDaPizzaria(id, pizzaria.id))) return { erro: 'Produto não encontrado.' };

  // variações/destaques/combos caem por cascade; itens_pedido guarda snapshot
  const { error } = await admin.from('produtos').delete().eq('id', id);
  if (error) {
    console.error('[excluirProduto]', error.code, error.message);
    return { erro: 'Não foi possível excluir — tente desativar o produto.' };
  }
  revalidarCardapio(slug);
  return {};
}

export async function reordenarProdutos(
  slug: string,
  categoriaId: string,
  ids: string[]
): Promise<AcaoCardapioResult> {
  const { pizzaria } = await exigirStaff(slug);
  for (let i = 0; i < ids.length; i++) {
    await admin
      .from('produtos')
      .update({ ordem: i })
      .eq('id', ids[i])
      .eq('pizzaria_id', pizzaria.id)
      .eq('categoria_id', categoriaId);
  }
  revalidarCardapio(slug);
  return {};
}

// ============================================================
// DISPONIBILIDADE (toggle rápido)
// ============================================================

export type TabelaDisponibilidade = 'produtos' | 'variacoes_produto' | 'opcoes_adicionais';

export async function alternarDisponibilidade(
  slug: string,
  tabela: TabelaDisponibilidade,
  id: string,
  disponivel: boolean
): Promise<AcaoCardapioResult> {
  const { pizzaria } = await exigirStaff(slug);

  // posse: sobe até a pizzaria conforme a tabela
  let pertence = false;
  if (tabela === 'produtos') {
    pertence = await produtoDaPizzaria(id, pizzaria.id);
  } else if (tabela === 'variacoes_produto') {
    const { data } = await admin
      .from('variacoes_produto')
      .select('id, produtos!inner(pizzaria_id)')
      .eq('id', id)
      .eq('produtos.pizzaria_id', pizzaria.id)
      .maybeSingle();
    pertence = !!data;
  } else if (tabela === 'opcoes_adicionais') {
    const { data } = await admin
      .from('opcoes_adicionais')
      .select('id, grupos_adicionais!inner(pizzaria_id)')
      .eq('id', id)
      .eq('grupos_adicionais.pizzaria_id', pizzaria.id)
      .maybeSingle();
    pertence = !!data;
  } else {
    return { erro: 'Tabela inválida.' };
  }
  if (!pertence) return { erro: 'Registro não encontrado.' };

  const { error } = await admin.from(tabela).update({ disponivel }).eq('id', id);
  if (error) {
    console.error('[alternarDisponibilidade]', error.code, error.message);
    return { erro: 'Não foi possível atualizar. Tente novamente.' };
  }
  revalidarCardapio(slug);
  return {};
}

// ============================================================
// DESTAQUES (a lista enviada substitui a atual, na ordem dada)
// ============================================================

export async function salvarDestaques(slug: string, produtoIds: string[]): Promise<AcaoCardapioResult> {
  const { pizzaria } = await exigirStaff(slug);

  for (const id of produtoIds) {
    if (!(await produtoDaPizzaria(id, pizzaria.id))) return { erro: 'Produto inválido nos destaques.' };
  }

  const { error: errDel } = await admin.from('destaques').delete().eq('pizzaria_id', pizzaria.id);
  if (errDel) {
    console.error('[salvarDestaques]', errDel.code, errDel.message);
    return { erro: 'Não foi possível salvar os destaques.' };
  }
  if (produtoIds.length > 0) {
    const { error } = await admin.from('destaques').insert(
      produtoIds.map((produto_id, i) => ({
        pizzaria_id: pizzaria.id,
        produto_id,
        ordem: i,
        ativo: true,
      }))
    );
    if (error) {
      console.error('[salvarDestaques]', error.code, error.message);
      return { erro: 'Não foi possível salvar os destaques.' };
    }
  }
  revalidarCardapio(slug);
  return {};
}

// ============================================================
// COMBOS MEIA-MEIA
// ============================================================

export interface ComboInput {
  id?: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  produto1_id: string;
  produto2_id: string;
  ativo: boolean;
}

export async function salvarCombo(slug: string, input: ComboInput): Promise<AcaoCardapioResult> {
  const { pizzaria } = await exigirStaff(slug);

  const nome = input.nome?.trim();
  if (!nome) return { erro: 'Informe o nome do combo.' };
  if (!input.produto1_id || !input.produto2_id) return { erro: 'Escolha os dois sabores.' };
  if (input.produto1_id === input.produto2_id) return { erro: 'Escolha dois sabores diferentes.' };
  if (
    !(await produtoDaPizzaria(input.produto1_id, pizzaria.id)) ||
    !(await produtoDaPizzaria(input.produto2_id, pizzaria.id))
  ) {
    return { erro: 'Sabor inválido.' };
  }

  const campos = {
    nome,
    descricao: input.descricao?.trim() || null,
    imagem_url: input.imagem_url?.trim() || null,
    produto1_id: input.produto1_id,
    produto2_id: input.produto2_id,
    ativo: input.ativo,
  };

  if (input.id) {
    const { error } = await admin
      .from('combos_meia_meia')
      .update(campos)
      .eq('id', input.id)
      .eq('pizzaria_id', pizzaria.id);
    if (error) {
      console.error('[salvarCombo]', error.code, error.message);
      return { erro: 'Não foi possível salvar o combo.' };
    }
    revalidarCardapio(slug);
    return { id: input.id };
  }

  const { count } = await admin
    .from('combos_meia_meia')
    .select('id', { count: 'exact', head: true })
    .eq('pizzaria_id', pizzaria.id);
  const { data, error } = await admin
    .from('combos_meia_meia')
    .insert({ ...campos, pizzaria_id: pizzaria.id, ordem: count ?? 0 })
    .select('id')
    .single();
  if (error || !data) {
    console.error('[salvarCombo]', error?.code, error?.message);
    return { erro: 'Não foi possível criar o combo.' };
  }
  revalidarCardapio(slug);
  return { id: data.id };
}

export async function excluirCombo(slug: string, id: string): Promise<AcaoCardapioResult> {
  const { pizzaria } = await exigirStaff(slug);
  const { error } = await admin
    .from('combos_meia_meia')
    .delete()
    .eq('id', id)
    .eq('pizzaria_id', pizzaria.id);
  if (error) {
    console.error('[excluirCombo]', error.code, error.message);
    return { erro: 'Não foi possível excluir o combo.' };
  }
  revalidarCardapio(slug);
  return {};
}

// ============================================================
// GRUPOS DE ADICIONAIS (grupo + opções + preços por tamanho em diff)
// ============================================================

export interface OpcaoInput {
  id?: string;
  nome: string;
  preco_base: number;
  variar_por_tamanho: boolean;
  disponivel: boolean;
  /** usado quando variar_por_tamanho = true; substitui os preços atuais */
  precosPorTamanho: { tamanho: string; preco: number }[];
}

export interface GrupoAdicionaisInput {
  id?: string;
  categoria_id: string;
  nome: string;
  tipo: 'unica' | 'multipla';
  obrigatorio: boolean;
  min_selecoes: number;
  max_selecoes: number | null;
  ativo: boolean;
  /** lista FINAL desejada — o server faz o diff */
  opcoes: OpcaoInput[];
}

export async function salvarGrupoAdicionais(
  slug: string,
  input: GrupoAdicionaisInput
): Promise<AcaoCardapioResult> {
  const { pizzaria } = await exigirStaff(slug);

  const nome = input.nome?.trim();
  if (!nome) return { erro: 'Informe o nome do grupo.' };
  if (!['unica', 'multipla'].includes(input.tipo)) return { erro: 'Tipo de grupo inválido.' };
  if (!(await categoriaDaPizzaria(input.categoria_id, pizzaria.id))) {
    return { erro: 'Categoria inválida.' };
  }
  for (const o of input.opcoes) {
    if (!o.nome?.trim()) return { erro: 'Há uma opção sem nome.' };
    if (!Number.isFinite(o.preco_base) || o.preco_base < 0) {
      return { erro: `Preço inválido na opção "${o.nome}".` };
    }
    for (const p of o.precosPorTamanho) {
      if (!p.tamanho?.trim() || !Number.isFinite(p.preco) || p.preco < 0) {
        return { erro: `Preço por tamanho inválido na opção "${o.nome}".` };
      }
    }
  }

  const camposGrupo = {
    categoria_id: input.categoria_id,
    nome,
    tipo: input.tipo,
    obrigatorio: input.obrigatorio,
    min_selecoes: Math.max(0, Math.round(input.min_selecoes)),
    max_selecoes: input.max_selecoes == null ? null : Math.max(1, Math.round(input.max_selecoes)),
    ativo: input.ativo,
  };

  let grupoId = input.id;

  if (grupoId) {
    if (!(await grupoDaPizzaria(grupoId, pizzaria.id))) return { erro: 'Grupo não encontrado.' };
    const { error } = await admin.from('grupos_adicionais').update(camposGrupo).eq('id', grupoId);
    if (error) {
      console.error('[salvarGrupoAdicionais]', error.code, error.message);
      return { erro: 'Não foi possível salvar o grupo.' };
    }
  } else {
    const { count } = await admin
      .from('grupos_adicionais')
      .select('id', { count: 'exact', head: true })
      .eq('pizzaria_id', pizzaria.id);
    const { data, error } = await admin
      .from('grupos_adicionais')
      .insert({ ...camposGrupo, pizzaria_id: pizzaria.id, ordem: count ?? 0 })
      .select('id')
      .single();
    if (error || !data) {
      console.error('[salvarGrupoAdicionais]', error?.code, error?.message);
      return { erro: 'Não foi possível criar o grupo.' };
    }
    grupoId = data.id;
  }

  // diff das opções
  const { data: atuais } = await admin
    .from('opcoes_adicionais')
    .select('id')
    .eq('grupo_id', grupoId);
  const idsAtuais = new Set((atuais ?? []).map((o) => o.id));
  const idsEnviados = new Set(input.opcoes.filter((o) => o.id).map((o) => o.id as string));

  for (let i = 0; i < input.opcoes.length; i++) {
    const o = input.opcoes[i];
    const linha = {
      nome: o.nome.trim(),
      preco_base: o.preco_base,
      variar_por_tamanho: o.variar_por_tamanho,
      disponivel: o.disponivel,
      ordem: i,
    };

    let opcaoId = o.id && idsAtuais.has(o.id) ? o.id : null;
    if (opcaoId) {
      const { error } = await admin
        .from('opcoes_adicionais')
        .update(linha)
        .eq('id', opcaoId)
        .eq('grupo_id', grupoId);
      if (error) return { erro: `Não foi possível salvar a opção "${o.nome}".` };
    } else {
      const { data, error } = await admin
        .from('opcoes_adicionais')
        .insert({ ...linha, grupo_id: grupoId })
        .select('id')
        .single();
      if (error || !data) return { erro: `Não foi possível criar a opção "${o.nome}".` };
      opcaoId = data.id;
    }

    // preços por tamanho: substitui tudo (poucas linhas)
    await admin.from('precos_opcao_por_tamanho').delete().eq('opcao_id', opcaoId);
    if (o.variar_por_tamanho && o.precosPorTamanho.length > 0) {
      const { error } = await admin.from('precos_opcao_por_tamanho').insert(
        o.precosPorTamanho.map((p) => ({
          opcao_id: opcaoId,
          tamanho: p.tamanho.trim(),
          preco: p.preco,
        }))
      );
      if (error) return { erro: `Não foi possível salvar os preços da opção "${o.nome}".` };
    }
  }

  const remover = [...idsAtuais].filter((id) => !idsEnviados.has(id));
  if (remover.length > 0) {
    await admin.from('opcoes_adicionais').delete().in('id', remover).eq('grupo_id', grupoId);
  }

  revalidarCardapio(slug);
  return { id: grupoId };
}

export async function excluirGrupoAdicionais(slug: string, id: string): Promise<AcaoCardapioResult> {
  const { pizzaria } = await exigirStaff(slug);
  if (!(await grupoDaPizzaria(id, pizzaria.id))) return { erro: 'Grupo não encontrado.' };

  const { error } = await admin.from('grupos_adicionais').delete().eq('id', id);
  if (error) {
    console.error('[excluirGrupoAdicionais]', error.code, error.message);
    return { erro: 'Não foi possível excluir o grupo.' };
  }
  revalidarCardapio(slug);
  return {};
}
