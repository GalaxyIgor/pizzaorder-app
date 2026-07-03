# Plano: Checkout (entrega/retirada/local) + Conta do Cliente

> Plano aprovado em 2026-07-03. Pré-requisito (cardápio conectado à API real, sem mocks)
> já foi concluído — a página `[slug]` consome `/api/cardapio/[slug]` via `CardapioContext`.
> Schema atual do cardápio: `supabase/schema.sql` (+ `grants.sql`, `seed.sql` — slug de teste: `pizzaria-teste`).

> **STATUS (2026-07-03): fases 1–3 implementadas no código** (schema em `supabase/checkout.sql`,
> auth completa, checkout com pagamento na entrega/retirada; Mercado Pago aparece como "em breve").
> Falta para testar: (1) rodar `supabase/checkout.sql` no SQL editor do Supabase;
> (2) adicionar `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no `.env.local`.
> Fases 4 (Mercado Pago) e 5 (Realtime + página de perfil/logout) pendentes.

## Decisões de produto (confirmadas com o usuário — não re-decidir)

- **Modalidades**: Entrega / Retirar no balcão / Comer no local. Entrega pede endereço; as outras não.
- **Conta obrigatória** (Supabase Auth, email+senha): todo pedido exige login, sem checkout de convidado. Cliente acompanha os próprios pedidos e status em "Meus pedidos".
- **Pagamento híbrido por pedido**: online via **Mercado Pago** (Checkout Pro) OU pagar na entrega/retirada (dinheiro/cartão/pix — só registrado como preferência, sem cobrança).

## Contexto técnico importante

- Este repo é **só o site do cliente**; cozinha/gestão são apps separados no mesmo Supabase. O vocabulário de `status` de `pedidos` precisa ser reconciliado com o app da cozinha — maior risco de retrabalho.
- **Next 16 deste repo: `middleware.ts` está deprecated — usar `src/proxy.ts`** (exporta `proxy`, mesma API de NextRequest/NextResponse/matcher, sempre Node runtime). `params`/`cookies()` são Promises (`await`). Consultar `node_modules/next/dist/docs/` antes de escrever código novo (regra do AGENTS.md).
- O botão "Finalizar pedido" em `src/components/carrinho/CartDrawer.tsx` ainda não tem onClick — é o ponto de entrada do checkout.
- Client service-role existente: `src/lib/supabase.ts` (server-only). Carrinho: `src/contexts/CartContext.tsx` (`useCart()`), tipo `CartItem` em `src/types/carrinho.ts`.

## Dados (Supabase) — propor, conferindo antes o que já existe no projeto

- `pizzarias`: adicionar `aceita_local boolean default false` (+ refletir em `src/types/cardapio.ts` e no select da rota).
- `perfis`: id = auth.users.id, nome, telefone, timestamps. RLS owner-only. Conta é global na plataforma (não por tenant).
- `enderecos_cliente`: cliente_id, apelido, rua, numero, complemento, bairro, cidade, cep, referencia. RLS owner-only.
- `pedidos`: pizzaria_id, cliente_id, numero, modalidade (`entrega|retirada|local`), status (`recebido|em_preparo|pronto|saiu_para_entrega|entregue|concluido|cancelado` — **validar com a cozinha**), nome/telefone snapshot, endereco_entrega jsonb, observacao, subtotal, taxa_entrega, taxa_servico, total, forma_pagamento (`online|na_entrega`), metodo_pagamento_local, status_pagamento (`pendente|pago|falhou|estornado`), mercadopago_preference_id/payment_id, timestamps. RLS: cliente só SELECT das próprias linhas; INSERT/UPDATE só service-role.
- `itens_pedido`: espelha `CartItem` linha a linha (tipo, nome, descricao, produto_id, variacao_id, tamanho, preco_unit, quantidade, sabores jsonb, adicionais jsonb).

## Auth

- Instalar `@supabase/ssr`. Env novas: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `src/lib/supabase/client.ts` (browser) e `src/lib/supabase/server.ts` (via `await cookies()`).
- `src/proxy.ts`: refresh de sessão + gate de `/[slug]/conta/**` e `/[slug]/checkout/**` → redirect `/[slug]/entrar?redirect=...`. Server Actions sensíveis revalidam `auth.getUser()` internamente (proxy não cobre tudo).
- `src/lib/actions/auth.ts`: signUp (cria user + linha em `perfis`), signIn, signOut — com `useActionState`.
- Páginas: `src/app/[slug]/entrar/page.tsx`, `src/app/[slug]/cadastro/page.tsx`.
- Mover `CartProvider`/`ProdutoDetalheProvider`/`CardapioProvider` para `src/app/[slug]/layout.tsx` (checkout e conta também precisam).

## Checkout — rota dedicada (`/[slug]/checkout`), não modal

Motivo: redirect de ida/volta pro Mercado Pago não sobrevive a estado de modal; o carrinho sobrevive (localStorage).

Etapas (useState de passo em `src/app/[slug]/checkout/page.tsx`, componentes em `src/components/checkout/`):
1. **Modalidade** — filtrada por `aceita_entrega`/`aceita_retirada`/`aceita_local`.
2. **Endereço** (só entrega) — frete via novo helper puro `src/lib/frete.ts::calcularFrete(config_frete, bairro)`.
3. **Dados pessoais** — nome/telefone pré-preenchidos de `perfis`, email read-only.
4. **Pagamento** — Mercado Pago agora vs na entrega/retirada (sub-opção dinheiro/cartão/pix).
5. **Revisão** — reusa `useCart()` + `formatarPreco`, mesmos formatos do `CartDrawer`.
6. Confirmar → Server Action `src/lib/actions/pedidos.ts::criarPedido`: revalida auth, **recalcula tudo server-side** (subtotal, frete, taxa, pedido_minimo), insere `pedidos`+`itens_pedido`. Branch: `na_entrega` → confirma e redireciona pro pedido; `online` → cria preferência MP e redireciona pro init_point. `clear()` do carrinho só após confirmação (no retorno do MP, nunca antes).

## Mercado Pago

- Instalar `mercadopago` (SDK v2). Env: `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `NEXT_PUBLIC_SITE_URL`.
- `src/lib/mercadopago.ts::criarPreferencia` — `external_reference = pedidos.id`.
- `src/app/api/pagamentos/webhook/route.ts` (POST): valida assinatura, re-busca o pagamento na API do MP pelo id (não confiar no body), atualiza `status_pagamento` via service-role.
- `src/app/[slug]/checkout/retorno/page.tsx`: lê `?pedido=`, confirma status (polling curto se webhook atrasar), limpa carrinho, linka pro pedido.

## Meus pedidos

- `src/app/[slug]/conta/page.tsx` (perfil + logout), `conta/pedidos/page.tsx` (lista RLS-scoped filtrada por pizzaria do slug), `conta/pedidos/[id]/page.tsx` (detalhe).
- Status ao vivo: `src/components/conta/PedidoStatusLive.tsx` — Supabase Realtime (`postgres_changes` em `pedidos`) com fallback de polling ~15s. Requer habilitar Realtime na tabela `pedidos` no dashboard.

## Fases (cada uma testável)

1. **Schema** — conferir o que já existe no Supabase, criar tabelas + `aceita_local` + RLS + grants (lembrar do `grants.sql` — este projeto já teve "permission denied" por falta de GRANT).
2. **Auth** — ssr, proxy, entrar/cadastro, providers no layout. Testar: cadastro cria `perfis`; `/conta` deslogado redireciona.
3. **Checkout sem MP** — só "pagar na entrega/retirada". Testar as 3 modalidades + totais + frete.
4. **Mercado Pago** — sandbox + túnel local pro webhook.
5. **Meus pedidos + Realtime** — mudar status no dashboard e ver a página atualizar.

## Novas dependências

`@supabase/ssr`, `mercadopago`. Sem zod/react-hook-form por ora (validação manual + `useActionState`).
