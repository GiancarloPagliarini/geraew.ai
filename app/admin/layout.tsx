'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Image,
  CreditCard,
  Upload,
  ArrowLeft,
  Loader2,
  Shield,
  Handshake,
  FileText,
  Banknote,
  MessageSquareHeart,
  ThumbsUp,
  Rss,
  BrainCircuit,
  Megaphone,
  Mail,
  Infinity as InfinityIcon,
  Link2,
  Clock,
  Cloud,
  Tags,
  ChevronDown,
  Settings,
} from 'lucide-react';
import Link from 'next/link';

type NavItem = { href: string; label: string; icon: React.ElementType };
type NavGroup = { id: string; label: string; icon: React.ElementType; items: NavItem[] };

const DASHBOARD: NavItem = { href: '/admin', label: 'Dashboard', icon: LayoutDashboard };

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'usuarios',
    label: 'Usuários',
    icon: Users,
    items: [
      { href: '/admin/usuarios', label: 'Usuários', icon: Users },
      { href: '/admin/geracoes', label: 'Gerações', icon: Image },
      { href: '/admin/filas-ilimitado', label: 'Fila Ilimitada', icon: InfinityIcon },
      { href: '/admin/feedback', label: 'Feedback', icon: MessageSquareHeart },
    ],
  },
  {
    id: 'ia',
    label: 'IA & Modelos',
    icon: BrainCircuit,
    items: [
      { href: '/admin/modelos', label: 'Modelos', icon: BrainCircuit },
      { href: '/admin/vertex', label: 'Vertex', icon: Cloud },
    ],
  },
  {
    id: 'conteudo',
    label: 'Conteúdo',
    icon: FileText,
    items: [
      { href: '/admin/prompts', label: 'Prompts', icon: FileText },
      { href: '/admin/prompt-posts', label: 'Posts Públicos', icon: ThumbsUp },
      { href: '/admin/avisos', label: 'Avisos', icon: Megaphone },
      { href: '/admin/comunidade', label: 'Comunidade', icon: Rss },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    icon: Banknote,
    items: [
      { href: '/admin/assinaturas', label: 'Assinaturas', icon: CreditCard },
      { href: '/admin/stripe', label: 'Stripe', icon: Banknote },
      { href: '/admin/precificacao', label: 'Precificação', icon: Tags },
      { href: '/admin/afiliados', label: 'Afiliados', icon: Handshake },
    ],
  },
  {
    id: 'sistema',
    label: 'Sistema',
    icon: Settings,
    items: [
      { href: '/admin/emails', label: 'Emails', icon: Mail },
      { href: '/admin/uploads', label: 'Uploads', icon: Upload },
      { href: '/admin/utm', label: 'UTM Builder', icon: Link2 },
      { href: '/admin/crons', label: 'Crons', icon: Clock },
    ],
  },
];

function isItemActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={item.label}
      className={`group/nav relative flex items-center justify-center rounded-lg p-2.5 text-[13px] transition-all duration-200 md:justify-start md:gap-2.5 md:px-2.5 md:py-[7px] ${active
        ? 'bg-[#a2dd00]/[0.1] font-semibold text-[#a2dd00]'
        : 'font-medium text-[#f3f0ed]/55 hover:bg-[#f3f0ed]/[0.04] hover:text-[#f3f0ed]'
        }`}
    >
      <Icon
        className={`h-5 w-5 shrink-0 transition-colors md:h-4 md:w-4 ${active ? 'text-[#a2dd00]' : 'text-[#f3f0ed]/40 group-hover/nav:text-[#f3f0ed]/75'
          }`}
      />
      <span className="hidden truncate md:block">{item.label}</span>
    </Link>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const g of NAV_GROUPS) {
      initial[g.id] = g.items.some((it) => isItemActive(pathname, it.href));
    }
    return initial;
  });

  // Garante que a seção da rota atual fique aberta ao navegar (sem fechar as que o usuário abriu)
  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const g of NAV_GROUPS) {
        if (g.items.some((it) => isItemActive(pathname, it.href))) next[g.id] = true;
      }
      return next;
    });
  }, [pathname]);

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
      <aside className="fixed left-0 top-0 z-30 flex h-screen w-14 flex-col border-r border-[#f3f0ed]/[0.06] bg-gradient-to-b from-[#161d1f] to-[#12181a] md:w-56">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-center border-b border-[#f3f0ed]/[0.06] md:justify-start md:gap-3 md:px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#a2dd00]/25 to-[#a2dd00]/[0.08] ring-1 ring-inset ring-[#a2dd00]/25">
            <Shield className="h-4 w-4 text-[#a2dd00]" />
          </div>
          <div className="hidden leading-none md:block">
            <p className="text-[15px] font-bold tracking-tight text-[#f3f0ed]">Geraew</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f3f0ed]/35">Admin</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="no-scrollbar flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2 md:p-3">
          <NavLink item={DASHBOARD} active={pathname === '/admin'} />

          {NAV_GROUPS.map((group) => {
            const GroupIcon = group.icon;
            const hasActive = group.items.some((it) => isItemActive(pathname, it.href));
            const isOpen = openGroups[group.id];
            return (
              <div key={group.id} className="mt-1.5 flex flex-col first:mt-0.5">
                <button
                  type="button"
                  onClick={() => setOpenGroups((p) => ({ ...p, [group.id]: !p[group.id] }))}
                  title={group.label}
                  className="group/sec flex items-center justify-center rounded-lg p-2.5 transition-colors hover:bg-[#f3f0ed]/[0.03] md:justify-between md:gap-2 md:px-2.5 md:py-1.5"
                >
                  <span className="flex items-center gap-2.5 md:gap-2">
                    <GroupIcon
                      className={`h-5 w-5 shrink-0 transition-colors md:h-3.5 md:w-3.5 ${hasActive ? 'text-[#a2dd00]/80' : 'text-[#f3f0ed]/35 group-hover/sec:text-[#f3f0ed]/60'
                        }`}
                    />
                    <span
                      className={`hidden text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors md:block ${hasActive ? 'text-[#f3f0ed]/75' : 'text-[#f3f0ed]/35 group-hover/sec:text-[#f3f0ed]/55'
                        }`}
                    >
                      {group.label}
                    </span>
                  </span>
                  <ChevronDown
                    className={`hidden h-3 w-3 shrink-0 text-[#f3f0ed]/25 transition-all duration-200 group-hover/sec:text-[#f3f0ed]/50 md:block ${isOpen ? '' : '-rotate-90'
                      }`}
                  />
                </button>

                {isOpen && (
                  <div className="mt-0.5 flex flex-col gap-0.5 md:ml-[17px] md:border-l md:border-[#f3f0ed]/[0.07] md:pl-2">
                    {group.items.map((item) => (
                      <NavLink key={item.href} item={item} active={isItemActive(pathname, item.href)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Back to app */}
        <div className="shrink-0 border-t border-[#f3f0ed]/[0.06] p-2 md:p-3">
          <Link
            href="/workspace"
            title="Voltar ao app"
            className="group/back flex items-center justify-center rounded-lg p-2.5 text-[13px] font-medium text-[#f3f0ed]/45 transition-colors hover:bg-[#f3f0ed]/[0.04] hover:text-[#f3f0ed]/80 md:justify-start md:gap-2.5 md:px-2.5 md:py-2"
          >
            <ArrowLeft className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover/back:-translate-x-0.5 md:h-4 md:w-4" />
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
