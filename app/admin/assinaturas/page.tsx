'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { AdminUser } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function subStatusBadge(status: string) {
  const upper = status.toUpperCase();
  const config: Record<string, { color: string; icon: React.ElementType; label: string }> = {
    ACTIVE: { color: 'border-green-500/30 bg-green-500/10 text-green-400', icon: CheckCircle2, label: 'Ativa' },
    CANCELED: { color: 'border-red-500/30 bg-red-500/10 text-red-400', icon: XCircle, label: 'Cancelada' },
    PAST_DUE: { color: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400', icon: AlertTriangle, label: 'Atrasada' },
  };
  const c = config[upper] ?? { color: 'border-[#f3f0ed]/10 text-[#f3f0ed]/40', icon: CreditCard, label: status };
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${c.color}`}>
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  );
}

function planBadge(planSlug: string, planName: string) {
  const colors: Record<string, string> = {
    starter: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    pro: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
    business: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    free: 'border-[#f3f0ed]/10 text-[#f3f0ed]/40',
  };
  return (
    <Badge variant="outline" className={colors[planSlug] ?? 'border-[#f3f0ed]/10 text-[#f3f0ed]/40'}>
      {planName}
    </Badge>
  );
}

export default function AdminSubscriptionsPage() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, 'subscriptions'],
    queryFn: () => api.admin.users(accessToken!, page, limit),
    enabled: !!accessToken,
  });

  const allUsers = data?.data ?? [];
  const subscribedUsers = allUsers.filter((u: AdminUser) => u.subscription !== null);
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 1;

  // Summary stats
  const activeCount = allUsers.filter(
    (u: AdminUser) => u.subscription?.status?.toUpperCase() === 'ACTIVE',
  ).length;
  const planCounts = allUsers.reduce<Record<string, number>>((acc, u: AdminUser) => {
    const slug = u.subscription?.planSlug ?? 'free';
    acc[slug] = (acc[slug] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#f3f0ed]">Assinaturas</h1>
        <p className="mt-1 text-sm text-[#f3f0ed]/40">Gerenciamento de planos e assinaturas</p>
      </div>

      {/* Plan distribution */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { slug: 'free', label: 'Free', color: '#f3f0ed' },
          { slug: 'starter', label: 'Starter', color: '#60a5fa' },
          { slug: 'pro', label: 'Pro', color: '#a78bfa' },
          { slug: 'business', label: 'Business', color: '#fbbf24' },
          { slug: '_active', label: 'Ativas', color: '#a2dd00' },
        ].map((p) => (
          <div
            key={p.slug}
            className="flex flex-col gap-2 rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] p-4"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">
              {p.label}
            </span>
            <span className="text-2xl font-bold tabular-nums" style={{ color: p.color }}>
              {p.slug === '_active' ? activeCount : planCounts[p.slug] ?? 0}
            </span>
          </div>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
        </div>
      ) : (
        <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02]">
          <Table>
            <TableHeader>
              <TableRow className="border-[#f3f0ed]/6 hover:bg-transparent">
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Usuário</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Plano</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Status</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Créditos Plano</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Créditos Bônus</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Cadastro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(subscribedUsers.length > 0 ? subscribedUsers : allUsers).map((user: AdminUser) => (
                <TableRow
                  key={user.id}
                  onClick={() => router.push(`/admin/usuarios/${user.id}`)}
                  className="cursor-pointer border-[#f3f0ed]/4 transition-colors hover:bg-[#f3f0ed]/[0.03]"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-[#f3f0ed]/30" />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-[#f3f0ed]/70">{user.name || '—'}</span>
                        <span className="text-[10px] text-[#f3f0ed]/30">{user.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.subscription
                      ? planBadge(user.subscription.planSlug, user.subscription.planName)
                      : <Badge variant="outline" className="border-[#f3f0ed]/10 text-[#f3f0ed]/30">Free</Badge>}
                  </TableCell>
                  <TableCell>
                    {user.subscription
                      ? subStatusBadge(user.subscription.status)
                      : <span className="text-xs text-[#f3f0ed]/30">—</span>}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs tabular-nums text-[#f3f0ed]">
                      {user.credits?.planCreditsRemaining?.toLocaleString('pt-BR') ?? '0'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs tabular-nums text-[#a2dd00]">
                      {user.credits?.bonusCreditsRemaining?.toLocaleString('pt-BR') ?? '0'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs tabular-nums text-[#f3f0ed]/40">
                      {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#f3f0ed]/30">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f3f0ed]/8 text-[#f3f0ed]/50 transition-colors hover:bg-[#f3f0ed]/5 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f3f0ed]/8 text-[#f3f0ed]/50 transition-colors hover:bg-[#f3f0ed]/5 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
