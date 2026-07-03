'use client';

// src/app/[slug]/checkout/page.tsx
//
// Checkout em etapas (rota dedicada — não modal, para sobreviver ao redirect
// de ida/volta do Mercado Pago na fase 4; o carrinho vive no localStorage).
// Os valores exibidos aqui são preview: a Server Action criarPedido recalcula
// tudo server-side antes de gravar.

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCardapio } from '@/contexts/CardapioContext';
import { useCart } from '@/contexts/CartContext';
import { createClient } from '@/lib/supabase/client';
import { criarPedido } from '@/lib/actions/pedidos';
import { arredondar, calcularFrete, calcularTaxaServico } from '@/lib/frete';
import { formatarPreco } from '@/lib/cardapio';
import { ModalidadeStep } from '@/components/checkout/ModalidadeStep';
import { EnderecoStep } from '@/components/checkout/EnderecoStep';
import { DadosStep } from '@/components/checkout/DadosStep';
import { PagamentoStep } from '@/components/checkout/PagamentoStep';
import { RevisaoStep } from '@/components/checkout/RevisaoStep';
import type {
  EnderecoEntrega,
  EnderecoSalvo,
  Modalidade,
  MetodoPagamentoLocal,
} from '@/types/pedido';

type Etapa = 'modalidade' | 'endereco' | 'dados' | 'pagamento' | 'revisao';

const ENDERECO_VAZIO: EnderecoEntrega = {
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  cep: '',
  referencia: '',
};

