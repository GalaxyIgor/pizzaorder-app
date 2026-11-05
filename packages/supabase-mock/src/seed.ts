// packages/supabase-mock/src/seed.ts
//
// Dados iniciais do mock — determinísticos (PRNG com seed fixa: mesmos ids a
// cada reset), com datas relativas a "agora" para os painéis abrirem cheios.
//
//   pizzaria-teste  cardápio completo de supabase/seed_turbo.sql, sempre aberta
//   forno-da-vila   cardápio menor, com horário de verdade (testa "fechado" e
//                   o isolamento multi-tenant)
//
// Credenciais de teste: ver packages/supabase-mock/README.md.

import type { Row, Tables } from './schema';
import { TABLES } from './schema';
import type { MockState, MockUser } from './store';

export const SENHA_PADRAO = 'pizza123';

// ---------------------------------------------------------------------------
// PRNG determinístico
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Rng {
  (): number;
  int(min: number, max: number): number;
  pick<T>(lista: readonly T[]): T;
  chance(p: number): boolean;
  uuid(): string;
}

function criarRng(seed: number): Rng {
  const base = mulberry32(seed);
  const rng = (() => base()) as Rng;
  rng.int = (min, max) => min + Math.floor(base() * (max - min + 1));
  rng.pick = (lista) => lista[Math.floor(base() * lista.length)];
  rng.chance = (p) => base() < p;
  rng.uuid = () => {
    const hex = Array.from({ length: 32 }, () => Math.floor(base() * 16).toString(16));
    hex[12] = '4';
    hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
    const s = hex.join('');
    return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
  };
  return rng;
}

const arred = (v: number) => Math.round(v * 100) / 100;

// ---------------------------------------------------------------------------
// Cardápios
// ---------------------------------------------------------------------------

