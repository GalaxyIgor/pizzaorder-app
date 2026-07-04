// src/lib/staff.ts
//
// Guard central da cozinha: toda page e Server Action passa por exigirStaff().
// O proxy é só UX; a autorização de verdade (vínculo em staff_pizzaria) é aqui.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabase as admin } from '@/lib/supabase';

export interface PizzariaCozinha {
  id: string;
  nome: string;
  slug: string;
  pedidos_pausados: boolean;
}

export interface StaffContext {
  userId: string;
  pizzaria: PizzariaCozinha;
}

/**
 * Garante usuário logado E vinculado à pizzaria do slug.
 * Redireciona para /login (deslogado) ou / (sem vínculo com este slug).
 */
export async function exigirStaff(slug: string): Promise<StaffContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: pizzaria } = await admin
    .from('pizzarias')
    .select('id, nome, slug, pedidos_pausados')
    .eq('slug', slug)
    .eq('ativo', true)
    .single();
  if (!pizzaria) redirect('/');

  const { data: vinculo } = await admin
    .from('staff_pizzaria')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('pizzaria_id', pizzaria.id)
    .maybeSingle();
  if (!vinculo) redirect('/');

  return { userId: user.id, pizzaria: pizzaria as PizzariaCozinha };
}

export interface VinculoStaff {
  pizzaria_id: string;
  papel: string;
  pizzarias: { nome: string; slug: string };
}

/** Vínculos do usuário logado (RLS staff_select_own) — usado no pós-login e na raiz. */
export async function vinculosDoUsuario(): Promise<VinculoStaff[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('staff_pizzaria')
    .select('pizzaria_id, papel, pizzarias (nome, slug)')
    .order('criado_em');
  return (data ?? []) as unknown as VinculoStaff[];
}
