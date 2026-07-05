// src/components/layout/LogoutForm.tsx
'use client';

import { signOut } from '@/lib/actions/auth';

export function LogoutForm({ slug }: { slug: string }) {
  return (
    <form action={() => signOut(slug)}>
      <button
        type="submit"
        className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-carbono hover:bg-massa-bg transition-colors border-t border-borda-suave"
      >
        <span>🚪</span>
        Sair
      </button>
    </form>
  );
}
