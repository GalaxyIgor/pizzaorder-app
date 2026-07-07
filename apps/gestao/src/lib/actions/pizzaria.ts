'use server';

// src/lib/actions/pizzaria.ts
//
// Personalização do site do cardápio: edita o registro do tenant em
// `pizzarias`. Escrita service-role após exigirStaff, com validação
// server-side dos shapes (o form é só conveniência).

import { revalidatePath } from 'next/cache';
import type {
  ConfigFrete,
  ConfigMeiaMeia,
  ConfigTaxaServico,
  HorarioFuncionamento,
  MetodoPagamentoLocal,
} from '@pizzaorder/shared';
import { supabase as admin } from '@/lib/supabase';
import { exigirStaff } from '@/lib/staff';

export interface AcaoPizzariaResult {
  erro?: string;
}

const METODOS_VALIDOS: MetodoPagamentoLocal[] = ['dinheiro', 'cartao', 'pix'];

export interface PersonalizacaoInput {
  nome: string;
  logo_url: string | null;
  cor_primaria: string;
  whatsapp: string | null;
  endereco: string | null;
  descricao: string | null;
  aviso: string | null;
  aviso_ativo: boolean;
  instagram: string | null;
  metodos_pagamento: MetodoPagamentoLocal[];
  pedido_minimo: number | null;
  aceita_entrega: boolean;
  aceita_retirada: boolean;
  aceita_local: boolean;
  config_frete: ConfigFrete;
  config_taxa_servico: ConfigTaxaServico | null;
  config_meia_meia: ConfigMeiaMeia;
}

function numeroValido(n: unknown, minimo = 0): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= minimo;
}

function validarFrete(config: ConfigFrete): string | null {
  switch (config.tipo) {
    case 'gratis':
      return null;
    case 'fixo':
      return numeroValido(config.valorFixo) ? null : 'Informe o valor fixo do frete.';
    case 'preco_por_km':
      if (!numeroValido(config.valorPorKm)) return 'Informe o valor por km.';
      if (config.minimoFrete != null && !numeroValido(config.minimoFrete))
        return 'Frete mínimo inválido.';
      return null;
    case 'faixas_km': {
      const faixas = config.faixas ?? [];
      if (faixas.length === 0) return 'Adicione ao menos uma faixa de km.';
      for (const f of faixas) {
        if (!numeroValido(f.kmInicio) || !numeroValido(f.kmFim) || f.kmFim <= f.kmInicio)
          return 'Cada faixa precisa de km inicial menor que o final.';
        if (!numeroValido(f.valor)) return 'Valor de frete inválido em uma faixa.';
      }
      return null;
    }
    case 'por_bairro': {
      const bairros = config.bairros ?? [];
      if (bairros.length === 0) return 'Adicione ao menos um bairro.';
      for (const b of bairros) {
        if (!b.bairro?.trim()) return 'Há um bairro sem nome.';
        if (!numeroValido(b.valor)) return 'Valor de frete inválido em um bairro.';
      }
      return null;
    }
    default:
      return 'Tipo de frete desconhecido.';
  }
}

