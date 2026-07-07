// src/app/[slug]/personalizacao/page.tsx
//
// Personalização do site do cardápio: identidade, modalidades, frete, taxas,
// meia-meia e horário de funcionamento. Leitura via service-role (o layout já
// validou o staff; as actions revalidam de novo).

import type {
  ConfigFrete,
  ConfigMeiaMeia,
  ConfigTaxaServico,
  HorarioFuncionamento,
  MetodoPagamentoLocal,
} from '@pizzaorder/shared';
import { supabase as admin } from '@/lib/supabase';
import { exigirStaff } from '@/lib/staff';
import { FormPersonalizacao } from '@/components/personalizacao/FormPersonalizacao';
import { FormHorario } from '@/components/personalizacao/FormHorario';

export interface PizzariaConfig {
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
  horario_funcionamento: HorarioFuncionamento | null;
}

export default async function PersonalizacaoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { pizzaria } = await exigirStaff(slug);

  const { data } = await admin
    .from('pizzarias')
    .select(
      'nome, logo_url, cor_primaria, whatsapp, endereco, descricao, aviso, aviso_ativo, instagram, metodos_pagamento, pedido_minimo, aceita_entrega, aceita_retirada, aceita_local, config_frete, config_taxa_servico, config_meia_meia, horario_funcionamento'
    )
    .eq('id', pizzaria.id)
    .single();

  const config = data as PizzariaConfig | null;
  if (!config) {
    return <p className="text-sm text-creme-muted">Não foi possível carregar a configuração.</p>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <FormPersonalizacao slug={slug} inicial={config} />
      <FormHorario slug={slug} inicial={config.horario_funcionamento} />
    </div>
  );
}
