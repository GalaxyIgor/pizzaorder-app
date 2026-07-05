// src/app/[slug]/cardapio/produtos/novo/page.tsx

import { supabase as admin } from '@/lib/supabase';
import { exigirStaff } from '@/lib/staff';
import { SubNavCardapio } from '@/components/cardapio/SubNavCardapio';
import { FormProduto } from '@/components/cardapio/FormProduto';
import type { CategoriaRow } from '@/types/gestao';

export default async function NovoProdutoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { pizzaria } = await exigirStaff(slug);

  const { data: categorias } = await admin
    .from('categorias')
    .select('id, nome, tipo, ordem, ativo')
    .eq('pizzaria_id', pizzaria.id)
    .order('ordem');

  const lista = (categorias ?? []) as CategoriaRow[];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <SubNavCardapio slug={slug} />
      {lista.length === 0 ? (
        <p className="text-sm text-creme-muted">Crie uma categoria antes de cadastrar produtos.</p>
      ) : (
        <FormProduto slug={slug} categorias={lista} produto={null} />
      )}
    </div>
  );
}
