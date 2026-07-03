// src/app/page.tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-display font-bold text-manjericao mb-2">Bem-vindo ao PizzaOrder</h1>
        <p className="text-sm text-creme-muted mb-4">Página de exemplo — use uma rota com <em>slug</em> para ver o cardápio.</p>

        <div className="space-y-2">
          <Link href="/pizzaria-teste" className="block w-full text-center bg-pomodoro text-white py-2 rounded-md">Abrir /pizzaria-teste</Link>
        </div>
      </div>
    </main>
  );
}
