// src/app/[slug]/conta/pedidos/page.tsx
//
// "Meus pedidos": lista RLS-scoped (o cliente só enxerga os próprios),
// filtrada pela pizzaria do slug.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatarPreco } from '@/lib/cardapio';
import { StatusBadge } from '@/components/conta/StatusBadge';
import { PedidoStatusLive } from '@/components/conta/PedidoStatusLive';
import { MODALIDADE_LABEL, type PedidoResumo } from '@/types/pedido';

export default async function MeusPedidosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${slug}/entrar?redirect=${encodeURIComponent(`/${slug}/conta/pedidos`)}`);

  const { data: pizzaria } = await supabase
    .from('pizzarias')
    .select('id, nome')
    .eq('slug', slug)
    .single();

  const { data: pedidos } = pizzaria
    ? await supabase
        .from('pedidos')
        .select('id, numero, status, modalidade, total, criado_em')
        .eq('pizzaria_id', pizzaria.id)
        .order('criado_em', { ascending: false })
    : { data: [] };

  const lista = (pedidos ?? []) as PedidoResumo[];

  return (
    <div className="max-w-full sm:max-w-md md:max-w-2xl lg:max-w-4xl mx-auto p-4 sm:p-6 min-h-screen">
      {/* status dos pedidos muda ao vivo conforme a cozinha trabalha */}
      <PedidoStatusLive filtro={`cliente_id=eq.${user.id}`} />
      <header className="py-4 flex items-center gap-3">
        <Link href={`/${slug}`} aria-label="Voltar ao cardápio" className="text-creme-muted hover:text-carbono text-xl">
          ←
        </Link>
        <div>
          <h1 className="font-display text-xl font-bold text-carbono">Meus pedidos</h1>
          {pizzaria && <p className="text-xs text-creme-muted">{pizzaria.nome}</p>}
        </div>
      </header>

      {lista.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <span className="text-4xl">🧾</span>
          <p className="text-creme-muted">Você ainda não fez nenhum pedido aqui.</p>
          <Link
            href={`/${slug}`}
            className="bg-pomodoro hover:bg-pomodoro-hover text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Ver cardápio
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {lista.map((pedido) => (
            <li key={pedido.id}>
              <Link
                href={`/${slug}/conta/pedidos/${pedido.id}`}
                className="block h-full bg-white border border-borda-suave rounded-xl p-4 hover:border-creme-muted transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-sm text-carbono">Pedido #{pedido.numero}</span>
                  <StatusBadge status={pedido.status} modalidade={pedido.modalidade} />
                </div>
                <div className="flex items-center justify-between gap-3 mt-2 text-xs text-creme-muted">
                  <span>
                    {MODALIDADE_LABEL[pedido.modalidade]} ·{' '}
                    {new Date(pedido.criado_em).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="font-semibold text-carbono">{formatarPreco(pedido.total)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
