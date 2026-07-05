'use server';

// src/lib/actions/auth.ts
//
// Login/logout do staff da gestão (Supabase Auth, email+senha, sem cadastro —
// contas são criadas manualmente por ora). Formato do useActionState.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { VinculoStaff } from '@/lib/staff';

export interface AuthState {
  erro?: string;
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim();
  const senha = String(formData.get('senha') ?? '');

  if (!email || !senha) return { erro: 'Preencha email e senha.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: 'Email ou senha inválidos.' };

  // Conta sem vínculo de staff não entra (evita cliente logar na gestão).
  // Importante: mesma instância do client — a sessão recém-criada vive nela,
  // um client novo neste mesmo request pode não enxergar o cookie ainda.
  const { data } = await supabase
    .from('staff_pizzaria')
    .select('pizzaria_id, papel, pizzarias (nome, slug)')
    .order('criado_em');
  const vinculos = (data ?? []) as unknown as VinculoStaff[];
  if (vinculos.length === 0) {
    await supabase.auth.signOut();
    return { erro: 'Esta conta não tem acesso à gestão. Fale com o responsável pela pizzaria.' };
  }

  // 1 pizzaria => direto ao painel; várias => a raiz lista para escolher.
  redirect(vinculos.length === 1 ? `/${vinculos[0].pizzarias.slug}` : '/');
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
