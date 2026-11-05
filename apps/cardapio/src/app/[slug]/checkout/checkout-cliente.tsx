'use client';

// src/app/[slug]/checkout/checkout-cliente.tsx
//
// Checkout em etapas (rota dedicada — não modal, para sobreviver ao redirect
// de ida/volta do Mercado Pago na fase 4; o carrinho vive no localStorage).
// Os valores exibidos aqui são preview: a Server Action criarPedido recalcula
// tudo server-side antes de gravar.
//
// Perfil e endereços salvos chegam prontos do page.tsx (server), em vez de
// um fetch no browser depois da hidratação.

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCardapio } from '@/contexts/CardapioContext';
import { useCart } from '@/contexts/CartContext';
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

const voltarClass =
  'w-11 h-11 -ml-2 flex items-center justify-center rounded-full text-xl text-creme-muted hover:text-carbono hover:bg-white transition-colors';

const ENDERECO_VAZIO: EnderecoEntrega = {
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  cep: '',
  referencia: '',
};

export interface DadosClienteCheckout {
  email: string;
  nome: string;
  telefone: string;
  enderecosSalvos: EnderecoSalvo[];
}

export function CheckoutCliente({ inicial }: { inicial: DadosClienteCheckout }) {
  const params = useParams();
  const slug = params.slug as string;
  const { pizzaria } = useCardapio();
  const { items, totalPrice } = useCart();

  // Loja com uma única modalidade: já vem escolhida e o cliente começa na
  // etapa seguinte (um toque a menos).
  const modalidadesAceitas = (['entrega', 'retirada', 'local'] as const).filter(
    (m) =>
      (m === 'entrega' && pizzaria.aceita_entrega) ||
      (m === 'retirada' && pizzaria.aceita_retirada) ||
      (m === 'local' && pizzaria.aceita_local)
  );
  const modalidadeUnica = modalidadesAceitas.length === 1 ? modalidadesAceitas[0] : null;

  // ------- estado do fluxo -------
  const [modalidade, setModalidade] = useState<Modalidade | null>(modalidadeUnica);
  const [etapa, setEtapa] = useState<Etapa>(() =>
    modalidadeUnica === null ? 'modalidade' : modalidadeUnica === 'entrega' ? 'endereco' : 'dados'
  );
  const [endereco, setEndereco] = useState<EnderecoEntrega>(ENDERECO_VAZIO);
  const [salvarEndereco, setSalvarEndereco] = useState(false);
  const enderecosSalvos = inicial.enderecosSalvos;
  const [nome, setNome] = useState(inicial.nome);
  const [telefone, setTelefone] = useState(inicial.telefone);
  const email = inicial.email;
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamentoLocal | null>(null);
  const [trocoPara, setTrocoPara] = useState('');
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  // Falha ao confirmar o pedido (retorno de criarPedido): vira tela cheia,
  // diferente dos avisos inline das etapas intermediárias.
  const [falha, setFalha] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

  // "troco para" digitado (aceita vírgula); null = vazio/não precisa
  const trocoNumero = (() => {
    const t = trocoPara.trim().replace(',', '.');
    if (t === '') return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  })();

  const abaixoDoMinimo =
    pizzaria.pedido_minimo != null && totalPrice < pizzaria.pedido_minimo;
  // Aviso em todas as etapas; o bloqueio de verdade é server-side (criarPedido).
  const lojaPausada = pizzaria.pedidos_pausados;

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
        // troco preenchido precisa cobrir o total (vazio = não precisa de troco)
        return (
          metodoPagamento !== null &&
          (metodoPagamento !== 'dinheiro' || trocoNumero === null || trocoNumero >= total)
        );
      case 'revisao':
        return !abaixoDoMinimo && !lojaPausada && !pending;
    }
  })();

  // Por que o "Continuar" está bloqueado — mostrado junto do botão para o
  // cliente não ficar adivinhando.
  const motivoBloqueio = (() => {
    if (podeAvancar || pending) return null;
    switch (etapa) {
      case 'modalidade':
        return 'Escolha como quer receber o pedido.';
      case 'endereco':
        if (!endereco.rua.trim() || !endereco.numero.trim() || !endereco.bairro.trim())
          return 'Preencha rua, número e bairro.';
        return 'Este endereço está fora da área de entrega.';
      case 'dados':
        return 'Informe seu nome e telefone.';
      case 'pagamento':
        if (!metodoPagamento) return 'Escolha a forma de pagamento.';
        return `O troco precisa ser de pelo menos ${formatarPreco(total)}.`;
      case 'revisao':
        return null; // avisos próprios (loja pausada / pedido mínimo)
    }
  })();

  // Ao trocar de etapa, o foco vai para o título dela (leitor de tela anuncia
  // a nova etapa e o teclado não fica preso no botão que sumiu).
  const etapaRef = useRef<HTMLDivElement>(null);
  const primeiraEtapa = useRef(true);
  useEffect(() => {
    if (primeiraEtapa.current) {
      primeiraEtapa.current = false;
      return;
    }
    etapaRef.current?.querySelector<HTMLElement>('h2')?.focus();
    window.scrollTo({ top: 0 });
  }, [etapa]);

  const avancar = () => {
    setErro(null);
    if (etapaIdx < etapas.length - 1) setEtapa(etapas[etapaIdx + 1]);
  };

  // Escolher a modalidade já avança (etapa de uma pergunta só).
  const escolherModalidade = (m: Modalidade) => {
    setErro(null);
    setModalidade(m);
    setEtapa(m === 'entrega' ? 'endereco' : 'dados');
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
        trocoPara: metodoPagamento === 'dinheiro' ? trocoNumero : null,
        itens: items,
      });
      if (resultado?.erro) setFalha(resultado.erro);
      // sucesso => redirect do server para /conta/pedidos/[id]/confirmacao?novo=1
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
        className="w-full bg-pomodoro hover:bg-pomodoro-hover disabled:opacity-60 text-white p-4 rounded-lg font-semibold text-sm flex justify-between items-center shadow-lg transition active:scale-[0.99]"
      >
        <span>{pending ? 'Enviando pedido…' : 'Confirmar pedido'}</span>
        <span className="tabular-nums">{formatarPreco(total)}</span>
      </button>
    ) : (
      <button
        type="button"
        onClick={avancar}
        disabled={!podeAvancar}
        className="w-full bg-pomodoro hover:bg-pomodoro-hover disabled:opacity-60 text-white p-4 rounded-lg font-semibold text-sm shadow-lg transition active:scale-[0.99]"
      >
        Continuar
      </button>
    );

  const dicaBloqueio = motivoBloqueio && (
    <p className="text-xs text-carbono/80 text-center" aria-live="polite">
      {motivoBloqueio}
    </p>
  );

  const avisos = (
    <>
      {lojaPausada && (
        <p className="text-sm text-carbono bg-ouro/15 border border-ouro/40 rounded-lg p-3">
          {pizzaria.nome} está sem aceitar pedidos no momento. Tente novamente mais tarde.
        </p>
      )}
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

  // ------- falha ao confirmar o pedido (tela cheia) -------
  if (falha) {
    return (
      <div className="max-w-full sm:max-w-md mx-auto p-4 py-8 min-h-dvh flex flex-col justify-center">
        <div className="bg-white border border-borda-suave rounded-2xl p-6 shadow-sm text-center space-y-4">
          <span className="text-5xl" aria-hidden="true">
            😕
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold text-carbono">
              Não conseguimos concluir seu pedido
            </h1>
            <p role="alert" className="text-sm text-pomodoro bg-pomodoro/5 border border-pomodoro/20 rounded-lg p-3 mt-3">
              {falha}
            </p>
            <p className="text-sm text-creme-muted mt-3">
              Nada foi cobrado. Você pode tentar de novo ou revisar a sacola no cardápio.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={() => setFalha(null)}
              className="block w-full bg-pomodoro hover:bg-pomodoro-hover text-white p-3 rounded-lg font-semibold text-sm transition-colors active:scale-[0.99] cursor-pointer"
            >
              Tentar novamente
            </button>
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

  // ------- sacola vazia -------
  if (items.length === 0) {
    return (
      <div className="max-w-full sm:max-w-md mx-auto p-4 min-h-screen flex flex-col items-center justify-center gap-3 text-center">
        <span className="text-4xl" aria-hidden="true">🛒</span>
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
    <div className="max-w-full sm:max-w-md md:max-w-3xl lg:max-w-4xl mx-auto p-4 sm:p-6 min-h-screen pb-32 md:pb-8">
      {/* Cabeçalho */}
      <header className="py-4 flex items-center gap-3">
        {etapaIdx === 0 ? (
          <Link href={`/${slug}`} aria-label="Voltar ao cardápio" className={voltarClass}>
            <span aria-hidden="true">←</span>
          </Link>
        ) : (
          <button type="button" onClick={voltar} aria-label="Etapa anterior" className={voltarClass}>
            <span aria-hidden="true">←</span>
          </button>
        )}
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold text-carbono">Finalizar pedido</h1>
          <p className="text-xs text-creme-muted">{pizzaria.nome}</p>
        </div>
        <span className="text-xs text-creme-muted tabular-nums" aria-label={`Etapa ${etapaIdx + 1} de ${etapas.length}`}>
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
      <div className="md:grid md:grid-cols-[minmax(0,1fr)_300px] lg:grid-cols-[minmax(0,1fr)_340px] md:gap-8 md:items-start">
        <div className="min-w-0" ref={etapaRef}>
          {/* Etapa atual */}
      {etapa === 'modalidade' && (
        <ModalidadeStep pizzaria={pizzaria} value={modalidade} onChange={escolherModalidade} />
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
          configFrete={pizzaria.config_frete}
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
          metodosAceitos={pizzaria.metodos_pagamento ?? []}
          metodo={metodoPagamento}
          onMetodoChange={setMetodoPagamento}
          trocoPara={trocoPara}
          onTrocoChange={setTrocoPara}
          total={total}
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
          trocoPara={metodoPagamento === 'dinheiro' ? trocoNumero : null}
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
              <span className="tabular-nums">{formatarPreco(totalPrice)}</span>
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
              <span className="tabular-nums">{formatarPreco(total)}</span>
            </div>
          </div>
          {avisos}
          {cta}
          {dicaBloqueio}
        </aside>
      </div>

      {/* Rodapé fixo (só mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-linear-to-t from-massa-bg via-massa-bg/90 to-transparent p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex justify-center z-40">
        <div className="w-full max-w-md space-y-2">
          {dicaBloqueio}
          {cta}
        </div>
      </div>
    </div>
  );
}
