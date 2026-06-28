// src/components/cliente/Header.tsx
interface HeaderProps {
  slug: string;
}

export function Header({ slug }: HeaderProps) {
  return (
    <header className="py-6 border-b border-borda-suave">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-manjericao capitalize">
        Pizzaria {slug}
      </h1>
      <p className="text-sm text-creme-muted mt-1">
        <span className="text-manjericao font-bold mr-1">●</span> Aberto agora
      </p>
    </header>
  );
}