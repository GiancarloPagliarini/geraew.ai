'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Image,
  CreditCard,
  ArrowLeft,
  Loader2,
  Shield,
} from 'lucide-react';
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/usuarios', label: 'Usuários', icon: Users },
  { href: '/admin/geracoes', label: 'Gerações', icon: Image },
  { href: '/admin/assinaturas', label: 'Assinaturas', icon: CreditCard },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#111618]">
        <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="flex min-h-screen bg-[#111618]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-30 flex h-screen w-56 flex-col border-r border-[#f3f0ed]/6 bg-[#141a1c]">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 border-b border-[#f3f0ed]/6 px-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#a2dd00]/15">
            <Shield className="h-3.5 w-3.5 text-[#a2dd00]" />
          </div>
          <span className="text-sm font-bold text-[#f3f0ed]">Geraew Admin</span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all ${
                  isActive
                    ? 'bg-[#a2dd00]/10 text-[#a2dd00]'
                    : 'text-[#f3f0ed]/50 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/80'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Back to app */}
        <div className="border-t border-[#f3f0ed]/6 p-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] text-[#f3f0ed]/40 transition-colors hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao app
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-56 flex-1">
        <div className="mx-auto max-w-7xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