export async function salvarPersonalizacao(
  slug: string,
  dados: PersonalizacaoInput
): Promise<AcaoPizzariaResult> {
  const { pizzaria } = await exigirStaff(slug);

  const nome = dados.nome?.trim() ?? '';
  if (nome.length < 2) {
    return { erro: 'Informe o nome da pizzaria.' };
  }

  const cor = dados.cor_primaria?.trim() ?? '';
  if (!/^#[0-9a-fA-F]{6}$/.test(cor)) {
    return { erro: 'Cor primária inválida — use o formato #RRGGBB.' };
  }

  if (!dados.aceita_entrega && !dados.aceita_retirada && !dados.aceita_local) {
    return { erro: 'Ative pelo menos uma modalidade (entrega, retirada ou local).' };
  }

  const metodos = (dados.metodos_pagamento ?? []).filter((m) => METODOS_VALIDOS.includes(m));
  if (metodos.length === 0) {
    return { erro: 'Ative pelo menos um método de pagamento (dinheiro, cartão ou pix).' };
  }

  // guarda só o handle, com ou sem @ na digitação
  const instagram = dados.instagram?.trim().replace(/^@/, '').replace(/\s/g, '') || null;
  if (instagram && !/^[a-zA-Z0-9._]{1,30}$/.test(instagram)) {
    return { erro: 'Instagram inválido — use só o nome do perfil, ex.: minhapizzaria.' };
  }

  if (dados.pedido_minimo != null && !numeroValido(dados.pedido_minimo)) {
    return { erro: 'Pedido mínimo inválido.' };
  }

  const erroFrete = validarFrete(dados.config_frete);
  if (erroFrete) return { erro: erroFrete };
  if (
    dados.config_frete.gratisPedidoAcimaDe != null &&
    !numeroValido(dados.config_frete.gratisPedidoAcimaDe)
  ) {
    return { erro: 'Valor de "frete grátis acima de" inválido.' };
  }

  if (dados.config_taxa_servico) {
    const { tipo, valor } = dados.config_taxa_servico;
    if (tipo !== 'percentual' && tipo !== 'fixo') return { erro: 'Tipo de taxa inválido.' };
    if (!numeroValido(valor)) return { erro: 'Valor da taxa de serviço inválido.' };
  }

  const meia = dados.config_meia_meia;
  if (!['maior', 'menor', 'media', 'fixo'].includes(meia?.estrategia)) {
    return { erro: 'Estratégia de meia-meia inválida.' };
  }
  if (meia.estrategia === 'fixo' && !numeroValido(meia.precoFixo)) {
    return { erro: 'Informe o preço fixo da meia-meia.' };
  }

  const whatsapp = dados.whatsapp?.replace(/\D/g, '') || null;

  const { error } = await admin
    .from('pizzarias')
    .update({
      nome,
      logo_url: dados.logo_url?.trim() || null,
      cor_primaria: cor,
      whatsapp,
      endereco: dados.endereco?.trim() || null,
      descricao: dados.descricao?.trim() || null,
      aviso: dados.aviso?.trim() || null,
      aviso_ativo: dados.aviso_ativo && !!dados.aviso?.trim(),
      instagram,
      metodos_pagamento: metodos,
      pedido_minimo: dados.pedido_minimo,
      aceita_entrega: dados.aceita_entrega,
      aceita_retirada: dados.aceita_retirada,
      aceita_local: dados.aceita_local,
      config_frete: dados.config_frete,
      config_taxa_servico: dados.config_taxa_servico,
      config_meia_meia: dados.config_meia_meia,
    })
    .eq('id', pizzaria.id);

  if (error) {
    console.error('[salvarPersonalizacao]', error.code, error.message);
    return { erro: 'Não foi possível salvar. Tente novamente.' };
  }

  revalidatePath(`/${slug}/personalizacao`);
  return {};
}

const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export interface UploadLogoResult {
  erro?: string;
  url?: string;
}

/**
 * Sobe o logo para o bucket público `logos` (supabase/personalizacao.sql) e
 * devolve a URL. O form coloca a URL no campo e salva junto com o resto —
 * o upload não altera a pizzaria sozinho.
 */
export async function uploadLogo(slug: string, formData: FormData): Promise<UploadLogoResult> {
  const { pizzaria } = await exigirStaff(slug);

  const arquivo = formData.get('logo');
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { erro: 'Escolha uma imagem.' };
  }
  if (!arquivo.type.startsWith('image/')) {
    return { erro: 'O arquivo precisa ser uma imagem (PNG, JPG, WebP...).' };
  }
  if (arquivo.size > LOGO_MAX_BYTES) {
    return { erro: 'Imagem muito grande — o limite é 2MB.' };
  }

  const ext = arquivo.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  // nome com timestamp: troca de logo não esbarra no cache da URL anterior
  const caminho = `${pizzaria.id}/logo-${Date.now()}.${ext}`;

  const { error } = await admin.storage
    .from('logos')
    .upload(caminho, arquivo, { contentType: arquivo.type, upsert: true });

  if (error) {
    console.error('[uploadLogo]', error.message);
    return { erro: 'Não foi possível enviar a imagem. Tente novamente.' };
  }

  const { data } = admin.storage.from('logos').getPublicUrl(caminho);
  return { url: data.publicUrl };
}

const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function salvarHorario(
  slug: string,
  horario: HorarioFuncionamento | null
): Promise<AcaoPizzariaResult> {
  const { pizzaria } = await exigirStaff(slug);

  if (horario !== null) {
    for (const dia of Object.keys(horario)) {
      if (!/^[0-6]$/.test(dia)) return { erro: 'Dia da semana inválido.' };
      for (const faixa of horario[dia] ?? []) {
        if (!RE_HORA.test(faixa.abre) || !RE_HORA.test(faixa.fecha)) {
          return { erro: 'Horário inválido — use o formato HH:MM.' };
        }
        if (faixa.abre === faixa.fecha) {
          return { erro: 'Uma faixa não pode abrir e fechar no mesmo horário.' };
        }
      }
    }
  }

  const { error } = await admin
    .from('pizzarias')
    .update({ horario_funcionamento: horario })
    .eq('id', pizzaria.id);

  if (error) {
    console.error('[salvarHorario]', error.code, error.message);
    return { erro: 'Não foi possível salvar o horário. Tente novamente.' };
  }

  revalidatePath(`/${slug}/personalizacao`);
  return {};
}
