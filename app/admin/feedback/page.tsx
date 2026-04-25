'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { AdminFeedback } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Star,
  Coins,
  TrendingUp,
  TrendingDown,
  MessageSquareHeart,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const GOAL_LABELS: Record<string, string> = {
  'tiktok-shop': 'TikTok Shop',
  canal: 'Canal próprio',
  ads: 'Anúncios',
  agencia: 'Agência/UGC',
  outro: 'Outro',
};

const FEATURE_LABELS: Record<string, string> = {
  imagens: 'Imagens',
  videos: 'Vídeos',
  movimento: 'Movimento',
  'face-swap': 'Face Swap',
  'try-on': 'Try On',
  upscale: 'Upscale',
  'ranking-tiktok': 'Ranking TikTok',
  prompts: 'Prompts',
};

function npsBadge(score: number) {
  let cls = 'border-red-500/30 bg-red-500/10 text-red-400';
  if (score >= 9) cls = 'border-[#a2dd00]/40 bg-[#a2dd00]/10 text-[#a2dd00]';
  else if (score >= 6) cls = 'border-amber-500/30 bg-amber-500/10 text-amber-400';
  return (
    <Badge variant="outline" className={`${cls} font-bold tabular-nums`}>
      {score}
    </Badge>
  );
}

function ratingStars(n: number) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= n ? 'fill-[#a2dd00] text-[#a2dd00]' : 'text-[#f3f0ed]/15'}`}
        />
      ))}
    </div>
  );
}

function planBadge(plan: AdminFeedback['user']['plan']) {
  if (!plan) {
    return (
      <Badge variant="outline" className="border-[#f3f0ed]/10 text-[#f3f0ed]/40">
        Free
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-violet-500/30 bg-violet-500/10 text-violet-400">
      {plan.name}
    </Badge>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminFeedbackPage() {
  const { accessToken } = useAuth();
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const limit = 20;

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'feedback', page, limit],
    queryFn: () => api.admin.feedbackList(accessToken!, page, limit),
    enabled: !!accessToken,
  });

  const items = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const stats = data?.stats;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#f3f0ed] md:text-2xl">Feedback</h1>
          <p className="mt-0.5 text-sm text-[#f3f0ed]/40">
            {total.toLocaleString('pt-BR')} feedbacks recebidos
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

      {/* Stats */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            icon={<MessageSquareHeart className="h-4 w-4 text-[#a2dd00]" />}
            label="Total"
            value={stats.total.toLocaleString('pt-BR')}
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4 text-[#a2dd00]" />}
            label="NPS Score"
            value={stats.npsScore !== undefined ? `${stats.npsScore}` : '—'}
            hint={`${stats.npsPromoters} promotores · ${stats.npsDetractors} detratores`}
          />
          <StatCard
            icon={<TrendingDown className="h-4 w-4 text-amber-400" />}
            label="NPS médio"
            value={stats.avgNps !== null ? stats.avgNps.toFixed(1) : '—'}
          />
          <StatCard
            icon={<Star className="h-4 w-4 text-[#a2dd00]" />}
            label="Rating médio"
            value={stats.avgRating !== null ? stats.avgRating.toFixed(1) : '—'}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#f3f0ed]/10 py-20 text-center">
          <MessageSquareHeart className="h-8 w-8 text-[#f3f0ed]/20" />
          <p className="text-sm text-[#f3f0ed]/40">
            Nenhum feedback recebido ainda.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((f) => {
            const isOpen = expanded === f.id;
            return (
              <div
                key={f.id}
                className="overflow-hidden rounded-2xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/[0.02] transition-colors hover:bg-[#f3f0ed]/[0.04]"
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : f.id)}
                  className="flex w-full items-start gap-4 px-4 py-4 text-left md:px-5"
                >
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f3f0ed]/5 text-sm font-semibold text-[#f3f0ed]/60">
                    {f.user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.user.avatarUrl} alt={f.user.name} className="h-full w-full object-cover" />
                    ) : (
                      f.user.name?.charAt(0)?.toUpperCase() ?? '?'
                    )}
                  </div>

                  {/* Main info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-[#f3f0ed]">
                        {f.user.name || f.user.email}
                      </span>
                      {planBadge(f.user.plan)}
                    </div>
                    <p className="truncate text-xs text-[#f3f0ed]/40">{f.user.email}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-[#f3f0ed]/40">NPS</span>
                      {npsBadge(f.nps)}
                      <span className="ml-1 text-[#f3f0ed]/40">Rating</span>
                      {ratingStars(f.rating)}
                      <span className="ml-1 text-[#f3f0ed]/40">·</span>
                      <span className="text-[#f3f0ed]/60">
                        {GOAL_LABELS[f.goal] ?? f.goal}
                        {f.goal === 'outro' && f.goalOther ? `: ${f.goalOther}` : ''}
                      </span>
                    </div>

                    {f.features.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {f.features.map((feat) => (
                          <span
                            key={feat}
                            className="rounded-full border border-[#a2dd00]/20 bg-[#a2dd00]/5 px-2 py-0.5 text-[10px] font-medium text-[#a2dd00]/80"
                          >
                            {FEATURE_LABELS[feat] ?? feat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right side */}
                  <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
                    <span className="text-[11px] text-[#f3f0ed]/40">{formatDate(f.createdAt)}</span>
                    {f.creditsAwarded > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#a2dd00]/70">
                        <Coins className="h-3 w-3" />
                        +{f.creditsAwarded.toLocaleString('pt-BR')}
                      </span>
                    )}
                    <ChevronDown
                      className={`h-4 w-4 text-[#f3f0ed]/30 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div className="grid gap-4 border-t border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] px-4 py-4 md:grid-cols-3 md:px-5">
                    <FreeTextBlock label="O que impressionou" body={f.highlight} />
                    <FreeTextBlock label="O que melhorar" body={f.improve} highlight />
                    <FreeTextBlock label="Feature wishlist" body={f.wishlist} />
                  </div>
                )}
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-2 flex items-center justify-between rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/[0.02] px-3 py-2 text-sm">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[#f3f0ed]/60 transition-colors hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed] disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>
              <span className="text-xs text-[#f3f0ed]/40">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[#f3f0ed]/60 transition-colors hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed] disabled:opacity-30 disabled:hover:bg-transparent"
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/[0.02] p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#f3f0ed]/40">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold text-[#f3f0ed] tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-[#f3f0ed]/30">{hint}</div>}
    </div>
  );
}

function FreeTextBlock({
  label,
  body,
  highlight,
}: {
  label: string;
  body: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        highlight
          ? 'border-[#a2dd00]/20 bg-[#a2dd00]/5'
          : 'border-[#f3f0ed]/8 bg-[#f3f0ed]/[0.02]'
      }`}
    >
      <div
        className={`mb-1.5 text-[10px] font-semibold uppercase tracking-wider ${
          highlight ? 'text-[#a2dd00]/80' : 'text-[#f3f0ed]/40'
        }`}
      >
        {label}
      </div>
      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#f3f0ed]/80">{body}</p>
    </div>
  );
}
