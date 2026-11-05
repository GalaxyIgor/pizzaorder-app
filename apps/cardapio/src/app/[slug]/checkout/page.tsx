// src/app/[slug]/checkout/page.tsx
//
// Busca no servidor os dados do cliente logado (perfil + endereços salvos)
// para o checkout já abrir preenchido. O fluxo em si é client-side
// (checkout-cliente.tsx). Deslogado não chega aqui: o proxy redireciona.

import { createClient } from '@/lib/supabase/server';
import { formatarTelefone } from '@/lib/telefone';
import type { EnderecoSalvo } from '@/types/pedido';
import { CheckoutCliente, type DadosClienteCheckout } from './checkout-cliente';

export default async function CheckoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const inicial: DadosClienteCheckout = {
    email: user?.email ?? '',
    nome: '',
    telefone: '',
    enderecosSalvos: [],
  };

  if (user) {
    const [{ data: perfil }, { data: salvos }] = await Promise.all([
      supabase.from('perfis').select('nome, telefone').eq('id', user.id).single(),
      supabase
        .from('enderecos_cliente')
        .select('id, apelido, rua, numero, complemento, bairro, cidade, cep, referencia')
        .order('criado_em', { ascending: false }),
    ]);
    if (perfil) {
      inicial.nome = perfil.nome ?? '';
      // perfis antigos podem ter o número sem máscara — normaliza na entrada
      inicial.telefone = formatarTelefone(perfil.telefone ?? '');
    }
    if (salvos) inicial.enderecosSalvos = salvos as EnderecoSalvo[];
  }

  return <CheckoutCliente inicial={inicial} />;
}
