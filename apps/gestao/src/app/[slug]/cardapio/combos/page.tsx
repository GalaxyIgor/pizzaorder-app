// src/app/[slug]/cardapio/combos/page.tsx
//
// Combos sugeridos de meia-meia (vitrine "Meia Meia" do cardápio).

import { supabase as admin } from '@/lib/supabase';
import { exigirStaff } from '@/lib/staff';
import { SubNavCardapio } from '@/components/cardapio/SubNavCardapio';
import { GerirCombos } from '@/components/cardapio/GerirCombos';
import type { CategoriaRow, ComboRow, ProdutoRow } from '@/types/gestao';

export default async function CombosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { pizzaria } = await exigirStaff(slug);

  const [{ data: categorias }, { data: produtos }, { data: combos }] = await Promise.all([
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
    admin
      .from('combos_meia_meia')
      .select('id, nome, descricao, imagem_url, ordem, ativo, produto1_id, produto2_id')
      .eq('pizzaria_id', pizzaria.id)
      .order('ordem'),
  ]);

  // só faz sentido montar meia-meia com produtos de categoria tipo pizza
  const categoriasPizza = new Set(
    ((categorias ?? []) as CategoriaRow[]).filter((c) => c.tipo === 'pizza').map((c) => c.id)
  );
  const pizzas = ((produtos ?? []) as unknown as ProdutoRow[]).filter((p) =>
    categoriasPizza.has(p.categoria_id)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <SubNavCardapio slug={slug} />
      <GerirCombos slug={slug} pizzas={pizzas} combos={(combos ?? []) as ComboRow[]} />
    </div>
  );
}
