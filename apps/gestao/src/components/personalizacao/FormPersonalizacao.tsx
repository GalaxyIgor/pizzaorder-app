'use client';

// src/components/personalizacao/FormPersonalizacao.tsx
//
// Formulário de identidade + modalidades + frete + taxas + meia-meia.
// Números ficam como string no estado (aceitando vírgula) e são convertidos
// no submit; a validação de verdade é server-side (salvarPersonalizacao).

import { useRef, useState, useTransition } from 'react';
import type {
  BairroFrete,
  ConfigFrete,
  EstrategiaMeiaMeia,
  FaixaKm,
  MetodoPagamentoLocal,
  TipoFrete,
  TipoTaxaServico,
} from '@pizzaorder/shared';
import { METODO_PAGAMENTO_LABEL } from '@pizzaorder/shared';
import { salvarPersonalizacao, uploadLogo } from '@/lib/actions/pizzaria';
import type { PizzariaConfig } from '@/app/[slug]/personalizacao/page';

const METODOS: MetodoPagamentoLocal[] = ['dinheiro', 'cartao', 'pix'];

const TIPO_FRETE_LABEL: Record<TipoFrete, string> = {
  faixas_km: 'Por faixas de km',
  preco_por_km: 'Preço por km',
  por_bairro: 'Por bairro',
  fixo: 'Valor fixo',
  gratis: 'Grátis',
};

