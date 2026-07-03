'use server';

// src/lib/actions/auth.ts
//
// Server Actions de autenticação (Supabase Auth, email+senha), no formato
// esperado pelo useActionState: (estadoAnterior, formData) => novoEstado.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabase as supabaseAdmin } from '@/lib/supabase';

export interface AuthState {
  erro?: string;
  sucesso?: string;
}

/** Só permite redirects internos (evita open redirect via ?redirect=). */
function destinoSeguro(destino: string | null, fallback: string): string {
  if (destino && destino.startsWith('/') && !destino.startsWith('//')) return destino;
  return fallback;
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim();
  const senha = String(formData.get('senha') ?? '');
  const slug = String(formData.get('slug') ?? '');
  const redirectTo = destinoSeguro(formData.get('redirect') as string | null, `/${slug}`);

  if (!email || !senha) return { erro: 'Preencha email e senha.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) return { erro: 'Email ou senha inválidos.' };

  redirect(redirectTo);
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const nome = String(formData.get('nome') ?? '').trim();
  const telefone = String(formData.get('telefone') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const senha = String(formData.get('senha') ?? '');
  const slug = String(formData.get('slug') ?? '');
  const redirectTo = destinoSeguro(formData.get('redirect') as string | null, `/${slug}`);

  if (nome.length < 2) return { erro: 'Informe seu nome.' };
  if (!telefone) return { erro: 'Informe seu telefone (a pizzaria usa para contato).' };
  if (!email) return { erro: 'Informe seu email.' };
  if (senha.length < 6) return { erro: 'A senha precisa de pelo menos 6 caracteres.' };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password: senha });

  if (error) {
    if (error.code === 'user_already_exists') {
      return { erro: 'Já existe uma conta com esse email. Faça login.' };
    }
    if (error.code === 'email_address_invalid') {
      return { erro: 'Esse email não parece válido. Use um endereço real.' };
    }
    if (error.code === 'over_email_send_rate_limit') {
      return { erro: 'Limite de emails de confirmação atingido. Aguarde alguns minutos e tente de novo.' };
    }
    console.error('[signUp] Supabase Auth:', error.code, error.message);
    return { erro: 'Não foi possível criar a conta. Tente novamente.' };
  }

  // Cria o perfil via service-role: com confirmação de email ligada ainda não
  // existe sessão aqui, então o RLS owner-only não permitiria o insert.
  if (data.user) {
    const { error: errPerfil } = await supabaseAdmin
      .from('perfis')
      .upsert({ id: data.user.id, nome, telefone });
    if (errPerfil) {
      console.error('[signUp] insert perfis:', errPerfil.code, errPerfil.message);
      return { erro: 'Conta criada, mas houve um erro ao salvar o perfil.' };
    }
  }

  // Projeto com confirmação de email ligada: sem sessão até confirmar.
  if (!data.session) {
    return { sucesso: 'Conta criada! Confirme seu email e depois faça login.' };
  }

  redirect(redirectTo);
}

export async function signOut(slug: string): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${slug}`);
}
