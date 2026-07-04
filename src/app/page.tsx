// src/app/page.tsx
'use client';

import Image from 'next/image';
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
    logoUrl: 'https://images.unsplash.com/photo-1544378732-3b8a4c71740b?q=80&w=600',
  },
  {
    nome: 'Bella Massa',
    slug: 'bella-massa',
    bairro: 'Vila Nova',
    cidade: 'São Paulo',
    distancia: '2,8 km',
    descricao: 'Sabores clássicos e massa feita na hora para retirada no balcão.',
    status: 'Retirada',
    logoUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=600',
  },
  {
    nome: 'Forno da Praça',
    slug: 'forno-da-praca',
    bairro: 'Centro',
    cidade: 'São Paulo',
    distancia: '500 m',
    descricao: 'Ambiente aconchegante e pizzas especiais para comer no local.',
    status: 'Local',
    logoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=600',
  },
];

const BAIRROS = ['Centro', 'Vila Nova', 'Jardim das Flores'];

export default function HomePage() {
  const [busca, setBusca] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [geoError, setGeoError] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);

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

  const temFiltro = busca !== '' || localizacao !== '';

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

  const limparFiltros = () => {
    setBusca('');
    setLocalizacao('');
    setGeoError('');
  };

  return (
    <div className="max-w-full sm:max-w-md md:max-w-2xl lg:max-w-4xl mx-auto p-4 min-h-screen pb-12">
      <header className="py-6 border-b border-borda-suave">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-pomodoro">
          Pizza Order
        </h1>
        <p className="text-sm text-creme-muted mt-1">
          Escolha uma pizzaria perto de você e abra o cardápio direto no lugar certo.
        </p>
      </header>

      <section className="mt-6 bg-white border border-borda-suave rounded-lg p-4 shadow-xs space-y-4">
        <div>
          <label htmlFor="busca" className="block text-sm font-medium text-carbono mb-1">
            Buscar pizzarias
          </label>
          <input
            id="busca"
            type="search"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Nome, bairro ou cidade — ex: Centro"
            className="w-full border border-borda-suave rounded-lg p-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pomodoro/40"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleUseLocation}
            disabled={geoLoading}
            className="bg-pomodoro hover:bg-pomodoro-hover text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer active:scale-[0.98] disabled:opacity-60"
          >
            📍 {geoLoading ? 'Buscando...' : 'Perto de mim'}
          </button>

          {BAIRROS.map((bairro) => {
            const ativo = localizacao === bairro;
            return (
              <button
                key={bairro}
                type="button"
                onClick={() => setLocalizacao(ativo ? '' : bairro)}
                className={`text-sm font-medium px-4 py-2 rounded-full border transition-colors cursor-pointer ${
                  ativo
                    ? 'bg-manjericao text-white border-manjericao'
                    : 'bg-white text-carbono border-borda-suave hover:border-manjericao'
                }`}
              >
                {bairro}
              </button>
            );
          })}

          {temFiltro && (
            <button
              type="button"
              onClick={limparFiltros}
              className="text-sm font-medium text-creme-muted hover:text-carbono px-2 py-2 transition-colors cursor-pointer"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {geoError && <p className="text-sm text-pomodoro">{geoError}</p>}
      </section>

      <main className="mt-8">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h2 className="font-display text-2xl font-bold text-carbono">Pizzarias disponíveis</h2>
          <p className="text-sm text-creme-muted flex-shrink-0">
            {pizzariasFiltradas.length} {pizzariasFiltradas.length === 1 ? 'encontrada' : 'encontradas'}
          </p>
        </div>

        {pizzariasFiltradas.length === 0 ? (
          <div className="bg-white border border-borda-suave rounded-lg p-8 text-center shadow-xs">
            <span className="text-3xl">🍕</span>
            <p className="mt-3 text-sm text-creme-muted">
              Nenhuma pizzaria encontrada com esses filtros.
            </p>
            <button
              type="button"
              onClick={limparFiltros}
              className="mt-4 text-sm font-semibold text-pomodoro hover:text-pomodoro-hover transition-colors cursor-pointer"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pizzariasFiltradas.map((pizzaria) => (
              <article
                key={pizzaria.slug}
                className="bg-white border border-borda-suave rounded-lg p-4 flex flex-col gap-3 shadow-xs"
              >
                <div className="relative h-36 rounded-lg overflow-hidden bg-massa-bg">
                  <Image
                    src={pizzaria.logoUrl}
                    alt={pizzaria.nome}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>

                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display font-semibold text-carbono text-lg leading-tight">
                    {pizzaria.nome}
                  </h3>
                  <span className="flex-shrink-0 bg-manjericao/10 text-manjericao text-xs font-semibold px-3 py-1 rounded-full">
                    {pizzaria.status}
                  </span>
                </div>

                <p className="text-sm text-creme-muted leading-relaxed">{pizzaria.descricao}</p>

                <p className="text-sm text-creme-muted">
                  📍 {pizzaria.bairro}, {pizzaria.cidade}
                  <span className="text-manjericao font-semibold"> · {pizzaria.distancia}</span>
                </p>

                <Link
                  href={`/${pizzaria.slug}`}
                  className="mt-auto w-full text-center bg-pomodoro hover:bg-pomodoro-hover text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors active:scale-[0.98]"
                >
                  Ver cardápio
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
