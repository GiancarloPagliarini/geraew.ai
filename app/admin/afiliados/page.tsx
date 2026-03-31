'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { Affiliate, AffiliateEarning, AffiliateDashboard, AffiliateEarningsResponse } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Loader2,
  RefreshCw,
  Plus,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  Power,
  ChevronLeft,
  Eye,
  Copy,
  Check,
  Link,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

function formatCents(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR');
}

// ─── Dashboard Cards ────────────────────────────────────────────────────────

function DashboardView({ dashboard, isLoading }: { dashboard: AffiliateDashboard | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
      </div>
    );
  }

  if (!dashboard) return null;

  const cards = [
    { label: 'Afiliados Ativos', value: `${dashboard.activeAffiliates}/${dashboard.totalAffiliates}`, icon: Users, color: 'text-blue-400' },
    { label: 'Usuários Indicados', value: dashboard.referredUsers.toLocaleString('pt-BR'), icon: TrendingUp, color: 'text-[#a2dd00]' },
    { label: 'Comissão Pendente', value: formatCents(dashboard.pendingCommissionCents), icon: Clock, color: 'text-yellow-400' },
    { label: 'Comissão Paga', value: formatCents(dashboard.paidCommissionCents), icon: CheckCircle2, color: 'text-green-400' },
    { label: 'Total Comissões', value: formatCents(dashboard.totalCommissionCents), icon: DollarSign, color: 'text-violet-400' },
    { label: 'Receita Gerada', value: formatCents(dashboard.totalRevenueCents), icon: DollarSign, color: 'text-[#f3f0ed]/60' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="flex flex-col gap-2 rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2 p-4"
          >
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${card.color}`} />
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#f3f0ed]/30">{card.label}</span>
            </div>
            <span className="text-lg font-bold tabular-nums text-[#f3f0ed]">{card.value}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Create Affiliate Modal ─────────────────────────────────────────────────

function CreateAffiliateForm({ onClose }: { onClose: () => void }) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [commission, setCommission] = useState('30');
  const [userId, setUserId] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.admin.createAffiliate(accessToken!, {
        name,
        code,
        commissionPercent: Number(commission),
        ...(userId && { userId }),
      }),
    onSuccess: () => {
      toast.success('Afiliado criado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['admin', 'affiliates'] });
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erro ao criar afiliado');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-md rounded-2xl border border-[#f3f0ed]/8 bg-[#1a2123] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold text-[#f3f0ed]">Novo Afiliado</h2>

        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#f3f0ed]/50">Nome</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Influencer Maria"
              className="h-10 border-[#f3f0ed]/8 bg-[#f3f0ed]/3 text-sm text-[#f3f0ed] placeholder:text-[#f3f0ed]/25 focus-visible:border-[#a2dd00]/30 focus-visible:ring-[#a2dd00]/10"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#f3f0ed]/50">Codigo (sera convertido p/ maiúscula)</label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ex: MARIA30"
              className="h-10 border-[#f3f0ed]/8 bg-[#f3f0ed]/3 text-sm font-mono text-[#f3f0ed] placeholder:text-[#f3f0ed]/25 focus-visible:border-[#a2dd00]/30 focus-visible:ring-[#a2dd00]/10"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#f3f0ed]/50">Comissão (%)</label>
            <Input
              type="number"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              placeholder="30"
              className="h-10 border-[#f3f0ed]/8 bg-[#f3f0ed]/3 text-sm text-[#f3f0ed] placeholder:text-[#f3f0ed]/25 focus-visible:border-[#a2dd00]/30 focus-visible:ring-[#a2dd00]/10"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[#f3f0ed]/50">User ID (opcional)</label>
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="UUID do user na plataforma"
              className="h-10 border-[#f3f0ed]/8 bg-[#f3f0ed]/3 text-sm font-mono text-[#f3f0ed] placeholder:text-[#f3f0ed]/25 focus-visible:border-[#a2dd00]/30 focus-visible:ring-[#a2dd00]/10"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-[#f3f0ed]/8 px-4 py-2.5 text-sm font-medium text-[#f3f0ed]/50 transition-colors hover:bg-[#f3f0ed]/5"
          >
            Cancelar
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!name || !code || mutation.isPending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#a2dd00] px-4 py-2.5 text-sm font-semibold text-[#1c1917] transition-colors hover:bg-[#a2dd00]/90 disabled:opacity-40"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Affiliate Detail View ──────────────────────────────────────────────────

function AffiliateDetailView({ affiliateId, onBack }: { affiliateId: string; onBack: () => void }) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'affiliates', affiliateId, 'earnings'],
    queryFn: () => api.admin.affiliateEarnings(accessToken!, affiliateId),
    enabled: !!accessToken,
  });

  const toggleMutation = useMutation({
    mutationFn: () => api.admin.toggleAffiliate(accessToken!, affiliateId),
    onSuccess: () => {
      toast.success('Status alterado');
      queryClient.invalidateQueries({ queryKey: ['admin', 'affiliates'] });
    },
    onError: () => toast.error('Erro ao alterar status'),
  });

  const markPaidMutation = useMutation({
    mutationFn: (ids: string[]) => api.admin.markEarningsPaid(accessToken!, ids),
    onSuccess: (result) => {
      toast.success(`${result.updated} comissões marcadas como pagas`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['admin', 'affiliates'] });
    },
    onError: () => toast.error('Erro ao marcar como pago'),
  });

  const pendingEarnings = data?.earnings.filter((e) => e.status === 'PENDING') ?? [];

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllPending() {
    if (selectedIds.size === pendingEarnings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingEarnings.map((e) => e.id)));
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
      </div>
    );
  }

  if (!data) return null;

  const { affiliate, earnings, summary } = data;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#f3f0ed]/8 text-[#f3f0ed]/40 transition-colors hover:bg-[#f3f0ed]/5"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-[#f3f0ed]">{affiliate.name}</h2>
            <Badge
              variant="outline"
              className={
                affiliate.isActive
                  ? 'border-green-500/30 bg-green-500/10 text-green-400'
                  : 'border-red-500/30 bg-red-500/10 text-red-400'
              }
            >
              {affiliate.isActive ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          <p className="text-sm text-[#f3f0ed]/40">
            Código: <span className="font-mono text-[#a2dd00]">{affiliate.code}</span>
            {' · '}Comissão: {affiliate.commissionPercent}%
            {affiliate.user && <>{' · '}{affiliate.user.email}</>}
          </p>
        </div>
        <div className="flex gap-2">
          <CopyLinkButton code={affiliate.code} />
          <button
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending}
            className="flex h-9 items-center gap-2 rounded-xl border border-[#f3f0ed]/8 px-3 text-sm text-[#f3f0ed]/50 transition-colors hover:bg-[#f3f0ed]/5"
          >
            <Power className="h-3.5 w-3.5" />
            {affiliate.isActive ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Receita Gerada', value: formatCents(summary.totalRevenueCents), color: 'text-[#f3f0ed]/60' },
          { label: 'Total Comissões', value: formatCents(summary.totalCommissionCents), color: 'text-violet-400' },
          { label: 'Pendente', value: formatCents(summary.pendingCommissionCents), color: 'text-yellow-400' },
          { label: 'Pago', value: formatCents(summary.paidCommissionCents), color: 'text-green-400' },
        ].map((card) => (
          <div key={card.label} className="flex flex-col gap-1 rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2 p-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#f3f0ed]/30">{card.label}</span>
            <span className={`text-lg font-bold tabular-nums ${card.color}`}>{card.value}</span>
          </div>
        ))}
      </div>

      {/* Actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-[#a2dd00]/20 bg-[#a2dd00]/5 px-4 py-3">
          <span className="text-sm text-[#f3f0ed]/60">
            {selectedIds.size} selecionada{selectedIds.size > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => markPaidMutation.mutate(Array.from(selectedIds))}
            disabled={markPaidMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-[#a2dd00] px-3 py-1.5 text-sm font-semibold text-[#1c1917] hover:bg-[#a2dd00]/90 disabled:opacity-40"
          >
            {markPaidMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Marcar como Pago
          </button>
        </div>
      )}

      {/* Earnings table */}
      <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2">
        <div className="flex items-center justify-between border-b border-[#f3f0ed]/6 px-4 py-3">
          <span className="text-sm font-medium text-[#f3f0ed]">Comissões ({earnings.length})</span>
          {pendingEarnings.length > 0 && (
            <button
              onClick={selectAllPending}
              className="text-xs text-[#a2dd00] hover:underline"
            >
              {selectedIds.size === pendingEarnings.length ? 'Desmarcar todas' : 'Selecionar pendentes'}
            </button>
          )}
        </div>

        {earnings.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#f3f0ed]/30">Nenhuma comissão registrada</p>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="flex flex-col gap-2 p-3 md:hidden">
              {earnings.map((earning) => (
                <div
                  key={earning.id}
                  onClick={() => earning.status === 'PENDING' && toggleSelect(earning.id)}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${
                    selectedIds.has(earning.id)
                      ? 'border-[#a2dd00]/30 bg-[#a2dd00]/5'
                      : 'border-[#f3f0ed]/6 bg-[#f3f0ed]/2'
                  } ${earning.status === 'PENDING' ? 'cursor-pointer' : ''}`}
                >
                  {earning.status === 'PENDING' && (
                    <div className={`h-4 w-4 shrink-0 rounded border ${
                      selectedIds.has(earning.id)
                        ? 'border-[#a2dd00] bg-[#a2dd00]'
                        : 'border-[#f3f0ed]/20'
                    } flex items-center justify-center`}>
                      {selectedIds.has(earning.id) && <Check className="h-3 w-3 text-[#1c1917]" />}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-[#f3f0ed]">{earning.user.name || earning.user.email}</p>
                    <p className="text-xs text-[#f3f0ed]/40">
                      {earning.payment.type === 'SUBSCRIPTION' ? 'Assinatura' : 'Créditos'}
                      {' · '}{formatDate(earning.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-bold tabular-nums text-[#a2dd00]">{formatCents(earning.commissionCents)}</span>
                    <Badge
                      variant="outline"
                      className={
                        earning.status === 'PAID'
                          ? 'border-green-500/30 bg-green-500/10 text-green-400'
                          : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
                      }
                    >
                      {earning.status === 'PAID' ? 'Pago' : 'Pendente'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#f3f0ed]/6 hover:bg-transparent">
                    <TableHead className="w-10 text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30" />
                    <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Usuário</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Tipo</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Valor Pago</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Comissão</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Status</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings.map((earning) => (
                    <TableRow
                      key={earning.id}
                      onClick={() => earning.status === 'PENDING' && toggleSelect(earning.id)}
                      className={`border-[#f3f0ed]/4 transition-colors ${
                        earning.status === 'PENDING' ? 'cursor-pointer' : ''
                      } ${selectedIds.has(earning.id) ? 'bg-[#a2dd00]/5' : 'hover:bg-[#f3f0ed]/3'}`}
                    >
                      <TableCell>
                        {earning.status === 'PENDING' && (
                          <div className={`h-4 w-4 rounded border ${
                            selectedIds.has(earning.id)
                              ? 'border-[#a2dd00] bg-[#a2dd00]'
                              : 'border-[#f3f0ed]/20'
                          } flex items-center justify-center`}>
                            {selectedIds.has(earning.id) && <Check className="h-3 w-3 text-[#1c1917]" />}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm text-[#f3f0ed]">{earning.user.name || '—'}</span>
                          <span className="text-xs text-[#f3f0ed]/40">{earning.user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-[#f3f0ed]/60">
                          {earning.payment.type === 'SUBSCRIPTION' ? 'Assinatura' : 'Créditos'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm tabular-nums text-[#f3f0ed]/60">
                          {formatCents(earning.amountCents)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-bold tabular-nums text-[#a2dd00]">
                          {formatCents(earning.commissionCents)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            earning.status === 'PAID'
                              ? 'border-green-500/30 bg-green-500/10 text-green-400'
                              : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
                          }
                        >
                          {earning.status === 'PAID' ? 'Pago' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs tabular-nums text-[#f3f0ed]/40">
                          {formatDate(earning.createdAt)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Affiliates List ────────────────────────────────────────────────────────

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://geraew.com.br';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button onClick={(e) => { e.stopPropagation(); handleCopy(); }} className="text-[#f3f0ed]/30 hover:text-[#f3f0ed]/60">
      {copied ? <Check className="h-3.5 w-3.5 text-[#a2dd00]" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function CopyLinkButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${SITE_URL}/?ref=${code}`;

  function handleCopy() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); handleCopy(); }}
      className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
        copied
          ? 'border-[#a2dd00]/30 bg-[#a2dd00]/10 text-[#a2dd00]'
          : 'border-[#f3f0ed]/8 text-[#f3f0ed]/50 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70'
      }`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Link className="h-3.5 w-3.5" />}
      {copied ? 'Copiado!' : 'Copiar link'}
    </button>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AdminAffiliatosPage() {
  const { accessToken } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<string | null>(null);

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['admin', 'affiliates', 'dashboard'],
    queryFn: () => api.admin.affiliatesDashboard(accessToken!),
    enabled: !!accessToken,
    refetchInterval: 30_000,
  });

  const { data: affiliates, isLoading: listLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'affiliates', 'list'],
    queryFn: () => api.admin.affiliatesList(accessToken!),
    enabled: !!accessToken,
  });

  // If viewing a specific affiliate
  if (selectedAffiliate) {
    return <AffiliateDetailView affiliateId={selectedAffiliate} onBack={() => setSelectedAffiliate(null)} />;
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#f3f0ed] md:text-2xl">Afiliados</h1>
          <p className="mt-0.5 text-sm text-[#f3f0ed]/40">
            Gerencie afiliados e comissões
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#f3f0ed]/8 text-[#f3f0ed]/40 transition-colors hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex h-9 items-center gap-2 rounded-xl bg-[#a2dd00] px-3 text-sm font-semibold text-[#1c1917] transition-colors hover:bg-[#a2dd00]/90"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden md:inline">Novo Afiliado</span>
          </button>
        </div>
      </div>

      {/* Dashboard */}
      <DashboardView dashboard={dashboard} isLoading={dashLoading} />

      {/* Affiliates list */}
      {listLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
        </div>
      ) : !affiliates || affiliates.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16">
          <Users className="h-8 w-8 text-[#f3f0ed]/15" />
          <p className="text-sm text-[#f3f0ed]/30">Nenhum afiliado cadastrado</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-2 md:hidden">
            {affiliates.map((aff) => (
              <button
                key={aff.id}
                onClick={() => setSelectedAffiliate(aff.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/3 px-3 py-3 text-left active:bg-[#f3f0ed]/6"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-[#f3f0ed]">{aff.name}</p>
                    <Badge
                      variant="outline"
                      className={
                        aff.isActive
                          ? 'border-green-500/30 bg-green-500/10 text-green-400'
                          : 'border-red-500/30 bg-red-500/10 text-red-400'
                      }
                    >
                      {aff.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="font-mono text-xs text-[#a2dd00]">{aff.code}</span>
                    <CopyButton text={aff.code} />
                    <CopyLinkButton code={aff.code} />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-bold tabular-nums text-[#a2dd00]">{formatCents(aff.pendingEarningsCents)}</span>
                  <span className="text-[11px] text-[#f3f0ed]/30">pendente</span>
                </div>
              </button>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2 md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-[#f3f0ed]/6 hover:bg-transparent">
                  <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Afiliado</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Código</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Comissão</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Total Ganho</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Pendente</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Status</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Criado em</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {affiliates.map((aff) => (
                  <TableRow
                    key={aff.id}
                    onClick={() => setSelectedAffiliate(aff.id)}
                    className="cursor-pointer border-[#f3f0ed]/4 transition-colors hover:bg-[#f3f0ed]/3"
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-[#f3f0ed]">{aff.name}</span>
                        {aff.user && <span className="text-xs text-[#f3f0ed]/40">{aff.user.email}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-[#a2dd00]">{aff.code}</span>
                        <CopyButton text={aff.code} />
                        <CopyLinkButton code={aff.code} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm tabular-nums text-[#f3f0ed]">{aff.commissionPercent}%</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm tabular-nums text-[#f3f0ed]">{formatCents(aff.totalEarningsCents)}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm font-bold tabular-nums ${aff.pendingEarningsCents > 0 ? 'text-yellow-400' : 'text-[#f3f0ed]/40'}`}>
                        {formatCents(aff.pendingEarningsCents)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          aff.isActive
                            ? 'border-green-500/30 bg-green-500/10 text-green-400'
                            : 'border-red-500/30 bg-red-500/10 text-red-400'
                        }
                      >
                        {aff.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs tabular-nums text-[#f3f0ed]/40">{formatDate(aff.createdAt)}</span>
                    </TableCell>
                    <TableCell>
                      <Eye className="h-4 w-4 text-[#f3f0ed]/20" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Create modal */}
      {showCreate && <CreateAffiliateForm onClose={() => setShowCreate(false)} />}
    </div>
  );
}