function numeroOuNull(s: string): number | null {
  const t = s.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function str(n: number | null | undefined): string {
  return n == null ? '' : String(n);
}

interface FaixaStr {
  kmInicio: string;
  kmFim: string;
  valor: string;
}

interface BairroStr {
  bairro: string;
  valor: string;
}

export function FormPersonalizacao({
  slug,
  inicial,
}: {
  slug: string;
  inicial: PizzariaConfig;
}) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  // identidade
  const [nome, setNome] = useState(inicial.nome);
  const [logoUrl, setLogoUrl] = useState(inicial.logo_url ?? '');
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const inputLogoRef = useRef<HTMLInputElement>(null);
  const [cor, setCor] = useState(inicial.cor_primaria || '#e63946');
  const [whatsapp, setWhatsapp] = useState(inicial.whatsapp ?? '');
  const [endereco, setEndereco] = useState(inicial.endereco ?? '');
  const [descricao, setDescricao] = useState(inicial.descricao ?? '');
  const [instagram, setInstagram] = useState(inicial.instagram ?? '');
  const [pedidoMinimo, setPedidoMinimo] = useState(str(inicial.pedido_minimo));

  // aviso temporário na home do cardápio
  const [aviso, setAviso] = useState(inicial.aviso ?? '');
  const [avisoAtivo, setAvisoAtivo] = useState(inicial.aviso_ativo);

  // métodos de pagamento aceitos no "pagar na entrega/retirada"
  const [metodos, setMetodos] = useState<MetodoPagamentoLocal[]>(
    inicial.metodos_pagamento?.length ? inicial.metodos_pagamento : [...METODOS]
  );

  const alternarMetodo = (m: MetodoPagamentoLocal, marcado: boolean) => {
    setMetodos((atuais) => (marcado ? [...atuais, m] : atuais.filter((x) => x !== m)));
  };

  const enviarLogo = (arquivo: File | null) => {
    if (!arquivo) return;
    setErro(null);
    setEnviandoLogo(true);
    const fd = new FormData();
    fd.set('logo', arquivo);
    uploadLogo(slug, fd)
      .then((r) => {
        if (r.erro) setErro(r.erro);
        else if (r.url) setLogoUrl(r.url);
      })
      .finally(() => {
        setEnviandoLogo(false);
        if (inputLogoRef.current) inputLogoRef.current.value = '';
      });
  };

  // modalidades
  const [aceitaEntrega, setAceitaEntrega] = useState(inicial.aceita_entrega);
  const [aceitaRetirada, setAceitaRetirada] = useState(inicial.aceita_retirada);
  const [aceitaLocal, setAceitaLocal] = useState(inicial.aceita_local);

  // frete
  const frete = inicial.config_frete ?? { tipo: 'gratis' };
  const [tipoFrete, setTipoFrete] = useState<TipoFrete>(frete.tipo ?? 'gratis');
  const [valorFixo, setValorFixo] = useState(str(frete.valorFixo));
  const [valorPorKm, setValorPorKm] = useState(str(frete.valorPorKm));
  const [minimoFrete, setMinimoFrete] = useState(str(frete.minimoFrete));
  const [gratisAcima, setGratisAcima] = useState(str(frete.gratisPedidoAcimaDe));
  const [faixas, setFaixas] = useState<FaixaStr[]>(
    (frete.faixas ?? []).map((f) => ({
      kmInicio: str(f.kmInicio),
      kmFim: str(f.kmFim),
      valor: str(f.valor),
    }))
  );
  const [bairros, setBairros] = useState<BairroStr[]>(
    (frete.bairros ?? []).map((b) => ({ bairro: b.bairro, valor: str(b.valor) }))
  );

  // taxa de serviço
  const [temTaxa, setTemTaxa] = useState(inicial.config_taxa_servico != null);
  const [tipoTaxa, setTipoTaxa] = useState<TipoTaxaServico>(
    inicial.config_taxa_servico?.tipo ?? 'percentual'
  );
  const [valorTaxa, setValorTaxa] = useState(str(inicial.config_taxa_servico?.valor));

  // meia-meia
  const [estrategia, setEstrategia] = useState<EstrategiaMeiaMeia>(
    inicial.config_meia_meia?.estrategia ?? 'maior'
  );
  const [precoFixoMeia, setPrecoFixoMeia] = useState(str(inicial.config_meia_meia?.precoFixo));

  const montarFrete = (): ConfigFrete => {
    const base: ConfigFrete = { tipo: tipoFrete };
    const gratis = numeroOuNull(gratisAcima);
    if (gratis != null) base.gratisPedidoAcimaDe = gratis;
    if (tipoFrete === 'fixo') base.valorFixo = numeroOuNull(valorFixo) ?? undefined;
    if (tipoFrete === 'preco_por_km') {
      base.valorPorKm = numeroOuNull(valorPorKm) ?? undefined;
      const min = numeroOuNull(minimoFrete);
      if (min != null) base.minimoFrete = min;
    }
    if (tipoFrete === 'faixas_km') {
      base.faixas = faixas.map(
        (f): FaixaKm => ({
          kmInicio: numeroOuNull(f.kmInicio) ?? 0,
          kmFim: numeroOuNull(f.kmFim) ?? 0,
          valor: numeroOuNull(f.valor) ?? 0,
          entrega: true,
        })
      );
    }
    if (tipoFrete === 'por_bairro') {
      base.bairros = bairros.map(
        (b): BairroFrete => ({
          bairro: b.bairro.trim(),
          valor: numeroOuNull(b.valor) ?? 0,
          entrega: true,
        })
      );
    }
    return base;
  };

  const salvar = () => {
    setErro(null);
    setSalvo(false);
    startTransition(async () => {
      const r = await salvarPersonalizacao(slug, {
        nome: nome.trim(),
        logo_url: logoUrl.trim() || null,
        cor_primaria: cor.trim(),
        whatsapp: whatsapp.trim() || null,
        endereco: endereco.trim() || null,
        descricao: descricao.trim() || null,
        aviso: aviso.trim() || null,
        aviso_ativo: avisoAtivo,
        instagram: instagram.trim() || null,
        metodos_pagamento: metodos,
        pedido_minimo: numeroOuNull(pedidoMinimo),
        aceita_entrega: aceitaEntrega,
        aceita_retirada: aceitaRetirada,
        aceita_local: aceitaLocal,
        config_frete: montarFrete(),
        config_taxa_servico: temTaxa
          ? { tipo: tipoTaxa, valor: numeroOuNull(valorTaxa) ?? -1 }
          : null,
        config_meia_meia:
          estrategia === 'fixo'
            ? { estrategia, precoFixo: numeroOuNull(precoFixoMeia) ?? undefined }
            : { estrategia },
      });
      if (r.erro) setErro(r.erro);
      else setSalvo(true);
    });
  };

  return (
    <section className="bg-white border border-borda-suave rounded-xl p-5 space-y-5">
      <h2 className="font-display text-xl font-bold text-carbono">Site do cardápio</h2>

      {/* identidade */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo rotulo="Nome da pizzaria">
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Pizzaria do Bairro"
            className={INPUT}
          />
        </Campo>
        <Campo rotulo="Descrição curta — aparece embaixo do nome">
          <input
            type="text"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            maxLength={120}
            placeholder="Forno a lenha desde 1998"
            className={INPUT}
          />
        </Campo>
        <Campo rotulo="Logo">
          <div className="flex gap-2 items-center">
            <input
              ref={inputLogoRef}
              type="file"
              accept="image/*"
              onChange={(e) => enviarLogo(e.target.files?.[0] ?? null)}
              disabled={enviandoLogo}
              className="text-sm text-creme-muted file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-2 file:border-borda-suave file:bg-white file:text-sm file:font-semibold file:text-carbono file:cursor-pointer hover:file:border-manjericao file:transition-colors"
            />
            {enviandoLogo && <span className="text-xs text-creme-muted">Enviando...</span>}
          </div>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="ou cole a URL de uma imagem"
            className={`${INPUT} mt-2`}
          />
        </Campo>
        <Campo rotulo="Cor primária">
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(cor) ? cor : '#e63946'}
              onChange={(e) => setCor(e.target.value)}
              className="h-11 w-14 border border-borda-suave rounded-lg cursor-pointer bg-white"
              aria-label="Escolher cor primária"
            />
            <input
              type="text"
              value={cor}
              onChange={(e) => setCor(e.target.value)}
              placeholder="#e63946"
              className={INPUT}
            />
          </div>
        </Campo>
        <Campo rotulo="WhatsApp (só números, com DDD)">
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="5511999998888"
            className={INPUT}
          />
        </Campo>
        <Campo rotulo="Endereço da loja — o cliente de retirada vê no site">
          <input
            type="text"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            placeholder="Rua das Margaridas, 123 — Centro"
            className={INPUT}
          />
        </Campo>
        <Campo rotulo="Instagram — só o nome do perfil">
          <input
            type="text"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="minhapizzaria"
            className={INPUT}
          />
        </Campo>
        <Campo rotulo="Pedido mínimo (R$) — vazio = sem mínimo">
          <input
            type="text"
            inputMode="decimal"
            value={pedidoMinimo}
            onChange={(e) => setPedidoMinimo(e.target.value)}
            placeholder="30,00"
            className={INPUT}
          />
        </Campo>
      </div>
      {logoUrl.trim() && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl.trim()}
          alt="Prévia do logo"
          className="h-16 w-16 rounded-lg object-cover border border-borda-suave"
        />
      )}

      {/* modalidades */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-bold text-carbono uppercase tracking-wide">
          Modalidades aceitas
        </legend>
        <div className="flex flex-wrap gap-4">
          <Checkbox rotulo="Entrega" marcado={aceitaEntrega} onMudar={setAceitaEntrega} />
          <Checkbox rotulo="Retirada" marcado={aceitaRetirada} onMudar={setAceitaRetirada} />
          <Checkbox rotulo="Comer no local" marcado={aceitaLocal} onMudar={setAceitaLocal} />
        </div>
      </fieldset>

      {/* aviso temporário na home */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-bold text-carbono uppercase tracking-wide">
          Aviso no site
        </legend>
        <p className="text-xs text-creme-muted">
          Mensagem em destaque na primeira tela do cardápio — promoções, avisos de feriado etc.
        </p>
        <textarea
          value={aviso}
          onChange={(e) => setAviso(e.target.value)}
          maxLength={200}
          rows={2}
          placeholder="Terça é dia de pizza: 20% off nas grandes!"
          className={INPUT}
        />
        <Checkbox rotulo="Exibir o aviso no site" marcado={avisoAtivo} onMudar={setAvisoAtivo} />
      </fieldset>

      {/* métodos de pagamento */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-bold text-carbono uppercase tracking-wide">
          Pagamento na entrega/retirada
        </legend>
        <p className="text-xs text-creme-muted">
          O checkout só oferece os métodos marcados aqui.
        </p>
        <div className="flex flex-wrap gap-4">
          {METODOS.map((m) => (
            <Checkbox
              key={m}
              rotulo={METODO_PAGAMENTO_LABEL[m]}
              marcado={metodos.includes(m)}
              onMudar={(v) => alternarMetodo(m, v)}
            />
          ))}
        </div>
      </fieldset>

      {/* frete */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-bold text-carbono uppercase tracking-wide">
          Frete (entrega)
        </legend>
        <select
          value={tipoFrete}
          onChange={(e) => setTipoFrete(e.target.value as TipoFrete)}
          className={INPUT}
        >
          {(Object.keys(TIPO_FRETE_LABEL) as TipoFrete[]).map((t) => (
            <option key={t} value={t}>
              {TIPO_FRETE_LABEL[t]}
            </option>
          ))}
        </select>

        {tipoFrete === 'fixo' && (
          <Campo rotulo="Valor fixo (R$)">
            <input
              type="text"
              inputMode="decimal"
              value={valorFixo}
              onChange={(e) => setValorFixo(e.target.value)}
              className={INPUT}
            />
          </Campo>
        )}

        {tipoFrete === 'preco_por_km' && (
          <div className="grid grid-cols-2 gap-4">
            <Campo rotulo="Valor por km (R$)">
              <input
                type="text"
                inputMode="decimal"
                value={valorPorKm}
                onChange={(e) => setValorPorKm(e.target.value)}
                className={INPUT}
              />
            </Campo>
            <Campo rotulo="Frete mínimo (R$) — opcional">
              <input
                type="text"
                inputMode="decimal"
                value={minimoFrete}
                onChange={(e) => setMinimoFrete(e.target.value)}
                className={INPUT}
              />
            </Campo>
          </div>
        )}

        {tipoFrete === 'faixas_km' && (
          <div className="space-y-2">
            {faixas.map((f, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  inputMode="decimal"
                  value={f.kmInicio}
                  onChange={(e) => setFaixas(trocar(faixas, i, { ...f, kmInicio: e.target.value }))}
                  placeholder="de (km)"
                  className={INPUT}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={f.kmFim}
                  onChange={(e) => setFaixas(trocar(faixas, i, { ...f, kmFim: e.target.value }))}
                  placeholder="até (km)"
                  className={INPUT}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={f.valor}
                  onChange={(e) => setFaixas(trocar(faixas, i, { ...f, valor: e.target.value }))}
                  placeholder="R$"
                  className={INPUT}
                />
                <BotaoRemover onClick={() => setFaixas(faixas.filter((_, j) => j !== i))} />
              </div>
            ))}
            <BotaoAdicionar
              rotulo="Adicionar faixa"
              onClick={() => setFaixas([...faixas, { kmInicio: '', kmFim: '', valor: '' }])}
            />
          </div>
        )}

        {tipoFrete === 'por_bairro' && (
          <div className="space-y-2">
            {bairros.map((b, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={b.bairro}
                  onChange={(e) => setBairros(trocar(bairros, i, { ...b, bairro: e.target.value }))}
                  placeholder="Bairro"
                  className={INPUT}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  value={b.valor}
                  onChange={(e) => setBairros(trocar(bairros, i, { ...b, valor: e.target.value }))}
                  placeholder="R$"
                  className={INPUT}
                />
                <BotaoRemover onClick={() => setBairros(bairros.filter((_, j) => j !== i))} />
              </div>
            ))}
            <BotaoAdicionar
              rotulo="Adicionar bairro"
              onClick={() => setBairros([...bairros, { bairro: '', valor: '' }])}
            />
          </div>
        )}

        {tipoFrete !== 'gratis' && (
          <Campo rotulo="Frete grátis para pedidos acima de (R$) — opcional">
            <input
              type="text"
              inputMode="decimal"
              value={gratisAcima}
              onChange={(e) => setGratisAcima(e.target.value)}
              className={INPUT}
            />
          </Campo>
        )}
      </fieldset>

      {/* taxa de serviço */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-bold text-carbono uppercase tracking-wide">
          Taxa de serviço
        </legend>
        <Checkbox rotulo="Cobrar taxa de serviço" marcado={temTaxa} onMudar={setTemTaxa} />
        {temTaxa && (
          <div className="grid grid-cols-2 gap-4">
            <select
              value={tipoTaxa}
              onChange={(e) => setTipoTaxa(e.target.value as TipoTaxaServico)}
              className={INPUT}
            >
              <option value="percentual">Percentual (%)</option>
              <option value="fixo">Valor fixo (R$)</option>
            </select>
            <input
              type="text"
              inputMode="decimal"
              value={valorTaxa}
              onChange={(e) => setValorTaxa(e.target.value)}
              placeholder={tipoTaxa === 'percentual' ? '10' : '2,50'}
              className={INPUT}
            />
          </div>
        )}
      </fieldset>

      {/* meia-meia */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-bold text-carbono uppercase tracking-wide">
          Preço da pizza meia-meia
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <select
            value={estrategia}
            onChange={(e) => setEstrategia(e.target.value as EstrategiaMeiaMeia)}
            className={INPUT}
          >
            <option value="maior">Sabor mais caro</option>
            <option value="menor">Sabor mais barato</option>
            <option value="media">Média dos sabores</option>
            <option value="fixo">Preço fixo</option>
          </select>
          {estrategia === 'fixo' && (
            <input
              type="text"
              inputMode="decimal"
              value={precoFixoMeia}
              onChange={(e) => setPrecoFixoMeia(e.target.value)}
              placeholder="R$"
              className={INPUT}
            />
          )}
        </div>
      </fieldset>

      {erro && (
        <p role="alert" className="text-sm text-pomodoro bg-pomodoro/5 border border-pomodoro/20 rounded-lg p-3">
          {erro}
        </p>
      )}
      {salvo && (
        <p role="status" className="text-sm text-manjericao bg-manjericao/5 border border-manjericao/20 rounded-lg p-3">
          Alterações salvas — o site do cardápio já reflete.
        </p>
      )}

      <button
        type="button"
        onClick={salvar}
        disabled={pending}
        className="w-full sm:w-auto bg-pomodoro hover:bg-pomodoro-hover disabled:opacity-60 text-white px-6 py-3 rounded-lg font-semibold transition-colors active:scale-[0.99]"
      >
        {pending ? 'Salvando...' : 'Salvar personalização'}
      </button>
    </section>
  );
}

const INPUT =
  'w-full border border-borda-suave rounded-lg p-3 text-sm bg-massa-bg focus:outline-none focus:ring-2 focus:ring-pomodoro/40';

function trocar<T>(lista: T[], i: number, novo: T): T[] {
  return lista.map((item, j) => (j === i ? novo : item));
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-carbono mb-1">{rotulo}</span>
      {children}
    </label>
  );
}

function Checkbox({
  rotulo,
  marcado,
  onMudar,
}: {
  rotulo: string;
  marcado: boolean;
  onMudar: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-carbono cursor-pointer">
      <input
        type="checkbox"
        checked={marcado}
        onChange={(e) => onMudar(e.target.checked)}
        className="h-4 w-4 accent-pomodoro"
      />
      {rotulo}
    </label>
  );
}

function BotaoRemover({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Remover linha"
      className="px-3 py-2 border-2 border-pomodoro/30 text-pomodoro hover:bg-pomodoro/5 rounded-lg font-bold text-sm"
    >
      ×
    </button>
  );
}

function BotaoAdicionar({ rotulo, onClick }: { rotulo: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm font-semibold text-carbono border-2 border-borda-suave rounded-lg px-3 py-2 hover:border-manjericao transition-colors"
    >
      + {rotulo}
    </button>
  );
}
