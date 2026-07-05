// src/app/[slug]/cardapio/produtos/[id]/page.tsx

import { notFound } from 'next/navigation';
import { supabase as admin } from '@/lib/supabase';
import { exigirStaff } from '@/lib/staff';
import { SubNavCardapio } from '@/components/cardapio/SubNavCardapio';
import { FormProduto } from '@/components/cardapio/FormProduto';
import type { CategoriaRow, ProdutoRow } from '@/types/gestao';

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const { pizzaria } = await exigirStaff(slug);

  const [{ data: categorias }, { data: produto }] = await Promise.all([
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
      .eq('id', id)
      .eq('pizzaria_id', pizzaria.id)
      .maybeSingle(),
  ]);

  if (!produto) notFound();

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <SubNavCardapio slug={slug} />
      <FormProduto
        slug={slug}
        categorias={(categorias ?? []) as CategoriaRow[]}
        produto={produto as unknown as ProdutoRow}
      />
    </div>
  );
}
