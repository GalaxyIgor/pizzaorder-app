# Plano: Site da Cozinha (KDS) + Monorepo

> Plano aprovado e **fases 1–6 implementadas em 2026-07-04** (monorepo, SQL,
> cardápio atualizado, apps/cozinha com painel/realtime/som/comanda/histórico/pausa).
> **Falta para funcionar**: (1) rodar `supabase/cozinha.sql` no SQL Editor do Supabase;
> (2) criar um usuário staff no dashboard e inseri-lo em `staff_pizzaria` (seed
> comentado no fim do próprio SQL). Fase 7 (status ao vivo no cardápio) pendente.

## Contexto

O pizzaorder-app hoje é só o site do cliente (cardápio + checkout + "Meus pedidos"). A cozinha precisa de um app próprio para receber e operar os pedidos — hoje ninguém consegue mudar o `status` de um pedido (UPDATE é só service-role e não há UI). Decisões confirmadas com o usuário nesta sessão (2026-07-04) — **não re-decidir**:

- **Monorepo** com npm workspaces: `apps/cardapio` (app atual movido) + `apps/cozinha` (novo) + `packages/shared` (types comuns), compartilhando o mesmo Supabase.
- **Novo vocabulário de status (aceite explícito, 6 valores)**: `pendente` → `em_preparo` (cozinha aceita, informando tempo estimado) → `pronto` → `saiu_para_entrega` (só entrega) → `concluido` (terminal único) + `cancelado` (recusa/cancelamento, com motivo). Renomeia `recebido`→`pendente`, remove `entregue`. Banco não está em produção — migração barata, mas o cardápio precisa ser atualizado junto.
- **Auth da cozinha**: Supabase Auth + tabela `staff_pizzaria` (user_id ↔ pizzaria_id + papel) + RLS de SELECT para staff. Contas criadas manualmente (dashboard/SQL) por ora.
- **MVP**: tempo real + som, aceite/recusa com máquina de estados, tempo estimado (visível pro cliente), motivo de cancelamento (**só interno** — cliente vê apenas "Cancelado"; o motivo é para o futuro site de gestão), histórico do dia, impressão de comanda, pausar pedidos.

Regra transversal (AGENTS.md): Next 16 deste projeto tem breaking changes — consultar `node_modules/next/dist/docs/` antes de codar; `src/proxy.ts` no lugar de `middleware.ts`; `params`/`cookies()` são Promises.

## Fase 1 — Monorepo (só reestruturação, zero features)

Estrutura alvo:

```
pizzaorder-app/
├── package.json          # raiz: workspaces ["apps/*","packages/*"], private
├── package-lock.json     # único lockfile
├── AGENTS.md, CLAUDE.md, docs/, supabase/, .claude/   # ficam na raiz
├── packages/shared/      # @pizzaorder/shared: StatusPedido, STATUS_LABEL,
│                         # Modalidade, tipos de pedido, formatarPreco — SÓ isso
└── apps/
    ├── cardapio/         # app atual movido (src/, public/, configs, .env.local)
    └── cozinha/          # novo (fase 4), next dev -p 3001
```

