// src/app/page.tsx
//
// Raiz: staff com 1 pizzaria vai direto ao painel; com várias, escolhe aqui;
// sem vínculo nenhum, orienta a falar com a gestão (com opção de sair).

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { vinculosDoUsuario } from '@/lib/staff';
import { signOut } from '@/lib/actions/auth';

export default async function EscolherPizzariaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const vinculos = await vinculosDoUsuario();
  if (vinculos.length === 1) redirect(`/${vinculos[0].pizzarias.slug}`);

  return (
    <div className="max-w-full sm:max-w-md mx-auto p-4 py-8 min-h-dvh flex flex-col justify-center">
      <div className="bg-white border border-borda-suave rounded-2xl p-6 shadow-sm space-y-4">
        {vinculos.length === 0 ? (
          <>
            <h1 className="font-display text-2xl font-bold text-carbono">Sem acesso</h1>
            <p className="text-sm text-creme-muted">
              Esta conta não está vinculada a nenhuma pizzaria. Fale com o responsável.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold text-carbono">Escolha a pizzaria</h1>
            <ul className="space-y-2">
              {vinculos.map((v) => (
                <li key={v.pizzaria_id}>
                  <Link
                    href={`/${v.pizzarias.slug}`}
                    className="block w-full p-4 rounded-lg border-2 border-borda-suave text-carbono font-semibold hover:border-pomodoro hover:text-pomodoro transition-colors"
                  >
                    {v.pizzarias.nome}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <form action={signOut}>
          <button
            type="submit"
            className="w-full p-3 rounded-lg text-sm text-creme-muted hover:text-carbono transition-colors"
          >
            Sair da conta
          </button>
        </form>
      </div>
    </div>
  );
}
