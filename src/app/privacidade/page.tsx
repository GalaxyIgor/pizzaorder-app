// src/app/privacidade/page.tsx
//
// Política de privacidade genérica, linkada pelo aviso de cookies.
// Texto base para o estado atual do produto — ajustar quando entrar
// pagamento online / analytics.

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Política de privacidade — PizzaOrder',
  description: 'Como o PizzaOrder usa seus dados e cookies.',
};

export default function PrivacidadePage() {
  return (
    <div className="max-w-full sm:max-w-md md:max-w-2xl mx-auto p-4 sm:p-6 min-h-screen pb-12">
      <header className="py-6 border-b border-borda-suave">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-carbono">
          Política de privacidade
        </h1>
        <p className="text-sm text-creme-muted mt-1">
          Como o PizzaOrder usa seus dados e cookies.
        </p>
      </header>

      <main className="mt-6 space-y-6 text-sm text-carbono leading-relaxed">
        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">Quais dados coletamos</h2>
          <p className="text-creme-muted">
            Para você fazer pedidos, guardamos os dados da sua conta (nome, email e
            telefone), os endereços de entrega que você escolher salvar e o histórico
            dos seus pedidos em cada pizzaria.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">Cookies essenciais</h2>
          <p className="text-creme-muted">
            Usamos cookies estritamente necessários para manter sua sessão de login
            ativa e segura. Sem eles, não é possível finalizar pedidos nem acompanhar
            o status. Por serem essenciais, eles não dependem do seu consentimento.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">Cookies adicionais</h2>
          <p className="text-creme-muted">
            Hoje não usamos cookies de análise, publicidade ou de terceiros. Se isso
            mudar, esses cookies só serão ativados se você tiver aceitado no aviso de
            cookies — e a sua escolha (aceitar ou recusar) fica guardada no seu
            próprio navegador.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">Sacola de compras</h2>
          <p className="text-creme-muted">
            Os itens da sua sacola ficam salvos apenas no seu navegador
            (armazenamento local), para você não perder o pedido ao fechar a página.
            Eles só são enviados aos nossos servidores quando você confirma o pedido.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">Com quem compartilhamos</h2>
          <p className="text-creme-muted">
            Os dados do pedido são compartilhados com a pizzaria escolhida, apenas
            para preparo e entrega. Não vendemos nem compartilhamos seus dados com
            terceiros para fins de marketing.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-bold">Seus direitos</h2>
          <p className="text-creme-muted">
            Nos termos da LGPD, você pode solicitar acesso, correção ou exclusão dos
            seus dados a qualquer momento pelos canais de contato da pizzaria ou do
            PizzaOrder.
          </p>
        </section>
      </main>

      <p className="mt-8">
        <Link href="/" className="text-pomodoro font-semibold text-sm hover:underline">
          ← Voltar ao início
        </Link>
      </p>
    </div>
  );
}
