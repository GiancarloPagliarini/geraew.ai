'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Image,
  CreditCard,
  Upload,
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
  { href: '/admin/uploads', label: 'Uploads', icon: Upload },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) {
      router.push('/workspace');
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
    <div className="flex min-h-screen overflow-x-hidden bg-[#111618]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-30 flex h-screen w-14 flex-col border-r border-[#f3f0ed]/6 bg-[#141a1c] md:w-56">
        {/* Logo */}
        <div className="flex h-14 items-center justify-center border-b border-[#f3f0ed]/6 md:justify-start md:gap-2.5 md:px-5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#a2dd00]/15">
            <Shield className="h-3.5 w-3.5 text-[#a2dd00]" />
          </div>
          <span className="hidden text-sm font-bold text-[#f3f0ed] md:block">Geraew Admin</span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 p-2 md:p-3">
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
                title={item.label}
                className={`flex items-center justify-center rounded-xl p-2.5 transition-all md:justify-start md:gap-2.5 md:px-3 md:py-2.5 md:text-[13px] md:font-medium ${
                  isActive
                    ? 'bg-[#a2dd00]/10 text-[#a2dd00]'
                    : 'text-[#f3f0ed]/50 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/80'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0 md:h-4 md:w-4" />
                <span className="hidden md:block">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Back to app */}
        <div className="border-t border-[#f3f0ed]/6 p-2 md:p-3">
          <Link
            href="/workspace"
            title="Voltar ao app"
            className="flex items-center justify-center rounded-xl p-2.5 text-[#f3f0ed]/40 transition-colors hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 md:justify-start md:gap-2 md:px-3 md:py-2.5 md:text-[13px]"
          >
            <ArrowLeft className="h-5 w-5 shrink-0 md:h-4 md:w-4" />
            <span className="hidden md:block">Voltar ao app</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-14 min-w-0 w-[calc(100%-3.5rem)] md:ml-56 md:w-[calc(100%-14rem)]">
        <div className="w-full px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
