'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { CreditTransaction } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useLoadingMessage } from '@/lib/loading-messages';
import {
  ArrowLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Receipt,
  Image,
  Video,
  Sparkles,
  CreditCard,
  Gift,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTransactionIcon(type: string, description: string) {
  const desc = description.toLowerCase();

  if (type === 'GENERATION_DEBIT') {
    if (desc.includes('video')) return <Video className="h-4 w-4" />;
    if (desc.includes('image')) return <Image className="h-4 w-4" />;
    return <Zap className="h-4 w-4" />;
  }

  if (type.includes('PURCHASE') || type.includes('PAYMENT')) return <CreditCard className="h-4 w-4" />;
  if (type.includes('BONUS')) return <Gift className="h-4 w-4" />;
  if (type.includes('PLAN')) return <Sparkles className="h-4 w-4" />;

  if (type.includes('DEBIT')) return <ArrowDownCircle className="h-4 w-4" />;
  return <ArrowUpCircle className="h-4 w-4" />;
}

function getTransactionLabel(type: string) {
  const labels: Record<string, string> = {
    GENERATION_DEBIT: 'Geração',
    PLAN_CREDIT: 'Crédito do plano',
    BONUS_CREDIT: 'Bônus',
    PURCHASE_CREDIT: 'Compra',
    PAYMENT_CREDIT: 'Pagamento',
  };
  return labels[type] ?? type;
}

function isDebit(amount: number) {
  return amount < 0;
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function TransactionRow({ tx }: { tx: CreditTransaction }) {
  const debit = isDebit(tx.amount);

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition-colors hover:border-[#f3f0ed]/6 hover:bg-[#f3f0ed]/2 sm:gap-4 sm:px-4 sm:py-3.5">
      {/* Icon */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{
          background: debit ? 'rgba(239,68,68,0.08)' : 'rgba(162,221,0,0.08)',
          color: debit ? 'rgba(239,68,68,0.7)' : 'rgba(162,221,0,0.8)',
        }}
      >
        {getTransactionIcon(tx.type, tx.description)}
      </div>

      {/* Description */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[#f3f0ed]/80 sm:text-sm">{tx.description}</p>
        <div className="mt-0.5 flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
          <span className="text-[10px] text-[#f3f0ed]/30 sm:text-[11px]">{getTransactionLabel(tx.type)}</span>
          <span className="hidden h-0.5 w-0.5 rounded-full bg-[#f3f0ed]/20 sm:block" />
          <span className="text-[10px] text-[#f3f0ed]/25 sm:text-[11px]">{formatDate(tx.createdAt)}</span>
        </div>
      </div>

      {/* Amount */}
      <div className="shrink-0 text-right">
        <span
          className="text-sm font-bold tabular-nums"
          style={{ color: debit ? 'rgba(239,68,68,0.75)' : 'rgba(162,221,0,0.9)' }}
        >
          {debit ? '' : '+'}{tx.amount.toLocaleString('pt-BR')}
        </span>
        <p className="text-[10px] text-[#f3f0ed]/25">créditos</p>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TransactionSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-[#f3f0ed]/6" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-[#f3f0ed]/6" />
        <div className="h-2.5 w-1/3 animate-pulse rounded-full bg-[#f3f0ed]/4" />
      </div>
      <div className="h-4 w-16 animate-pulse rounded-full bg-[#f3f0ed]/6" />
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between px-1 pt-2">
      <p className="text-[10px] text-[#f3f0ed]/30 sm:text-xs">
        {from}–{to} de {total.toLocaleString('pt-BR')}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          disabled={page <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f3f0ed]/8 text-[#f3f0ed]/40 transition-colors hover:border-[#f3f0ed]/16 hover:text-[#f3f0ed]/80 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[3rem] text-center text-xs text-[#f3f0ed]/40">
          {page} / {totalPages}
        </span>
        <button
          onClick={onNext}
          disabled={page >= totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f3f0ed]/8 text-[#f3f0ed]/40 transition-colors hover:border-[#f3f0ed]/16 hover:text-[#f3f0ed]/80 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsoPage() {
  const router = useRouter();
  const { user, accessToken, loading: authLoading } = useAuth();
  const loadingMsg = useLoadingMessage('uso');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['credits', 'transactions', page],
    queryFn: () => api.credits.transactions(accessToken!, page, LIMIT),
    enabled: !!accessToken,
    placeholderData: (prev) => prev,
  });

  const transactions = data?.data ?? [];
  const meta = data?.meta;

  const totalDebited = transactions
    .filter((tx) => tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#1a2123]">
        <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
        {loadingMsg && <p className="text-sm text-[#f3f0ed]/40">{loadingMsg}</p>}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#1a2123]">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center border-b border-[#f3f0ed]/7 px-4">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-sm text-[#f3f0ed]/60 transition-colors hover:text-[#f3f0ed]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao editor
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:py-10">

        {/* ── Title ── */}
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-[#f3f0ed]">Histórico de uso</h1>
            <p className="text-xs text-[#f3f0ed]/35">Todas as transações de créditos</p>
          </div>
        </div>

        {/* ── Summary strip ── */}
        {meta && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/3 px-4 py-3.5">
              <span className="text-[10px] font-bold tracking-[0.13em] text-[#f3f0ed]/35">
                TOTAL DE TRANSAÇÕES
              </span>
              <span className="text-xl font-bold tabular-nums text-[#a2dd00] sm:text-2xl">
                {meta.total.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        )}

        {/* ── List ── */}
        <div className="flex flex-col rounded-2xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/2">
          {/* List header */}
          <div className="flex items-center justify-between border-b border-[#f3f0ed]/6 px-4 py-3">
            <span className="text-[11px] font-bold tracking-[0.12em] text-[#f3f0ed]/30">
              TRANSAÇÕES
            </span>
            {isFetching && !isLoading && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#f3f0ed]/30" />
            )}
          </div>

          {/* Rows */}
          <div className="sidebar-scroll divide-y divide-[#f3f0ed]/4 overflow-y-auto px-0" style={{ maxHeight: '32rem' }}>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => <TransactionSkeleton key={i} />)
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <Receipt className="h-8 w-8 text-[#f3f0ed]/15" />
                <p className="text-sm text-[#f3f0ed]/30">Nenhuma transação encontrada</p>
              </div>
            ) : (
              transactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
            )}
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="border-t border-[#f3f0ed]/6 px-4 py-3">
              <Pagination
                page={page}
                totalPages={meta.totalPages}
                total={meta.total}
                limit={LIMIT}
                onPrev={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
