# @pizzaorder/supabase-mock

Este pacote é um mock do Supabase em memória, persistido num JSON. Ele serve para rodar os 3 apps sem banco e sem Docker, por exemplo para desenvolvimento offline, auditorias de UI/a11y/bundle ou demos.

```bash
npm run mock:reset    # (re)cria .mock-db/ a partir do seed
npm run dev:mock      # cardapio :3000, cozinha :3001, gestao :3002
npm run dev:mock -- cozinha gestao   # só alguns apps
```

O modo mock liga com `NEXT_PUBLIC_SUPABASE_MOCK=1`, e o `dev:mock` já define a flag. Sem ela, nada muda: os apps usam o Supabase de verdade.

A flag é recusada quando `VERCEL_ENV=production`.

## Usuários de teste

Todos usam a senha `pizza123`.

| Email | Papel |
|---|---|
| `gerente@pizzariateste.test` | gerente da **pizzaria-teste**: gestão e cozinha |
| `cozinha@pizzariateste.test` | cozinha da **pizzaria-teste** |
| `gerente@fornodavila.test` | gerente da **forno-da-vila** (testa o multi-tenant) |
| `dono@pizzaorder.test` | gerente das duas lojas (testa o seletor de pizzaria) |
| `cliente@pizzaorder.test` | cliente Ana, com endereços e histórico de pedidos |
| `cliente2@pizzaorder.test` | cliente Bruno |

Outros fluxos de login:
- **"Continuar com o Google"** vai direto ao `/auth/callback` e entra como `google.teste@pizzaorder.test` (Carla, cliente).
- **"Pedir sem cadastro"** cria uma sessão anônima nova.

## Dados

O seed é determinístico, então os ids são os mesmos a cada reset. As datas são relativas ao momento do reset.

- **`pizzaria-teste`**:
  - cardápio do `supabase/seed_turbo.sql`, com 1 produto indisponível e a Coca 1L em falta;
  - sempre aberta, então o checkout funciona a qualquer hora;
  - cerca de 30 dias de pedidos;
  - fila ativa (pendente → saiu para entrega) criada no momento do reset.
- **`forno-da-vila`**:
  - cardápio menor e frete por bairro;
  - horário de verdade: ter–dom à noite.

## Como funciona

| Parte | Arquivo | Comportamento |
|---|---|---|
| Factories dos apps | `apps/*/src/lib/supabase*.ts` e `apps/*/src/proxy.ts` | Trocam o client real pelo mock quando a flag está ligada. A assinatura é a mesma. |
| Engine | `src/engine.ts` | Faz select com embeds e `!inner`, filtros, `order`, `count`, `single`/`maybeSingle`, `insert`/`update`/`upsert`/`delete`, defaults, check/unique/FK, cascades e o trigger `atualizado_em`. Também tem a rpc `proximo_numero_pedido`. |
| RLS | `src/policies.ts` | Espelha o `supabase/rls.sql`: o service-role ignora tudo, e anon/authenticated só veem o que as policies liberam. **Ao mudar `rls.sql`, atualize este arquivo também.** |
| Store | `src/store.ts` | Grava em `.mock-db/db.json`, compartilhado pelos 3 processos com lock e escrita atômica. |
| Auth | `src/auth.ts` | A sessão é o cookie `sb-mock-auth-token`, com o id do usuário. Não há JWT. |
| Client de browser | `src/browser.ts` | Fala com `POST /api/mock-supabase`. O realtime é polling de `/api/mock-supabase/changes`, a cada ~1,5s, filtrado pelo RLS. |
| Storage | — | O bucket fica em `.mock-db/storage/` e é servido em `/api/mock-supabase/storage/<bucket>/...`. |

Para rodar os testes:

```bash
npm test --workspace packages/supabase-mock
```

## Limitações

Isto é um mock, não um Postgres:
- Só existe o subconjunto de PostgREST que os apps usam. Operadores novos (`or`, `contains`, `textSearch`…) precisam ser adicionados ao `query-builder.ts`/`engine.ts`.
- Escritas concorrentes entre apps são serializadas por lock de arquivo, mas não há transação entre chamadas. Isso é igual ao supabase-js.
