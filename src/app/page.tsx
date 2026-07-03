// src/app/page.tsx
'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type NearbyPizzaria = {
  nome: string;
  slug: string;
  bairro: string;
  cidade: string;
  distancia: string;
  descricao: string;
  status: string;
  logoUrl: string;
};

const PIZZARIAS: NearbyPizzaria[] = [
  {
    nome: 'Pizzaria Teste',
    slug: 'pizzaria-teste',
    bairro: 'Jardim das Flores',
    cidade: 'São Paulo',
    distancia: '1,2 km',
    descricao: 'Entrega rápida e pizzas artesanais com ingredientes frescos.',
    status: 'Entrega',
    logoUrl: 'https://images.unsplash.com/photo-1544378732-3b8a4c71740b?q=80&w=300',
  },
  {
    nome: 'Bella Massa',
    slug: 'bella-massa',
    bairro: 'Vila Nova',
    cidade: 'São Paulo',
    distancia: '2,8 km',
    descricao: 'Sabores clássicos e massa feita na hora para retirada no balcão.',
    status: 'Retirada',
    logoUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=300',
  },
  {
    nome: 'Forno da Praça',
    slug: 'forno-da-praca',
    bairro: 'Centro',
    cidade: 'São Paulo',
    distancia: '500 m',
    descricao: 'Ambiente aconchegante e pizzas especiais para comer no local.',
    status: 'Local',
    logoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=300',
  },
];

