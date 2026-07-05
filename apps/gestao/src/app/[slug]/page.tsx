// src/app/[slug]/page.tsx — a home da gestão é o painel de pedidos ao vivo.

import { redirect } from 'next/navigation';

export default async function GestaoHome({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/${slug}/pedidos`);
}
