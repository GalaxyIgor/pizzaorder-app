// src/app/[slug]/layout.tsx
//
// Casca comum do painel de gestão: exigirStaff + header com navegação.
// As pages revalidam auth por conta própria nas Server Actions.

import { exigirStaff } from '@/lib/staff';
import { HeaderGestao } from '@/components/HeaderGestao';

export default async function GestaoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { pizzaria } = await exigirStaff(slug);

  return (
    <div className="min-h-dvh flex flex-col">
      <HeaderGestao pizzaria={pizzaria} />
      <main className="flex-1 p-4 max-w-screen-2xl mx-auto w-full">{children}</main>
    </div>
  );
}
