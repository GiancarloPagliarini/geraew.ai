'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { AdminUser } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Coins,
  UserCircle,
  RefreshCw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function planBadge(sub: AdminUser['subscription']) {
  if (!sub)
    return (
      <Badge variant="outline" className="border-[#f3f0ed]/10 text-[#f3f0ed]/30">
        Free
      </Badge>
    );

  const colors: Record<string, string> = {
    starter: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    pro: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
    business: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  };

  return (
    <Badge variant="outline" className={colors[sub.planSlug] ?? 'border-[#f3f0ed]/10 text-[#f3f0ed]/50'}>
      {sub.planName}
    </Badge>
  );
}

function statusBadge(isActive: boolean) {
  return (
    <Badge
      variant="outline"
      className={
        isActive
          ? 'border-green-500/30 bg-green-500/10 text-green-400'
          : 'border-red-500/30 bg-red-500/10 text-red-400'
      }
    >
      {isActive ? 'Ativo' : 'Inativo'}
    </Badge>
  );
}

function statusDot(sub: AdminUser['subscription']) {
  if (!sub) return null;
  const isActive = sub.status === 'ACTIVE' || sub.status === 'active';
  return (
    <span className={`inline-block h-1.5 w-1.5 rounded-full ${isActive ? 'bg-[#a2dd00]' : 'bg-[#f87171]'}`} />
  );
}

function userCredits(user: AdminUser) {
  if (!user.credits) return '0';
  return (user.credits.planCreditsRemaining + user.credits.bonusCreditsRemaining).toLocaleString('pt-BR');
}

export default function AdminUsersPage() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 15;

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'users', page],
    queryFn: () => api.admin.users(accessToken!, page, limit),
    enabled: !!accessToken,
  });

  const users = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 1;

  const filtered = search
    ? users.filter(
        (u) =>
          u.name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()),
      )
    : users;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#f3f0ed] md:text-2xl">Usuários</h1>
          <p className="mt-0.5 text-sm text-[#f3f0ed]/40">
            {total.toLocaleString('pt-BR')} usuários cadastrados
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#f3f0ed]/8 text-[#f3f0ed]/40 transition-colors hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 disabled:opacity-40"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search */}
      <div className="relative w-full md:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#f3f0ed]/30" />
        <Input
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full border-[#f3f0ed]/8 bg-[#f3f0ed]/3 pl-9 text-sm text-[#f3f0ed] placeholder:text-[#f3f0ed]/25 focus-visible:border-[#a2dd00]/30 focus-visible:ring-[#a2dd00]/10"
        />
      </div>

      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
        </div>
      ) : (
        <>
          {/* ── Mobile: lista de cards ── */}
          <div className="flex flex-col gap-2 md:hidden">
            {filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-[#f3f0ed]/30">Nenhum usuário encontrado</p>
            ) : (
              filtered.map((user) => (
                <button
                  key={user.id}
                  onClick={() => router.push(`/admin/usuarios/${user.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/3 px-3 py-3 text-left active:bg-[#f3f0ed]/6"
                >
                  {/* Avatar */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3f0ed]/5">
                    <UserCircle className="h-5 w-5 text-[#f3f0ed]/30" />
                  </div>

                  {/* Nome + email */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#f3f0ed]">{user.name || '—'}</p>
                    <p className="truncate text-xs text-[#f3f0ed]/40">{user.email}</p>
                  </div>

                  {/* Lado direito: plano + créditos */}
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <div className="flex items-center gap-1.5">
                      {statusDot(user.subscription)}
                      {planBadge(user.subscription)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Coins className="h-3 w-3 text-[#a2dd00]/50" />
                      <span className="text-[11px] tabular-nums text-[#f3f0ed]/40">{userCredits(user)}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* ── Desktop: tabela ── */}
          <div className="hidden md:block rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2">
            <Table>
              <TableHeader>
                <TableRow className="border-[#f3f0ed]/6 hover:bg-transparent">
                  <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Usuário</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Plano</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Créditos</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Status</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow
                    key={user.id}
                    onClick={() => router.push(`/admin/usuarios/${user.id}`)}
                    className="cursor-pointer border-[#f3f0ed]/4 transition-colors hover:bg-[#f3f0ed]/3"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f3f0ed]/5">
                          <UserCircle className="h-4 w-4 text-[#f3f0ed]/30" />
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium text-[#f3f0ed]">{user.name || '—'}</span>
                          <span className="truncate text-xs text-[#f3f0ed]/40">{user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {statusDot(user.subscription)}
                        {planBadge(user.subscription)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Coins className="h-3.5 w-3.5 text-[#a2dd00]/50" />
                        <span className="text-sm tabular-nums text-[#f3f0ed]">{userCredits(user)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{statusBadge(user.isActive)}</TableCell>
                    <TableCell>
                      <span className="text-xs tabular-nums text-[#f3f0ed]/40">
                        {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-sm text-[#f3f0ed]/30">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
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
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#f3f0ed]/8 text-[#f3f0ed]/50 transition-colors hover:bg-[#f3f0ed]/5 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#f3f0ed]/8 text-[#f3f0ed]/50 transition-colors hover:bg-[#f3f0ed]/5 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