export default function HomePage() {
  const [busca, setBusca] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [geoError, setGeoError] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const pizzariasFiltradas = useMemo(() => {
    const termo = busca.toLocaleLowerCase().trim();
    const local = localizacao.toLocaleLowerCase().trim();

    return PIZZARIAS.filter((pizzaria) => {
      const correspondeBusca =
        termo === '' ||
        [pizzaria.nome, pizzaria.bairro, pizzaria.cidade, pizzaria.descricao]
          .some((campo) => campo.toLocaleLowerCase().includes(termo));

      const correspondeLocalizacao =
        local === '' ||
        pizzaria.bairro.toLocaleLowerCase().includes(local) ||
        pizzaria.cidade.toLocaleLowerCase().includes(local);

      return correspondeBusca && correspondeLocalizacao;
    });
  }, [busca, localizacao]);

  const handleUseLocation = () => {
    if (!navigator?.geolocation) {
      setGeoError('Seu navegador não permite acessar a localização.');
      return;
    }

    setGeoLoading(true);
    setGeoError('');

    navigator.geolocation.getCurrentPosition(
      () => {
        setLocalizacao('Centro');
        setGeoLoading(false);
      },
      () => {
        setGeoError('Não foi possível obter sua localização.');
        setGeoLoading(false);
      },
      { timeout: 10000 }
    );
  };

  return (
    <main className="min-h-screen bg-[#fcf8f3] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-[32px] border border-creme/60 bg-gradient-to-br from-white via-[#fffdf9] to-[#fdf5ea] p-8 shadow-[0_28px_80px_rgba(66,50,34,0.12)]">
          <div className="flex flex-col gap-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-manjericao/80">Pizza Order</p>
              <h1 className="mt-4 text-4xl font-display font-bold text-carbono sm:text-5xl">As melhores pizzarias da sua região</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-carbono/70 sm:text-lg">
                Use a grade para escolher sua pizzaria por bairro, cidade ou pelo que está mais perto. O cardápio é aberto direto no local certo.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[26px] border border-creme/70 bg-white/95 p-4 shadow-sm">
                <label className="block text-sm font-medium text-carbono">Buscar pizzarias</label>
                <input
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Ex: Centro, Vila Nova, São Paulo"
                  className="mt-3 w-full rounded-3xl border border-creme/50 bg-[#fbf6ef] px-4 py-3 text-sm text-carbono outline-none transition duration-200 focus:border-manjericao focus:ring-2 focus:ring-manjericao/15"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleUseLocation}
                  className="inline-flex min-h-[3rem] items-center justify-center rounded-3xl bg-manjericao px-6 text-sm font-semibold text-white transition duration-200 hover:bg-manjericao/95"
                >
                  {geoLoading ? 'Buscando...' : 'Perto de mim'}
                </button>
                <button
                  type="button"
                  onClick={() => setFiltrosAbertos((atual) => !atual)}
                  className="inline-flex min-h-[3rem] items-center justify-center rounded-3xl border border-carbono/10 bg-white px-6 text-sm font-semibold text-carbono transition duration-200 hover:border-manjericao"
                >
                  {filtrosAbertos ? 'Ocultar filtros' : 'Mostrar filtros'}
                </button>
              </div>
            </div>
          </div>

          <div className={`mt-8 overflow-hidden rounded-[28px] bg-[#fff8ee] transition-all duration-300 ${filtrosAbertos ? 'max-h-[1000px] py-6 opacity-100' : 'max-h-0 py-0 opacity-0'}`}>
            <div className="mx-auto max-w-6xl px-0 sm:px-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
                <div className="space-y-4">
                  <div className="rounded-[26px] border border-creme/70 bg-white/90 p-5 shadow-sm">
                    <p className="text-sm font-medium text-carbono">Filtros de localização</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {['Centro', 'Vila Nova', 'Jardim das Flores'].map((bairro) => (
                        <button
                          key={bairro}
                          type="button"
                          onClick={() => setLocalizacao(bairro)}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition duration-200 ${localizacao === bairro ? 'bg-manjericao text-white shadow-sm' : 'border border-creme/70 bg-white text-carbono hover:border-manjericao'}`}
                        >
                          {bairro}
                        </button>
                      ))}
                    </div>
                    <p className="mt-4 text-sm text-carbono/70">É possível ocultar os filtros a qualquer momento e continuar escolhendo pela grade.</p>
                  </div>
                </div>

                <div className="rounded-[26px] border border-creme/70 bg-[#fff7ea] p-5 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-manjericao/90">Filtro ativo</p>
                  <div className="mt-4 space-y-3 text-sm text-carbono/80">
                    <p><span className="font-semibold text-carbono">Busca:</span> {busca || 'Nenhuma busca'}</p>
                    <p><span className="font-semibold text-carbono">Localização:</span> {localizacao || 'Nenhuma localização'}</p>
                    <p><span className="font-semibold text-carbono">Resultados:</span> {pizzariasFiltradas.length}</p>
                  </div>
                  {geoError ? <p className="mt-4 rounded-3xl bg-pomodoro/10 px-4 py-3 text-sm font-semibold text-pomodoro">{geoError}</p> : null}
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleUseLocation}
                      className="inline-flex min-h-[3rem] items-center justify-center rounded-3xl bg-manjericao px-5 text-sm font-semibold text-white transition duration-200 hover:bg-manjericao/95"
                    >
                      Usar localização
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLocalizacao('');
                        setBusca('');
                        setGeoError('');
                      }}
                      className="inline-flex min-h-[3rem] items-center justify-center rounded-3xl border border-carbono/10 bg-white px-5 text-sm font-semibold text-carbono transition duration-200 hover:border-manjericao"
                    >
                      Limpar filtros
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-manjericao/90">Pizzarias disponíveis</p>
              <h2 className="mt-2 text-3xl font-bold text-carbono">Grade de pizzarias</h2>
            </div>
            <p className="text-sm text-carbono/70">{pizzariasFiltradas.length} pizzaria(s) encontrada(s)</p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {pizzariasFiltradas.map((pizzaria) => (
              <article key={pizzaria.slug} className="overflow-hidden rounded-[32px] border border-creme/60 bg-white shadow-[0_18px_40px_rgba(45,34,22,0.08)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_26px_70px_rgba(45,34,22,0.12)]">
                <div className="relative h-44 overflow-hidden bg-[#f9f2e6]">
                  <img src={pizzaria.logoUrl} alt={pizzaria.nome} className="h-full w-full object-cover" />
                </div>
                <div className="space-y-5 p-6">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xl font-semibold text-carbono">{pizzaria.nome}</h3>
                      <span className="rounded-full bg-manjericao/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-manjericao">{pizzaria.status}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-carbono/70">{pizzaria.descricao}</p>
                  </div>

                  <div className="grid gap-2 text-sm text-carbono/80">
                    <p><span className="font-semibold text-carbono">Bairro:</span> {pizzaria.bairro}</p>
                    <p><span className="font-semibold text-carbono">Cidade:</span> {pizzaria.cidade}</p>
                    <p><span className="font-semibold text-carbono">Distância:</span> {pizzaria.distancia}</p>
                  </div>

                  <Link
                    href={`/${pizzaria.slug}`}
                    className="inline-flex w-full items-center justify-center rounded-3xl bg-pomodoro px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-pomodoro/90"
                  >
                    Abrir cardápio
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
