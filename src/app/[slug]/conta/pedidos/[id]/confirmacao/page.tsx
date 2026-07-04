// src/app/[slug]/conta/pedidos/[id]/confirmacao/page.tsx
//
// Página de sucesso do checkout (destino do redirect de criarPedido com
// ?novo=1, que limpa o carrinho). Pagamento é na entrega/retirada, então o
// pedido já está confirmado aqui; o cliente escolhe como acompanhar.

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabase as admin } from '@/lib/supabase';
import { formatarPreco } from '@/lib/cardapio';
import { LimparCarrinho } from '@/components/conta/LimparCarrinho';
import { METODO_PAGAMENTO_LABEL, type PedidoDetalhe } from '@/types/pedido';

export default async function ConfirmacaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ novo?: string }>;
}) {
  const { slug, id } = await params;
  const { novo } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${slug}/entrar?redirect=${encodeURIComponent(`/${slug}/conta/pedidos/${id}/confirmacao`)}`);
  }

  // RLS garante que só o dono enxerga o pedido
  const { data: pedido } = await supabase
    .from('pedidos')
    .select('id, numero, modalidade, total, metodo_pagamento_local')
    .eq('id', id)
    .single();

  if (!pedido) notFound();

  const detalhe = pedido as Pick<
    PedidoDetalhe,
    'id' | 'numero' | 'modalidade' | 'total' | 'metodo_pagamento_local'
  >;

  // whatsapp pode ainda não existir no banco (supabase/whatsapp.sql pendente):
  // nesse caso cai no fallback só com o nome e o botão de WhatsApp não aparece.
  let pizzaria: { nome: string; whatsapp?: string | null } | null = null;
  const completo = await admin
    .from('pizzarias')
    .select('nome, whatsapp')
    .eq('slug', slug)
    .single();
  if (completo.error) {
    const soNome = await admin.from('pizzarias').select('nome').eq('slug', slug).single();
    pizzaria = soNome.data;
  } else {
    pizzaria = completo.data;
  }

  const pagamento = detalhe.metodo_pagamento_local
    ? `${METODO_PAGAMENTO_LABEL[detalhe.metodo_pagamento_local]} na ${
        detalhe.modalidade === 'entrega' ? 'entrega' : 'retirada'
      }`
    : null;

  const mensagemWhatsApp = encodeURIComponent(
    `Olá! Fiz o pedido #${detalhe.numero} pelo site e gostaria de acompanhar.`
  );

  return (
    <div className="max-w-full sm:max-w-md mx-auto p-4 py-8 min-h-dvh flex flex-col justify-center">
      <LimparCarrinho ativo={novo === '1'} />

      <div className="bg-white border border-borda-suave rounded-2xl p-6 shadow-sm text-center space-y-4">
        <span className="text-5xl" aria-hidden="true">
          ✅
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-carbono">
            Pedido #{detalhe.numero} confirmado!
          </h1>
          <p className="text-sm text-creme-muted mt-2">
            {pizzaria?.nome ?? 'A pizzaria'} já recebeu seu pedido e vai começar o preparo.
          </p>
          {pagamento && (
            <p className="text-sm text-creme-muted mt-1">
              Pagamento: <span className="font-semibold text-carbono">{pagamento}</span> —{' '}
              <span className="font-semibold text-carbono">{formatarPreco(detalhe.total)}</span>
            </p>
          )}
        </div>

        <div className="space-y-3 pt-2">
          <Link
            href={`/${slug}/conta/pedidos/${detalhe.id}`}
            className="block w-full bg-pomodoro hover:bg-pomodoro-hover text-white p-3 rounded-lg font-semibold text-sm transition-colors active:scale-[0.99]"
          >
            Acompanhar pelo site
          </Link>

          {pizzaria?.whatsapp && (
            <a
              href={`https://wa.me/${pizzaria.whatsapp}?text=${mensagemWhatsApp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-manjericao hover:bg-manjericao/90 text-white p-3 rounded-lg font-semibold text-sm transition-colors active:scale-[0.99]"
            >
              Acompanhar pelo WhatsApp
            </a>
          )}

          <Link
            href={`/${slug}`}
            className="block w-full p-3 rounded-lg border-2 border-borda-suave text-carbono font-semibold text-sm hover:bg-massa-bg transition-colors"
          >
            Voltar ao cardápio
          </Link>
        </div>
      </div>
    </div>
  );
}
