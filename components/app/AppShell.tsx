'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ShellProvider } from '@/components/app/shell-context';
import { AppSidebar } from '@/components/app/AppSidebar';
import { AppTopbar } from '@/components/app/AppTopbar';
import { CommandPalette } from '@/components/app/CommandPalette';

/**
 * Shell da plataforma logada (Geraew 2.0): dois "cards gigantes" (sidebar +
 * área principal) flutuando sobre o fundo profundo. As telas internas
 * (Início, Comunidade, Galeria…) renderizam dentro do card principal.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  return (
    <ShellProvider>
      <div className="flex h-dvh gap-3 bg-app-deep p-3 font-sans text-app-text">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto rounded-[18px] border border-app-hairline bg-app-bg scrollbar-app">
          <AppTopbar />
          {children}
        </main>
      </div>
      <CommandPalette />
    </ShellProvider>
  );
}