- `git mv` de `src`, `public`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `next-env.d.ts`, `.env.example`, `package.json` → `apps/cardapio/`. Mover `.env.local` manualmente; apagar `.next/` e `node_modules` (reinstalar na raiz).
- Scripts na raiz: `dev:cardapio`, `dev:cozinha` (`--workspace`), `build` com `--workspaces --if-present`.
- `packages/shared` **sem build step**: `exports` apontando para `.ts` fonte + `transpilePackages: ['@pizzaorder/shared']` no `next.config.ts` de cada app. `src/types/pedido.ts` do cardápio passa a reexportar do shared (mantém os imports existentes intactos). Não compartilhar UI/contexts/clients Supabase — duplicar é mais simples.
- `.env.local` dentro de cada app (mesmas 4 vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
- Windows/OneDrive: npm usa junctions (ok); recomendar excluir `node_modules`/`.next` do sync do OneDrive.

**Verificar**: `npm install` na raiz; fluxo completo do cardápio (pedido de ponta a ponta); `npm run build -w apps/cardapio`; `git log --follow` mostra history.

## Fase 2 — Migração SQL (`supabase/cozinha.sql`, novo)

1. **Vocabulário**: drop do `pedidos_status_check`; `UPDATE` de `recebido`→`pendente` e `entregue`→`concluido`; novo CHECK com os 6 valores; `default 'pendente'`.
2. **Colunas novas**: `pedidos.previsao_pronto_em timestamptz` (timestamp absoluto, não minutos — sem ambiguidade e permite countdown), `pedidos.motivo_cancelamento text`, `pizzarias.pedidos_pausados boolean not null default false`.
3. **Staff + RLS**:
   - `staff_pizzaria (user_id, pizzaria_id, papel check ('cozinha','gerente'), criado_em, PK (user_id, pizzaria_id))`, RLS com policy `staff_select_own` (`user_id = auth.uid()`).
   - Função `is_staff_da_pizzaria(uuid)` security definer.
   - Policies de **SELECT** para staff em `pedidos` e `itens_pedido` (necessárias também para o Realtime, que respeita RLS).
   - **Sem policy de UPDATE para staff** (RLS não restringe colunas): toda escrita vai por server action com service-role + checagem de vínculo + máquina de estados — mesmo padrão do `criarPedido` existente.
   - `pizzarias` hoje está sem RLS e `grants.sql` deu ALL a `anon` — habilitar RLS + policy de SELECT público (`using (ativo)`); escritas já são service-role.
4. **Infra**: trigger `before update` setando `atualizado_em` (hoje não existe); `alter publication supabase_realtime add table pedidos;` + `replica identity full`; bloco de grants padrão do projeto (histórico de "permission denied"); bloco comentado de seed de staff (criar user no dashboard + insert em `staff_pizzaria`).

**Verificar**: no SQL Editor, statuses só no vocabulário novo; user staff de teste lê pedidos da sua pizzaria (e não de outra) e não consegue UPDATE direto; cliente segue vendo só os próprios. ⚠️ Rodar fases 2 e 3 em sequência (o badge do cardápio quebra para `pendente` até a fase 3).

## Fase 3 — Atualizar `apps/cardapio`

- `packages/shared/src/pedido.ts`: novo `StatusPedido`, `STATUS_LABEL` (`pendente: 'Aguardando confirmação'`), `previsao_pronto_em` em `PedidoDetalhe`. (Não expor `motivo_cancelamento` ao cliente — decisão: só interno.)
- `apps/cardapio/src/components/conta/StatusBadge.tsx`: cores para as 6 chaves.
- Detalhe do pedido (`conta/pedidos/[id]/page.tsx`): exibir previsão ("Previsão: 20:45") quando status ∈ `em_preparo`/`pronto` e não nula. Cancelado exibe só o badge.
- **Pausa**: `api/cardapio/[slug]/route.ts` + `types/cardapio.ts` ganham `pedidos_pausados`; banner no cardápio (novo componente pequeno via `CardapioContext`); checkout desabilita finalizar; **e** `criarPedido` em `src/lib/actions/pedidos.ts` valida server-side e retorna erro se pausado.

**Verificar**: pedido nasce `pendente` com badge certo; UPDATEs manuais no SQL Editor refletem previsão; pausar via SQL → banner + checkout bloqueado + `criarPedido` recusa. Build verde.

## Fase 4 — `apps/cozinha` básico (login + painel + status)

- Bootstrap copiando de `apps/cardapio`: `next.config.ts`, `tsconfig.json`, postcss/eslint configs e os 3 clients Supabase (`src/lib/supabase.ts` service-role, `supabase/server.ts`, `supabase/client.ts`).
- Rotas: `/login` (email/senha, sem cadastro; pós-login consulta `staff_pizzaria` join `pizzarias(slug)` → 1 vínculo redirect `/[slug]`, vários → escolha, nenhum → signOut + erro), `/[slug]` (painel), `/[slug]/historico`, `/[slug]/pedidos/[id]/comanda`.
- `apps/cozinha/src/proxy.ts`: mesmo padrão do cardápio — refresh de sessão + redirect `/login`. Só UX; actions revalidam.
- Guard central `src/lib/staff.ts::exigirStaff(slug)` → `{ user, pizzaria }` (usado em todas as pages/actions).
- Server action `src/lib/actions/pedidos.ts::atualizarStatusPedido({ slug, pedidoId, novoStatus, minutosEstimados?, motivo? })`: `exigirStaff` + máquina de estados (`pendente→em_preparo|cancelado`; `em_preparo→pronto|cancelado`; `pronto→concluido|saiu_para_entrega(só entrega)|cancelado`; `saiu_para_entrega→concluido|cancelado`; terminais imutáveis); `em_preparo` exige minutos → grava `previsao_pronto_em = now()+X`; `cancelado` exige motivo; update service-role só das colunas permitidas; `revalidatePath`.
- Painel para tablet/desktop: **3 colunas** — "Novos" (pendente, destaque forte), "Em preparo", "Prontos/Em rota"; abas com contadores em tela estreita. Componentes: `PainelPedidos` (client), `PedidoCard` (nº, tempo decorrido, modalidade, itens/sabores/adicionais, observação em destaque, total/pagamento, ações por estado), `AceitarDialog` (presets 20/30/40/50/60 min), `RecusarDialog` (motivo obrigatório), `HeaderCozinha`. Nesta fase: fetch server-side + polling ~15s (realtime é a fase 5).

**Verificar**: login staff cai na pizzaria certa; sem vínculo/slug alheio → barrado; dois browsers: cliente pede → cozinha aceita 40min → cliente vê "Em preparo"+previsão → pronto → concluído; recusa registra motivo (cliente vê só "Cancelado"); transições inválidas rejeitadas.

## Fase 5 — Realtime + som

- `PainelPedidos` assina `postgres_changes` (`filter: pizzaria_id=eq.<id>`) com o browser client (sessão staff — depende da policy de SELECT da fase 2 e do `replica identity full`). Em refresh de token, repassar com `supabase.realtime.setAuth()`.
- Ao receber evento: **refazer o fetch da lista** (não fazer merge do payload) + manter polling de fallback 30–60s.
- **Som/autoplay**: overlay "Iniciar turno" no load (interação desbloqueia áudio); toggle som ativo/mudo no header; em INSERT `pendente`: som (`public/alerta.mp3`) + coluna "Novos" pisca + contador no `document.title`.

**Verificar**: pedido novo aparece sem refresh com som; sem interação prévia, alerta visual funciona; queda/retorno de rede recupera; staff de outra pizzaria não recebe eventos.

## Fase 6 — Extras da cozinha

1. **Comanda**: `/[slug]/pedidos/[id]/comanda` — layout ~80mm fonte mono (itens, sabores, adicionais, observação, endereço, pagamento, previsão), `@media print`, botão `window.print()`; link no `PedidoCard` (nova aba).
2. **Histórico do dia**: `concluido`/`cancelado` com `criado_em` do dia local (atenção ao fuso do Brasil); totais: nº pedidos, faturamento (soma dos concluídos), cancelamentos.
3. **Pausar loja**: toggle no `HeaderCozinha` → action `pausarLoja` (service-role + `exigirStaff`).

**Verificar**: preview de impressão legível; histórico bate com SQL; pausa reflete no cardápio e bloqueia `criarPedido`.

## Fase 7 (opcional, por último) — Status ao vivo no cardápio

`apps/cardapio/src/components/conta/PedidoStatusLive.tsx` na página de detalhe: subscription `id=eq.<pedidoId>` (policy `pedidos_select_own` já cobre) + fallback `router.refresh()` 30s. Mesma infra da fase 5; se apertar, cliente vive com refresh manual.

## Riscos

| Risco | Mitigação |
|---|---|
| Realtime não entrega ao staff (RLS) | Policy de SELECT staff + `replica identity full` + teste explícito na fase 5 |
| Autoplay de áudio bloqueado | Overlay "Iniciar turno"; alerta visual sempre funciona |
| Monorepo quebrar dev/deploy | Fase 1 isolada e verificada; na Vercel, um projeto por app com Root Directory |
| Janela quebrada entre fases 2–3 (rename de status) | Rodar em sequência imediata (banco só tem seed) |
| `pizzarias` sem RLS + grants ALL para anon | Habilitar RLS + SELECT público na migração |
| Staff alterar colunas indevidas | Sem policy de UPDATE; escrita só via server action service-role com máquina de estados |
| OneDrive + node_modules | Excluir `node_modules`/`.next` do sync |

## Arquivos críticos

- `supabase/checkout.sql` — base que `supabase/cozinha.sql` estende
- `src/lib/actions/pedidos.ts` — padrão service-role a replicar; ganha check de pausa
- `src/types/pedido.ts` — vira `packages/shared` (fonte única do vocabulário)
- `src/proxy.ts` — modelo do gate de auth da cozinha (Next 16)
- `package.json` — raiz do monorepo (fase 1)
