# Hardening de segurança para produção

> **Código concluído e commitado.** RLS versionado e aplicado (`supabase/rls.sql`
> + `supabase/audit.sql`), guard estrutural no analytics da gestão, rate limit no
> criarPedido, security headers + CSP nos 3 apps, service-role trocado por anon/SSR
> onde o RLS basta, pedido sem cadastro (sessão anônima), deps atualizadas (Next
> 16.2.11, sharp, postcss — `npm audit` = 0), Dependabot configurado.
> **Falta só o que está na checklist abaixo — ações no painel do Supabase/GitHub,
> não código.**

## Checklist pendente

- [ ] **Habilitar "Allow anonymous sign-ins"** (Supabase → Authentication →
      Providers). Sem isso o botão "Pedir sem cadastro" do cardápio (tela
      `/[slug]/entrar`) não funciona — testado e confirmado desabilitado.
- [ ] **Testar login de staff** em `apps/gestao` e `apps/cozinha` (dashboard,
      pedidos, fila da cozinha). O caminho autenticado do `exigirStaff` via
      SSR não pôde ser testado sem credenciais reais.
- [ ] **Security Advisor** do Supabase (Database → Advisors) — linter próprio
      da Supabase, cobre coisas que o `audit.sql` não cobre.
- [ ] **Leaked password protection** (Authentication → Providers → Email) —
      recusa senhas que já vazaram em breaches públicos.
- [ ] **`npm approve-scripts`** — revisar o script de instalação pendente do
      `unrs-resolver` (aviso do npm install; não é CVE, é dependência
      transitiva do toolchain).
- [ ] **Conferir backups** (retenção do plano atual; considerar PITR se o
      negócio crescer).

## Follow-ups arquiteturais (não urgentes)

- **CSP com nonce**: hoje os 3 apps usam CSP *sem* nonce (decisão consciente
  — nonce exige dynamic rendering em toda página, o que mataria o cache de
  CDN do cardápio público, a página de maior tráfego). Reconsiderar só se
  houver requisito de compliance ou dado muito sensível.
- **Rate limit de sessões anônimas**: hoje limitado só pelo teto padrão do
  Supabase (30 sessões/hora por IP). Se aparecer abuso real, considerar
  CAPTCHA invisível no `signInAnonymously` ou apertar o limite no painel.
- **Limpeza de usuários anônimos antigos**: `auth.users` acumula uma linha
  por sessão de convidado; rotina de limpeza (ex.: apagar anônimos com mais
  de 30 dias sem pedido) fica para quando o volume justificar.

## Referências

- `supabase/rls.sql` / `supabase/audit.sql` — estado-desejado do RLS,
  idempotente, e o script de auditoria correspondente.
- `apps/cardapio/src/components/auth/GuestButton.tsx` — pedido sem cadastro.
- `apps/{cardapio,gestao,cozinha}/next.config.ts` — security headers + CSP.
- `.github/dependabot.yml` — atualização semanal de dependências.