export default function CheckoutPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { pizzaria } = useCardapio();
  const { items, totalPrice } = useCart();

  // ------- estado do fluxo -------
  const [etapa, setEtapa] = useState<Etapa>('modalidade');
  const [modalidade, setModalidade] = useState<Modalidade | null>(null);
  const [endereco, setEndereco] = useState<EnderecoEntrega>(ENDERECO_VAZIO);
  const [salvarEndereco, setSalvarEndereco] = useState(false);
  const [enderecosSalvos, setEnderecosSalvos] = useState<EnderecoSalvo[]>([]);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamentoLocal | null>(null);
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // ------- dados do cliente logado (perfil + endereços salvos) -------
  useEffect(() => {
    const supabase = createClient();
    let cancelado = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelado) return; // proxy já redireciona deslogados
      setEmail(user.email ?? '');

      const [{ data: perfil }, { data: salvos }] = await Promise.all([
        supabase.from('perfis').select('nome, telefone').eq('id', user.id).single(),
        supabase
          .from('enderecos_cliente')
          .select('id, apelido, rua, numero, complemento, bairro, cidade, cep, referencia')
          .order('criado_em', { ascending: false }),
      ]);
      if (cancelado) return;
      if (perfil) {
        setNome((atual) => atual || perfil.nome);
        setTelefone((atual) => atual || (perfil.telefone ?? ''));
      }
      if (salvos) setEnderecosSalvos(salvos as EnderecoSalvo[]);
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  // ------- etapas visíveis + totais (preview; o server recalcula) -------
  const etapas = useMemo<Etapa[]>(
    () =>
      modalidade === 'entrega'
        ? ['modalidade', 'endereco', 'dados', 'pagamento', 'revisao']
        : ['modalidade', 'dados', 'pagamento', 'revisao'],
    [modalidade]
  );
  const etapaIdx = etapas.indexOf(etapa);

  const frete = useMemo(
    () =>
      modalidade === 'entrega'
        ? calcularFrete(pizzaria.config_frete, endereco.bairro || null, totalPrice)
        : null,
    [modalidade, pizzaria.config_frete, endereco.bairro, totalPrice]
  );
  const taxaEntrega = frete?.entrega ? frete.valor : 0;
  const taxaServico = calcularTaxaServico(pizzaria.config_taxa_servico, totalPrice);
  const total = arredondar(totalPrice + taxaEntrega + taxaServico);

  const abaixoDoMinimo =
    pizzaria.pedido_minimo != null && totalPrice < pizzaria.pedido_minimo;

  const podeAvancar = (() => {
    switch (etapa) {
      case 'modalidade':
        return modalidade !== null;
      case 'endereco':
        return (
          endereco.rua.trim() !== '' &&
          endereco.numero.trim() !== '' &&
          endereco.bairro.trim() !== '' &&
          frete?.entrega === true
        );
      case 'dados':
        return nome.trim() !== '' && telefone.trim() !== '';
      case 'pagamento':
        return metodoPagamento !== null;
      case 'revisao':
        return !abaixoDoMinimo && !pending;
    }
  })();

  const avancar = () => {
    setErro(null);
    if (etapaIdx < etapas.length - 1) setEtapa(etapas[etapaIdx + 1]);
  };
  const voltar = () => {
    setErro(null);
    if (etapaIdx > 0) setEtapa(etapas[etapaIdx - 1]);
  };

  const confirmar = () => {
    if (!modalidade || !metodoPagamento) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await criarPedido({
        slug,
        modalidade,
        endereco: modalidade === 'entrega' ? endereco : null,
        salvarEndereco,
        nome,
        telefone,
        observacao,
        formaPagamento: 'na_entrega',
        metodoPagamentoLocal: metodoPagamento,
        itens: items,
      });
      if (resultado?.erro) setErro(resultado.erro);
      // sucesso => redirect do server para /conta/pedidos/[id]?novo=1
    });
  };

  // Botão principal e avisos: renderizados 2x — rodapé fixo (mobile) e
  // resumo lateral (desktop) — por isso viram JSX compartilhado.
  const cta =
    etapa === 'revisao' ? (
      <button
        type="button"
        onClick={confirmar}
        disabled={!podeAvancar}
        className="w-full bg-pomodoro hover:bg-pomodoro-hover disabled:opacity-60 text-white p-4 rounded-lg font-semibold text-sm flex justify-between items-center shadow-lg transition-all active:scale-[0.99]"
      >
        <span>{pending ? 'Enviando pedido...' : 'Confirmar pedido'}</span>
        <span>{formatarPreco(total)}</span>
      </button>
    ) : (
      <button
        type="button"
        onClick={avancar}
        disabled={!podeAvancar}
        className="w-full bg-pomodoro hover:bg-pomodoro-hover disabled:opacity-60 text-white p-4 rounded-lg font-semibold text-sm shadow-lg transition-all active:scale-[0.99]"
      >
        Continuar
      </button>
    );

  const avisos = (
    <>
      {abaixoDoMinimo && etapa === 'revisao' && (
        <p className="text-sm text-pomodoro bg-pomodoro/5 border border-pomodoro/20 rounded-lg p-3">
          O pedido mínimo é {formatarPreco(pizzaria.pedido_minimo!)} (sem contar a entrega).
          Volte ao cardápio para adicionar mais itens.
        </p>
      )}
      {erro && (
        <p role="alert" className="text-sm text-pomodoro bg-pomodoro/5 border border-pomodoro/20 rounded-lg p-3">
          {erro}
        </p>
      )}
    </>
  );

  // ------- sacola vazia -------
  if (items.length === 0) {
    return (
      <div className="max-w-full sm:max-w-md mx-auto p-4 min-h-screen flex flex-col items-center justify-center gap-3 text-center">
        <span className="text-4xl">🛒</span>
        <p className="text-creme-muted">Sua sacola está vazia.</p>
        <Link
          href={`/${slug}`}
          className="bg-pomodoro hover:bg-pomodoro-hover text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          Ver cardápio
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-full sm:max-w-md md:max-w-3xl mx-auto p-4 min-h-screen pb-32 md:pb-8">
      {/* Cabeçalho */}
      <header className="py-4 flex items-center gap-3">
        {etapaIdx === 0 ? (
          <Link href={`/${slug}`} aria-label="Voltar ao cardápio" className="text-creme-muted hover:text-carbono text-xl">
            ←
          </Link>
        ) : (
          <button type="button" onClick={voltar} aria-label="Etapa anterior" className="text-creme-muted hover:text-carbono text-xl">
            ←
          </button>
        )}
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold text-carbono">Finalizar pedido</h1>
          <p className="text-xs text-creme-muted">{pizzaria.nome}</p>
        </div>
        <span className="text-xs text-creme-muted">
          {etapaIdx + 1}/{etapas.length}
        </span>
      </header>

      {/* Progresso */}
      <div className="flex gap-1.5 mb-6" aria-hidden="true">
        {etapas.map((e, i) => (
          <span
            key={e}
            className={`h-1 flex-1 rounded-full ${i <= etapaIdx ? 'bg-pomodoro' : 'bg-borda-suave'}`}
          />
        ))}
      </div>

      {/* md+: duas colunas — etapas à esquerda, resumo fixo à direita */}
      <div className="md:grid md:grid-cols-[minmax(0,1fr)_300px] md:gap-8 md:items-start">
        <div className="min-w-0">
          {/* Etapa atual */}
      {etapa === 'modalidade' && (
        <ModalidadeStep pizzaria={pizzaria} value={modalidade} onChange={setModalidade} />
      )}
      {etapa === 'endereco' && (
        <EnderecoStep
          endereco={endereco}
          onChange={(campo, valor) => setEndereco((atual) => ({ ...atual, [campo]: valor }))}
          salvarEndereco={salvarEndereco}
          onSalvarEnderecoChange={setSalvarEndereco}
          enderecosSalvos={enderecosSalvos}
          onUsarSalvo={(salvo) =>
            setEndereco({
              rua: salvo.rua,
              numero: salvo.numero,
              complemento: salvo.complemento ?? '',
              bairro: salvo.bairro,
              cidade: salvo.cidade ?? '',
              cep: salvo.cep ?? '',
              referencia: salvo.referencia ?? '',
            })
          }
          frete={endereco.bairro.trim() || frete?.entrega === false ? frete : null}
        />
      )}
      {etapa === 'dados' && (
        <DadosStep
          nome={nome}
          telefone={telefone}
          email={email}
          onNomeChange={setNome}
          onTelefoneChange={setTelefone}
        />
      )}
      {etapa === 'pagamento' && modalidade && (
        <PagamentoStep
          modalidade={modalidade}
          metodo={metodoPagamento}
          onMetodoChange={setMetodoPagamento}
        />
      )}
      {etapa === 'revisao' && modalidade && metodoPagamento && (
        <RevisaoStep
          itens={items}
          modalidade={modalidade}
          endereco={modalidade === 'entrega' ? endereco : null}
          nome={nome}
          telefone={telefone}
          metodoPagamento={metodoPagamento}
          observacao={observacao}
          onObservacaoChange={setObservacao}
          subtotal={totalPrice}
          taxaEntrega={taxaEntrega}
          taxaServico={taxaServico}
          total={total}
        />
      )}

          {/* Avisos no fluxo (mobile — o resumo lateral os repete no desktop) */}
          <div className="mt-4 space-y-3 md:hidden">{avisos}</div>
        </div>

        {/* Resumo lateral (só desktop) */}
        <aside className="hidden md:block md:sticky md:top-4 bg-white border border-borda-suave rounded-xl p-4 space-y-3">
          <h2 className="text-xs font-semibold text-creme-muted uppercase tracking-wide">
            Resumo do pedido
          </h2>
          <ul className="space-y-1.5 text-sm max-h-56 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between gap-2">
                <span className="text-carbono truncate">
                  {item.quantidade}× {item.nome}
                </span>
                <span className="text-creme-muted whitespace-nowrap">
                  {formatarPreco(item.precoUnit * item.quantidade)}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-borda-suave pt-3 text-sm space-y-1.5">
            <div className="flex justify-between text-creme-muted">
              <span>Subtotal</span>
              <span>{formatarPreco(totalPrice)}</span>
            </div>
            {modalidade === 'entrega' && frete?.entrega && (
              <div className="flex justify-between text-creme-muted">
                <span>Entrega</span>
                <span>{taxaEntrega === 0 ? 'Grátis' : formatarPreco(taxaEntrega)}</span>
              </div>
            )}
            {taxaServico > 0 && (
              <div className="flex justify-between text-creme-muted">
                <span>Taxa de serviço</span>
                <span>{formatarPreco(taxaServico)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-carbono pt-1.5 border-t border-borda-suave">
              <span>Total</span>
              <span>{formatarPreco(total)}</span>
            </div>
          </div>
          {avisos}
          {cta}
        </aside>
      </div>

      {/* Rodapé fixo (só mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-t from-massa-bg via-massa-bg/90 to-transparent p-4 flex justify-center z-40">
        <div className="w-full max-w-md">{cta}</div>
      </div>
    </div>
  );
}