const IMG = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`;

interface ProdutoDef {
  chave: string;
  nome: string;
  descricao: string;
  imagem: string | null;
  precos: [tamanho: string, preco: number][];
  disponivel?: boolean;
}

interface CategoriaDef {
  nome: string;
  tipo: 'pizza' | 'bebida' | 'meia_meia' | 'sobremesa' | 'outro';
  produtos: ProdutoDef[];
}

interface GrupoDef {
  categoria: string;
  nome: string;
  tipo: 'unica' | 'multipla';
  obrigatorio: boolean;
  min: number;
  max: number;
  opcoes: { nome: string; preco: number; porTamanho?: [string, number][] }[];
}

interface PizzariaDef {
  slug: string;
  pizzaria: Row;
  categorias: CategoriaDef[];
  destaques: string[];
  combosMeiaMeia: [string, string][];
  combosProdutos: { nome: string; descricao: string; produtos: [string, string]; preco: number }[];
  grupos: GrupoDef[];
  pedidosPorDia: [number, number];
}

const PIZZARIA_TESTE: PizzariaDef = {
  slug: 'pizzaria-teste',
  pizzaria: {
    nome: 'Pizzaria Teste',
    slug: 'pizzaria-teste',
    logo_url: 'https://images.unsplash.com/photo-1544378732-3b8a4c71740b?auto=format&fit=crop&w=300&q=80',
    cor_primaria: '#e63946',
    whatsapp: '5511987654321',
    endereco: 'Rua Augusta, 1500 — Consolação, São Paulo/SP',
    descricao: 'Pizza de fermentação natural, forno a lenha e massa de 48h.',
    aviso: 'Dados de demonstração (modo mock) — nenhum pedido é real.',
    aviso_ativo: true,
    instagram: 'pizzariateste',
    metodos_pagamento: ['dinheiro', 'cartao', 'pix'],
    config_meia_meia: { estrategia: 'maior' },
    config_frete: { tipo: 'fixo', valorFixo: 8 },
    // valor em % (frete.ts: subtotal * valor / 100) — o seed_turbo.sql grava 0.05 (=0,05%)
    config_taxa_servico: { tipo: 'percentual', valor: 5 },
    pedido_minimo: 35,
    aceita_retirada: true,
    aceita_entrega: true,
    aceita_local: true,
    pedidos_pausados: false,
    // sempre aberta: o checkout funciona a qualquer hora em dev
    horario_funcionamento: null,
    ativo: true,
  },
  categorias: [
    {
      nome: 'Pizzas Tradicionais',
      tipo: 'pizza',
      produtos: [
        { chave: 'calabresa', nome: 'Calabresa', descricao: 'Molho de tomate, mussarela, calabresa fatiada e cebola', imagem: IMG('1600891964599-f61ba0e24092'), precos: [['M', 39.9], ['G', 49.9], ['GG', 59.9]] },
        { chave: 'mussarela', nome: 'Mussarela', descricao: 'Molho de tomate, mussarela e orégano', imagem: IMG('1548365328-6c6a1f9d8a76'), precos: [['M', 34.9], ['G', 44.9], ['GG', 54.9]] },
        { chave: 'portuguesa', nome: 'Portuguesa', descricao: 'Molho de tomate, mussarela, presunto, ovos e ervilhas', imagem: IMG('1541370107829-577b5cd53d16'), precos: [['M', 42.9], ['G', 52.9]] },
        { chave: 'marguerita', nome: 'Marguerita', descricao: 'Molho de tomate, mussarela, tomate fatiado e manjericão', imagem: IMG('1601924411378-30fb589f7c4a'), precos: [['M', 37.9], ['G', 47.9]] },
      ],
    },
    {
      nome: 'Pizzas Especiais',
      tipo: 'pizza',
      produtos: [
        { chave: 'frango', nome: 'Frango com Catupiry', descricao: 'Frango desfiado, catupiry e milho', imagem: IMG('1601924582970-7d1d6e23d2b6'), precos: [['M', 44.9], ['G', 54.9]] },
        { chave: 'quatro_queijos', nome: 'Quatro Queijos', descricao: 'Mussarela, provolone, parmesão e gorgonzola', imagem: IMG('1594007654665-b997c3c3f9f1'), precos: [['M', 46.9], ['G', 56.9]] },
        { chave: 'pepperoni', nome: 'Pepperoni Suprema', descricao: 'Mussarela, pepperoni e borda fina crocante', imagem: IMG('1551892589-865f6986947b'), precos: [['M', 47.9], ['G', 57.9]] },
        { chave: 'trufada', nome: 'Funghi Trufada', descricao: 'Mix de cogumelos, mussarela de búfala e azeite trufado', imagem: null, precos: [['M', 54.9], ['G', 66.9]], disponivel: false },
      ],
    },
    {
      nome: 'Pizzas Veganas',
      tipo: 'pizza',
      produtos: [
        { chave: 'veggie', nome: 'Veggie Garden', descricao: 'Molho de tomate, mix de vegetais e queijo vegano', imagem: IMG('1523986371872-9d3ba2e2f1b7'), precos: [['M', 41.9], ['G', 51.9]] },
        { chave: 'vegan_supreme', nome: 'Vegan Supreme', descricao: 'Molho de tomate, palmito, brócolis e queijo vegano', imagem: IMG('1546069901-ba9599a7e63c'), precos: [['M', 43.9], ['G', 53.9]] },
      ],
    },
    { nome: 'Meia Meia', tipo: 'meia_meia', produtos: [] },
    {
      nome: 'Bebidas',
      tipo: 'bebida',
      produtos: [
        { chave: 'coca', nome: 'Coca-Cola 2L', descricao: 'Refrigerante cola em garrafa de 2 litros', imagem: IMG('1509042239860-f550ce710b93'), precos: [['2L', 12.9], ['1L', 8.9]] },
        { chave: 'fanta', nome: 'Fanta Laranja 2L', descricao: 'Refrigerante laranja em garrafa de 2 litros', imagem: IMG('1525382455947-f319bc05f6b8'), precos: [['2L', 12.9], ['1L', 8.9]] },
        { chave: 'agua', nome: 'Água Mineral 500ml', descricao: 'Água sem gás em garrafa de 500ml', imagem: IMG('1510626176961-4b57f2d4b49d'), precos: [['500ml', 5.9]] },
      ],
    },
    {
      nome: 'Sobremesas',
      tipo: 'sobremesa',
      produtos: [
        { chave: 'brownie', nome: 'Brownie', descricao: 'Brownie de chocolate com castanhas', imagem: IMG('1551024730531-7f3a5f37c7d2'), precos: [['Unico', 15.9]] },
        { chave: 'petit', nome: 'Petit Gateau', descricao: 'Petit gateau de chocolate com sorvete', imagem: IMG('1563805042-7684c019e1cb'), precos: [['Unico', 18.9]] },
      ],
    },
  ],
  destaques: ['quatro_queijos', 'frango', 'vegan_supreme', 'coca'],
  combosMeiaMeia: [
    ['calabresa', 'frango'],
    ['marguerita', 'vegan_supreme'],
    ['portuguesa', 'quatro_queijos'],
  ],
  combosProdutos: [
    { nome: 'Combo Família', descricao: 'Calabresa G + Coca-Cola 2L', produtos: ['calabresa', 'coca'], preco: 57.9 },
  ],
  grupos: [
    {
      categoria: 'Pizzas Tradicionais',
      nome: 'Borda recheada',
      tipo: 'unica',
      obrigatorio: false,
      min: 0,
      max: 1,
      opcoes: [
        { nome: 'Sem borda', preco: 0, porTamanho: [['M', 0], ['G', 0], ['GG', 0]] },
        { nome: 'Catupiry', preco: 0, porTamanho: [['M', 8], ['G', 10], ['GG', 12]] },
        { nome: 'Cheddar', preco: 0, porTamanho: [['M', 8], ['G', 10], ['GG', 12]] },
      ],
    },
    {
      categoria: 'Pizzas Tradicionais',
      nome: 'Extras',
      tipo: 'multipla',
      obrigatorio: false,
      min: 0,
      max: 3,
      opcoes: [
        { nome: 'Bacon', preco: 6 },
        { nome: 'Cebola caramelizada', preco: 5 },
        { nome: 'Cogumelos', preco: 5 },
        { nome: 'Azeitonas', preco: 4 },
      ],
    },
    {
      categoria: 'Pizzas Tradicionais',
      nome: 'Molhos extra',
      tipo: 'multipla',
      obrigatorio: false,
      min: 0,
      max: 2,
      opcoes: [
        { nome: 'Catupiry extra', preco: 7 },
        { nome: 'Molho de pimenta', preco: 3.5 },
      ],
    },
  ],
  pedidosPorDia: [15, 40],
};

// Ter–Dom 18:00–23:30 (segunda fechado) — America/Sao_Paulo
const HORARIO_NOITE = { abre: '18:00', fecha: '23:30' };

const FORNO_DA_VILA: PizzariaDef = {
  slug: 'forno-da-vila',
  pizzaria: {
    nome: 'Forno da Vila',
    slug: 'forno-da-vila',
    logo_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80',
    cor_primaria: '#2a9d8f',
    whatsapp: '5511912345678',
    endereco: 'Rua Harmonia, 321 — Vila Madalena, São Paulo/SP',
    descricao: 'Pizzaria de bairro desde 1998.',
    aviso: null,
    aviso_ativo: false,
    instagram: 'fornodavila',
    metodos_pagamento: ['dinheiro', 'pix'],
    config_meia_meia: { estrategia: 'media' },
    config_frete: {
      tipo: 'por_bairro',
      bairros: [
        { bairro: 'Vila Madalena', valor: 5, entrega: true },
        { bairro: 'Pinheiros', valor: 8, entrega: true },
        { bairro: 'Perdizes', valor: 10, entrega: true },
        { bairro: 'Lapa', valor: 0, entrega: false },
      ],
    },
    config_taxa_servico: null,
    pedido_minimo: 30,
    aceita_retirada: true,
    aceita_entrega: true,
    aceita_local: false,
    pedidos_pausados: false,
    horario_funcionamento: {
      '0': [HORARIO_NOITE],
      '2': [HORARIO_NOITE],
      '3': [HORARIO_NOITE],
      '4': [HORARIO_NOITE],
      '5': [{ abre: '18:00', fecha: '01:00' }],
      '6': [{ abre: '18:00', fecha: '01:00' }],
    },
    ativo: true,
  },
  categorias: [
    {
      nome: 'Pizzas',
      tipo: 'pizza',
      produtos: [
        { chave: 'v_napolitana', nome: 'Napolitana', descricao: 'Mussarela, tomate, parmesão e alho', imagem: null, precos: [['Broto', 29.9], ['Grande', 52.9]] },
        { chave: 'v_baiana', nome: 'Baiana', descricao: 'Calabresa moída, pimenta, ovo e cebola', imagem: null, precos: [['Broto', 31.9], ['Grande', 55.9]] },
        { chave: 'v_atum', nome: 'Atum', descricao: 'Atum sólido, cebola e azeitonas', imagem: null, precos: [['Broto', 33.9], ['Grande', 58.9]] },
        { chave: 'v_rucula', nome: 'Rúcula com Tomate Seco', descricao: 'Mussarela de búfala, rúcula e tomate seco', imagem: null, precos: [['Broto', 34.9], ['Grande', 61.9]] },
      ],
    },
    {
      nome: 'Bebidas',
      tipo: 'bebida',
      produtos: [
        { chave: 'v_guarana', nome: 'Guaraná Antarctica 2L', descricao: 'Refrigerante de guaraná', imagem: null, precos: [['2L', 11.9]] },
        { chave: 'v_suco', nome: 'Suco de Laranja 500ml', descricao: 'Natural, feito na hora', imagem: null, precos: [['500ml', 9.9]] },
      ],
    },
  ],
  destaques: ['v_rucula'],
  combosMeiaMeia: [['v_napolitana', 'v_baiana']],
  combosProdutos: [],
  grupos: [],
  pedidosPorDia: [5, 15],
};

// ---------------------------------------------------------------------------
// Pessoas
// ---------------------------------------------------------------------------

const NOMES = [
  'Ana Souza', 'Bruno Lima', 'Carla Mendes', 'Diego Rocha', 'Eduarda Alves', 'Felipe Costa',
  'Gabriela Martins', 'Henrique Dias', 'Isabela Ferreira', 'João Pedro Nunes', 'Karina Gomes',
  'Lucas Ribeiro', 'Mariana Carvalho', 'Nicolas Barbosa', 'Olívia Teixeira', 'Paulo Araújo',
  'Rafaela Moreira', 'Samuel Cardoso', 'Tatiane Lopes', 'Vinícius Pereira', 'Yasmin Correia',
  'Leonardo Pinto', 'Beatriz Ramos', 'Thiago Freitas', 'Camila Duarte',
];

const RUAS = ['Rua Augusta', 'Rua Haddock Lobo', 'Rua Fradique Coutinho', 'Rua Cardeal Arcoverde', 'Rua Harmonia', 'Rua Teodoro Sampaio', 'Rua Mourato Coelho', 'Avenida Pompeia'];
const BAIRROS = ['Vila Madalena', 'Pinheiros', 'Perdizes', 'Consolação', 'Jardins'];
const OBSERVACOES = ['Sem cebola, por favor', 'Bem passada', 'Interfone quebrado, ligar ao chegar', 'Mandar sachês de ketchup', 'Cortar em 12 pedaços', 'Troco em notas pequenas'];
const MOTIVOS_CANCELAMENTO = ['Cliente desistiu', 'Endereço fora da área de entrega', 'Item em falta', 'Cliente não atendeu o telefone', 'Pedido duplicado'];

// ---------------------------------------------------------------------------
// Gerador
// ---------------------------------------------------------------------------

interface CardapioGerado {
  pizzariaId: string;
  def: PizzariaDef;
  /** produtos com variações, por chave. */
  produtos: Map<string, { row: Row; variacoes: Row[]; categoria: CategoriaDef }>;
  /** opções por grupo (só os grupos da categoria do produto valem). */
  grupos: { row: Row; opcoes: { row: Row; precos: Row[] }[]; categoriaId: string }[];
}

function gerarCardapio(def: PizzariaDef, t: Tables, rng: Rng, criadoEm: string): CardapioGerado {
  const pizzariaId = rng.uuid();
  t.pizzarias.push({ id: pizzariaId, criado_em: criadoEm, ...def.pizzaria });

  const produtos: CardapioGerado['produtos'] = new Map();
  const categoriaIds = new Map<string, string>();
  def.categorias.forEach((cat, i) => {
    const categoriaId = rng.uuid();
    categoriaIds.set(cat.nome, categoriaId);
    t.categorias.push({ id: categoriaId, pizzaria_id: pizzariaId, nome: cat.nome, tipo: cat.tipo, ordem: i + 1, ativo: true, criado_em: criadoEm });
    cat.produtos.forEach((p, j) => {
      const row: Row = {
        id: rng.uuid(),
        pizzaria_id: pizzariaId,
        categoria_id: categoriaId,
        nome: p.nome,
        descricao: p.descricao,
        imagem_url: p.imagem,
        ordem: j + 1,
        disponivel: p.disponivel ?? true,
        criado_em: criadoEm,
      };
      t.produtos.push(row);
      const variacoes = p.precos.map(([tamanho, preco]) => ({
        id: rng.uuid(),
        produto_id: row.id,
        tamanho,
        preco,
        // GG da Portuguesa não existe; Coca 1L em falta para testar "indisponível"
        disponivel: !(p.chave === 'coca' && tamanho === '1L'),
      }));
      t.variacoes_produto.push(...variacoes);
      produtos.set(p.chave, { row, variacoes, categoria: cat });
    });
  });

  def.destaques.forEach((chave, i) => {
    t.destaques.push({ id: rng.uuid(), pizzaria_id: pizzariaId, produto_id: produtos.get(chave)!.row.id, ordem: i + 1, ativo: true });
  });

  def.combosMeiaMeia.forEach(([a, b], i) => {
    const p1 = produtos.get(a)!.row;
    const p2 = produtos.get(b)!.row;
    t.combos_meia_meia.push({
      id: rng.uuid(),
      pizzaria_id: pizzariaId,
      produto1_id: p1.id,
      produto2_id: p2.id,
      nome: `${p1.nome} + ${p2.nome}`,
      descricao: `Metade ${String(p1.nome).toLowerCase()}, metade ${String(p2.nome).toLowerCase()}`,
      imagem_url: null,
      ordem: i + 1,
      ativo: true,
      criado_em: criadoEm,
    });
  });

  def.combosProdutos.forEach((c, i) => {
    t.combos_produtos.push({
      id: rng.uuid(),
      pizzaria_id: pizzariaId,
      produto1_id: produtos.get(c.produtos[0])!.row.id,
      produto2_id: produtos.get(c.produtos[1])!.row.id,
      nome: c.nome,
      descricao: c.descricao,
      imagem_url: null,
      ordem: i + 1,
      preco: c.preco,
      ativo: true,
      criado_em: criadoEm,
    });
  });

  const grupos: CardapioGerado['grupos'] = def.grupos.map((g, i) => {
    const categoriaId = categoriaIds.get(g.categoria)!;
    const row: Row = {
      id: rng.uuid(),
      pizzaria_id: pizzariaId,
      categoria_id: categoriaId,
      nome: g.nome,
      tipo: g.tipo,
      obrigatorio: g.obrigatorio,
      min_selecoes: g.min,
      max_selecoes: g.max,
      ordem: i + 1,
      ativo: true,
    };
    t.grupos_adicionais.push(row);
    const opcoes = g.opcoes.map((o, j) => {
      const opcao: Row = {
        id: rng.uuid(),
        grupo_id: row.id,
        nome: o.nome,
        preco_base: o.preco,
        variar_por_tamanho: !!o.porTamanho,
        disponivel: true,
        ordem: j + 1,
      };
      t.opcoes_adicionais.push(opcao);
      const precos = (o.porTamanho ?? []).map(([tamanho, preco]) => ({ id: rng.uuid(), opcao_id: opcao.id, tamanho, preco }));
      t.precos_opcao_por_tamanho.push(...precos);
      return { row: opcao, precos };
    });
    return { row, opcoes, categoriaId };
  });

  return { pizzariaId, def, produtos, grupos };
}

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  enderecos: Row[];
}

/** Data local de São Paulo (UTC-3, sem horário de verão desde 2019) -> ISO UTC. */
function localSP(diaBase: Date, minutosDoDia: number): Date {
  const d = new Date(Date.UTC(diaBase.getUTCFullYear(), diaBase.getUTCMonth(), diaBase.getUTCDate()));
  return new Date(d.getTime() + (minutosDoDia + 180) * 60_000);
}

/** "Hoje" no fuso de SP, como data UTC à meia-noite. */
function hojeSP(agora: Date): Date {
  const sp = new Date(agora.getTime() - 180 * 60_000);
  return new Date(Date.UTC(sp.getUTCFullYear(), sp.getUTCMonth(), sp.getUTCDate()));
}

function montarItens(rng: Rng, c: CardapioGerado): { linhas: Row[]; subtotal: number } {
  const linhas: Row[] = [];
  const pizzas = [...c.produtos.entries()].filter(([, p]) => p.categoria.tipo === 'pizza' && p.row.disponivel);
  const bebidas = [...c.produtos.values()].filter((p) => p.categoria.tipo === 'bebida');
  const sobremesas = [...c.produtos.values()].filter((p) => p.categoria.tipo === 'sobremesa');
  const estrategia = (c.def.pizzaria.config_meia_meia as { estrategia: string }).estrategia;

  const nPizzas = rng.int(1, 3);
  for (let i = 0; i < nPizzas; i++) {
    if (rng.chance(0.2) && pizzas.length >= 2) {
      // meia-meia no mesmo tamanho
      const [, a] = rng.pick(pizzas);
      let [, b] = rng.pick(pizzas);
      while (b === a) [, b] = rng.pick(pizzas);
      const tamanhos = a.variacoes.map((v) => v.tamanho).filter((tm) => b.variacoes.some((v) => v.tamanho === tm));
      const tamanho = rng.pick(tamanhos) as string;
      const pa = Number(a.variacoes.find((v) => v.tamanho === tamanho)!.preco);
      const pb = Number(b.variacoes.find((v) => v.tamanho === tamanho)!.preco);
      const preco = estrategia === 'media' ? (pa + pb) / 2 : estrategia === 'menor' ? Math.min(pa, pb) : Math.max(pa, pb);
      linhas.push({
        tipo: 'meia-meia',
        nome: `Meia ${a.row.nome} / Meia ${b.row.nome}`,
        descricao: null,
        produto_id: null,
        variacao_id: null,
        tamanho,
        preco_unit: arred(preco),
        quantidade: 1,
        sabores: [a, b].map((p) => ({ produtoId: p.row.id, nome: p.row.nome, descricao: p.row.descricao })),
        adicionais: null,
      });
      continue;
    }
    const [, p] = rng.pick(pizzas);
    const v = rng.pick(p.variacoes);
    const adicionais: Row[] = [];
    for (const g of c.grupos.filter((gr) => gr.categoriaId === p.row.categoria_id)) {
      if (!rng.chance(g.row.tipo === 'unica' ? 0.35 : 0.2)) continue;
      const o = rng.pick(g.opcoes);
      const preco = o.row.variar_por_tamanho
        ? Number(o.precos.find((pp) => pp.tamanho === v.tamanho)?.preco ?? o.row.preco_base)
        : Number(o.row.preco_base);
      if (o.row.nome === 'Sem borda') continue;
      adicionais.push({ grupoId: g.row.id, opcaoId: o.row.id, nome: o.row.nome, preco });
    }
    const extras = adicionais.reduce((s, a) => s + Number(a.preco), 0);
    linhas.push({
      tipo: 'produto',
      nome: p.row.nome,
      descricao: p.row.descricao,
      produto_id: p.row.id,
      variacao_id: v.id,
      tamanho: v.tamanho,
      preco_unit: arred(Number(v.preco) + extras),
      quantidade: rng.chance(0.15) ? 2 : 1,
      sabores: null,
      adicionais: adicionais.length ? adicionais : null,
    });
  }
  if (bebidas.length && rng.chance(0.55)) {
    const p = rng.pick(bebidas);
    const v = p.variacoes.find((x) => x.disponivel) ?? p.variacoes[0];
    linhas.push({ tipo: 'produto', nome: p.row.nome, descricao: p.row.descricao, produto_id: p.row.id, variacao_id: v.id, tamanho: v.tamanho, preco_unit: v.preco, quantidade: rng.int(1, 2), sabores: null, adicionais: null });
  }
  if (sobremesas.length && rng.chance(0.15)) {
    const p = rng.pick(sobremesas);
    const v = p.variacoes[0];
    linhas.push({ tipo: 'produto', nome: p.row.nome, descricao: p.row.descricao, produto_id: p.row.id, variacao_id: v.id, tamanho: v.tamanho, preco_unit: v.preco, quantidade: 1, sabores: null, adicionais: null });
  }
  const subtotal = arred(linhas.reduce((s, l) => s + Number(l.preco_unit) * Number(l.quantidade), 0));
  return { linhas, subtotal };
}

function freteDe(config: Row['config_frete'], bairro: string | null): number {
  const cfg = config as { tipo: string; valorFixo?: number; bairros?: { bairro: string; valor: number }[] };
  if (cfg.tipo === 'fixo') return cfg.valorFixo ?? 0;
  if (cfg.tipo === 'por_bairro') return cfg.bairros?.find((b) => b.bairro === bairro)?.valor ?? 10;
  return 0;
}

function taxaServicoDe(config: Row['config_taxa_servico'], subtotal: number): number {
  const cfg = config as { tipo: string; valor: number } | null;
  if (!cfg) return 0;
  return arred(cfg.tipo === 'percentual' ? (subtotal * cfg.valor) / 100 : cfg.valor);
}

const MIN = 60_000;

export function gerarSeed(agora = new Date()): MockState {
  const rng = criarRng(20260704);
  const t: Tables = Object.fromEntries(TABLES.map((n) => [n, [] as Row[]]));
  const users: MockUser[] = [];
  const inicio = new Date(agora.getTime() - 120 * 24 * 60 * MIN).toISOString();

  const criarUsuario = (u: Partial<MockUser> & { email: string | null }): MockUser => {
    const user: MockUser = {
      id: rng.uuid(),
      password: u.email ? SENHA_PADRAO : null,
      phone: null,
      is_anonymous: false,
      user_metadata: {},
      app_metadata: { provider: 'email', providers: ['email'] },
      created_at: inicio,
      ...u,
    };
    users.push(user);
    return user;
  };

  // ---- pizzarias e cardápios
  const teste = gerarCardapio(PIZZARIA_TESTE, t, rng, inicio);
  const vila = gerarCardapio(FORNO_DA_VILA, t, rng, inicio);

  // ---- staff
  const staff = [
    { email: 'gerente@pizzariateste.test', nome: 'Gerente Teste', pizzaria: teste.pizzariaId, papel: 'gerente' },
    { email: 'cozinha@pizzariateste.test', nome: 'Cozinha Teste', pizzaria: teste.pizzariaId, papel: 'cozinha' },
    { email: 'gerente@fornodavila.test', nome: 'Gerente Vila', pizzaria: vila.pizzariaId, papel: 'gerente' },
  ];
  for (const s of staff) {
    const u = criarUsuario({ email: s.email, user_metadata: { full_name: s.nome } });
    t.staff_pizzaria.push({ user_id: u.id, pizzaria_id: s.pizzaria, papel: s.papel, criado_em: inicio });
  }
  // dono das duas lojas: testa o seletor de pizzaria na raiz da gestão/cozinha
  const dono = criarUsuario({ email: 'dono@pizzaorder.test', user_metadata: { full_name: 'Dono das Duas' } });
  t.staff_pizzaria.push({ user_id: dono.id, pizzaria_id: teste.pizzariaId, papel: 'gerente', criado_em: inicio });
  t.staff_pizzaria.push({ user_id: dono.id, pizzaria_id: vila.pizzariaId, papel: 'gerente', criado_em: inicio });

  // ---- clientes
  const clientes: Cliente[] = [];
  const criarCliente = (nome: string, user: MockUser, i: number) => {
    const telefone = `(11) 9${String(8100 + i).padStart(4, '0')}-${String(1000 + ((i * 7919) % 9000)).padStart(4, '0')}`;
    t.perfis.push({ id: user.id, nome, telefone, criado_em: inicio, atualizado_em: inicio });
    const enderecos: Row[] = [];
    const nEnd = i < 2 ? 2 : rng.int(0, 1);
    for (let k = 0; k < nEnd; k++) {
      const e = {
        id: rng.uuid(),
        cliente_id: user.id,
        apelido: k === 0 ? 'Casa' : 'Trabalho',
        rua: rng.pick(RUAS),
        numero: String(rng.int(10, 2500)),
        complemento: rng.chance(0.4) ? `Apto ${rng.int(11, 154)}` : null,
        bairro: rng.pick(BAIRROS),
        cidade: 'São Paulo',
        cep: `0${rng.int(1000, 5999)}-${String(rng.int(0, 999)).padStart(3, '0')}`,
        referencia: rng.chance(0.3) ? 'Portão azul' : null,
        criado_em: inicio,
      };
      t.enderecos_cliente.push(e);
      enderecos.push(e);
    }
    clientes.push({ id: user.id, nome, telefone, enderecos });
  };

  criarCliente('Ana Souza', criarUsuario({ email: 'cliente@pizzaorder.test', user_metadata: { full_name: 'Ana Souza' } }), 0);
  criarCliente('Bruno Lima', criarUsuario({ email: 'cliente2@pizzaorder.test', user_metadata: { full_name: 'Bruno Lima' } }), 1);
  criarCliente(
    'Carla Mendes',
    criarUsuario({
      email: 'google.teste@pizzaorder.test',
      password: null,
      user_metadata: { full_name: 'Carla Mendes', avatar_url: null },
      app_metadata: { provider: 'google', providers: ['google'] },
    }),
    2
  );
  NOMES.slice(3).forEach((nome, i) => {
    const anonimo = i % 4 === 0;
    const user = criarUsuario({
      email: anonimo ? null : `${nome.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').replace(/ /g, '.')}@exemplo.test`,
      is_anonymous: anonimo,
      app_metadata: anonimo ? { provider: 'anonymous', providers: ['anonymous'] } : { provider: 'email', providers: ['email'] },
    });
    criarCliente(nome, user, i + 3);
  });

  // ---- pedidos
  const hoje = hojeSP(agora);
  const agoraMin = Math.floor((agora.getTime() - hoje.getTime()) / MIN) - 180;

  for (const c of [teste, vila]) {
    const pedidos: { criado: Date; status: string }[] = [];
    const horario = c.def.pizzaria.horario_funcionamento as Record<string, { abre: string }[]> | null;

    for (let diasAtras = 30; diasAtras >= 0; diasAtras--) {
      const dia = new Date(hoje.getTime() - diasAtras * 24 * 60 * MIN);
      const semana = dia.getUTCDay();
      if (horario && !horario[String(semana)]?.length) continue; // fechado no dia

      const fimDeSemana = semana === 5 || semana === 6 || semana === 0;
      const [min, max] = c.def.pedidosPorDia;
      let n = rng.int(min, max);
      if (fimDeSemana) n = Math.round(n * 1.4);

      for (let k = 0; k < n; k++) {
        // almoço (só sem horário configurado) ou jantar 18:00–23:30
        const almoco = !horario && rng.chance(0.3);
        const minuto = almoco ? rng.int(11 * 60 + 30, 14 * 60) : rng.int(18 * 60, 23 * 60 + 30);
        if (diasAtras === 0 && minuto > agoraMin) continue; // não cria pedido no futuro
        const criado = localSP(dia, minuto);
        let status = rng.chance(0.08) ? 'cancelado' : 'concluido';
        if (diasAtras === 0 && agoraMin - minuto < 90 && status !== 'cancelado') {
          status = 'em_andamento'; // resolvido abaixo
        }
        pedidos.push({ criado, status });
      }
    }

    // Garante a fila "ao vivo" de hoje, mesmo fora do horário: pedidos dos últimos minutos
    const filaHoje = ['pendente', 'pendente', 'pendente', 'aceito', 'aceito', 'em_preparo', 'em_preparo', 'pronto', 'saiu_para_entrega'];
    const fila = c === teste ? filaHoje : filaHoje.slice(0, 4);
    fila.forEach((status, i) => {
      pedidos.push({ criado: new Date(agora.getTime() - (fila.length - i) * 6 * MIN), status });
    });
    // pedidos "em_andamento" gerados no horário real viram concluído (a fila acima é a ativa)
    for (const p of pedidos) if (p.status === 'em_andamento') p.status = 'concluido';

    pedidos.sort((a, b) => a.criado.getTime() - b.criado.getTime());

    let numero = 0;
    for (const p of pedidos) {
      numero += 1;
      // Ana (cliente demo) aparece com frequência, inclusive na fila de hoje
      const ehFila = agora.getTime() - p.criado.getTime() < 60 * MIN;
      const comEndereco = clientes.filter((cl) => cl.enderecos.length > 0);
      const cliente =
        (ehFila && p.status === 'em_preparo') || rng.chance(0.08)
          ? clientes[0]
          : p.status === 'saiu_para_entrega'
            ? rng.pick(comEndereco)
            : rng.pick(clientes);
      const aceita = c.def.pizzaria;
      const modalidades = (['entrega', 'retirada', 'local'] as const).filter(
        (m) => aceita[`aceita_${m}`] && (m !== 'entrega' || cliente.enderecos.length > 0)
      );
      let modalidade: string = rng.chance(0.65) && modalidades.includes('entrega') ? 'entrega' : rng.pick(modalidades);
      if (p.status === 'saiu_para_entrega') modalidade = modalidades.includes('entrega') ? 'entrega' : modalidade;
      if (p.status === 'saiu_para_entrega' && modalidade !== 'entrega') p.status = 'pronto';

      const endereco = modalidade === 'entrega' ? rng.pick(cliente.enderecos) : null;
      const { linhas, subtotal } = montarItens(rng, c);
      const taxaEntrega = modalidade === 'entrega' ? freteDe(aceita.config_frete, (endereco?.bairro as string) ?? null) : 0;
      const taxaServico = taxaServicoDe(aceita.config_taxa_servico, subtotal);
      const total = arred(subtotal + taxaEntrega + taxaServico);
      const metodos = aceita.metodos_pagamento as string[];
      const metodo = rng.pick(metodos);
      const criadoIso = p.criado.toISOString();
      const aceitoOuDepois = !['pendente', 'cancelado'].includes(p.status);

      const pedidoId = rng.uuid();
      t.pedidos.push({
        id: pedidoId,
        pizzaria_id: c.pizzariaId,
        cliente_id: cliente.id,
        numero,
        modalidade,
        status: p.status,
        nome_cliente: cliente.nome,
        telefone_cliente: cliente.telefone,
        endereco_entrega: endereco
          ? {
              rua: endereco.rua,
              numero: endereco.numero,
              complemento: endereco.complemento,
              bairro: endereco.bairro,
              cidade: endereco.cidade,
              cep: endereco.cep,
              referencia: endereco.referencia,
            }
          : null,
        observacao: rng.chance(0.2) ? rng.pick(OBSERVACOES) : null,
        subtotal,
        taxa_entrega: taxaEntrega,
        taxa_servico: taxaServico,
        total,
        forma_pagamento: 'na_entrega',
        metodo_pagamento_local: metodo,
        troco_para: metodo === 'dinheiro' && rng.chance(0.5) ? Math.ceil(total / 50) * 50 : null,
        status_pagamento: p.status === 'concluido' ? 'pago' : 'pendente',
        mercadopago_preference_id: null,
        mercadopago_payment_id: null,
        previsao_pronto_em: aceitoOuDepois ? new Date(p.criado.getTime() + rng.int(30, 50) * MIN).toISOString() : null,
        motivo_cancelamento: p.status === 'cancelado' ? rng.pick(MOTIVOS_CANCELAMENTO) : null,
        criado_em: criadoIso,
        atualizado_em: p.status === 'pendente' ? criadoIso : new Date(Math.min(agora.getTime(), p.criado.getTime() + rng.int(5, 60) * MIN)).toISOString(),
      });
      for (const l of linhas) t.itens_pedido.push({ id: rng.uuid(), pedido_id: pedidoId, ...l });
    }
    t.contadores_pedido.push({ pizzaria_id: c.pizzariaId, proximo: numero + 1 });
  }

  return { seq: 0, tables: t, auth_users: users, changes: [] };
}
