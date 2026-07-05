// src/app/[slug]/cardapio/page.tsx
//
// Itens do cardápio: categorias e produtos (com variações), incluindo os
// inativos — por isso a leitura é service-role, não a API pública do cardápio.

import { supabase as admin } from '@/lib/supabase';
import { exigirStaff } from '@/lib/staff';
import { SubNavCardapio } from '@/components/cardapio/SubNavCardapio';
import { GerirItens } from '@/components/cardapio/GerirItens';
import type { CategoriaRow, ProdutoRow } from '@/types/gestao';

export default async function CardapioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { pizzaria } = await exigirStaff(slug);

  const [{ data: categorias }, { data: produtos }] = await Promise.all([
    admin
      .from('categorias')
      .select('id, nome, tipo, ordem, ativo')
      .eq('pizzaria_id', pizzaria.id)
      .order('ordem'),
    admin
      .from('produtos')
      .select(
        'id, categoria_id, nome, descricao, imagem_url, ordem, disponivel, variacoes_produto (id, tamanho, preco, disponivel)'
      )
      .eq('pizzaria_id', pizzaria.id)
      .order('ordem'),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <SubNavCardapio slug={slug} />
      <GerirItens
        slug={slug}
        categorias={(categorias ?? []) as CategoriaRow[]}
        produtos={(produtos ?? []) as unknown as ProdutoRow[]}
      />
    </div>
  );
}
