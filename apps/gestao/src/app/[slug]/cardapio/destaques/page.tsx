// src/app/[slug]/cardapio/destaques/page.tsx
//
// Destaques do carrossel da home do cardápio.

import { supabase as admin } from '@/lib/supabase';
import { exigirStaff } from '@/lib/staff';
import { SubNavCardapio } from '@/components/cardapio/SubNavCardapio';
import { GerirDestaques } from '@/components/cardapio/GerirDestaques';
import type { DestaqueRow, ProdutoRow } from '@/types/gestao';

export default async function DestaquesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { pizzaria } = await exigirStaff(slug);

  const [{ data: produtos }, { data: destaques }] = await Promise.all([
    admin
      .from('produtos')
      .select(
        'id, categoria_id, nome, descricao, imagem_url, ordem, disponivel, variacoes_produto (id, tamanho, preco, disponivel)'
      )
      .eq('pizzaria_id', pizzaria.id)
      .order('ordem'),
    admin
      .from('destaques')
      .select('id, produto_id, ordem')
      .eq('pizzaria_id', pizzaria.id)
      .order('ordem'),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <SubNavCardapio slug={slug} />
      <GerirDestaques
        slug={slug}
        produtos={(produtos ?? []) as unknown as ProdutoRow[]}
        destaques={(destaques ?? []) as DestaqueRow[]}
      />
    </div>
  );
}
