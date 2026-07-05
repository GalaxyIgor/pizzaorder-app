// src/app/[slug]/cardapio/adicionais/page.tsx
//
// Grupos de adicionais (borda, extras) com opções e preços por tamanho.

import { supabase as admin } from '@/lib/supabase';
import { exigirStaff } from '@/lib/staff';
import { SubNavCardapio } from '@/components/cardapio/SubNavCardapio';
import { GerirAdicionais } from '@/components/cardapio/GerirAdicionais';
import type { CategoriaRow, GrupoRow } from '@/types/gestao';

export default async function AdicionaisPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { pizzaria } = await exigirStaff(slug);

  const [{ data: categorias }, { data: grupos }] = await Promise.all([
    admin
      .from('categorias')
      .select('id, nome, tipo, ordem, ativo')
      .eq('pizzaria_id', pizzaria.id)
      .order('ordem'),
    admin
      .from('grupos_adicionais')
      .select(
        'id, categoria_id, nome, tipo, obrigatorio, min_selecoes, max_selecoes, ordem, ativo, opcoes_adicionais (id, nome, preco_base, variar_por_tamanho, disponivel, ordem, precos_opcao_por_tamanho (tamanho, preco))'
      )
      .eq('pizzaria_id', pizzaria.id)
      .order('ordem'),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <SubNavCardapio slug={slug} />
      <GerirAdicionais
        slug={slug}
        categorias={(categorias ?? []) as CategoriaRow[]}
        grupos={(grupos ?? []) as unknown as GrupoRow[]}
      />
    </div>
  );
}
