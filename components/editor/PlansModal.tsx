'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Check,
  Coins,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, Plan } from '@/lib/api';

const PLAN_ORDER = ['free', 'starter', 'creator', 'pro', 'studio'];

function formatPrice(priceCents: number) {
  if (priceCents === 0) return { main: 'Grátis', sub: null };
  const int = Math.floor(priceCents / 100);
  const cents = String(priceCents % 100).padStart(2, '0');
  return { main: `R$ ${int.toLocaleString('pt-BR')},${cents}`, sub: '/mês' };
}

interface PlanCardProps {
  plan: Plan;
  isCurrent: boolean;
  planAction: 'upgrade' | 'downgrade' | 'create' | 'current';
  onSubscribe: (slug: string) => void;
  subscribingSlug: string | null;
}

function PlanCard({ plan, isCurrent, planAction, onSubscribe, subscribingSlug }: PlanCardProps) {
  const isFree = plan.priceCents === 0;
  const isPro = plan.slug === 'creator';
  const { main, sub } = formatPrice(plan.priceCents);
  const isSubscribing = subscribingSlug === plan.slug;

  const actionLabel = {
    upgrade: 'Fazer upgrade',
    downgrade: 'Fazer downgrade',
    create: 'Assinar',
    current: 'Plano ativo',
  }[planAction];

  const features = [
    `${plan.creditsPerMonth.toLocaleString('pt-BR')} créditos/mês`,
    `Até ${plan.maxConcurrentGenerations} gerações simultâneas`,
    plan.hasWatermark ? null : 'Sem marca d\'água',
    plan.galleryRetentionDays ? `Galeria por ${plan.galleryRetentionDays} dias` : 'Galeria ilimitada',
    plan.hasApiAccess ? 'Acesso à API' : null,
  ].filter(Boolean) as string[];

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-5 transition-all ${
        isCurrent
          ? 'border-[#a2dd00]/50 bg-[#1e2b1f] shadow-[0_0_30px_rgba(162,221,0,0.1)]'
          : isPro
            ? 'border-[#f3f0ed]/20 bg-[#1f2a2d]'
            : 'border-[#f3f0ed]/8 bg-[#1c2527]'
      }`}
    >
      {isCurrent && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="flex items-center gap-1 rounded-full bg-[#a2dd00] px-3 py-1 text-[10px] font-bold tracking-widest text-[#1a2123]">
            <Sparkles className="h-2.5 w-2.5" />
            SEU PLANO
          </span>
        </div>
      )}

      <p className="mt-3 text-sm font-bold text-[#f3f0ed]">{plan.name}</p>

      <div className="mt-2 flex items-baseline gap-1">
        <span className={`text-2xl font-bold tabular-nums ${isCurrent ? 'text-[#a2dd00]' : 'text-[#f3f0ed]'}`}>
          {main}
        </span>
        {sub && <span className="text-[11px] text-[#f3f0ed]/40">{sub}</span>}
      </div>

      <div className="my-4 h-px w-full bg-[#f3f0ed]/6" />

      <ul className="flex flex-1 flex-col gap-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-[#f3f0ed]/60">
            <Check className={`mt-px h-3.5 w-3.5 shrink-0 ${isCurrent ? 'text-[#a2dd00]' : 'text-[#a2dd00]/60'}`} />
            {f}
          </li>
        ))}
      </ul>

      {!isFree && (
        <button
          disabled={isCurrent || !!subscribingSlug}
          onClick={() => onSubscribe(plan.slug)}
          className={`mt-5 flex h-10 w-full items-center justify-center rounded-xl text-xs font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
            isCurrent
              ? 'bg-[#a2dd00]/20 text-[#a2dd00]'
              : isPro
                ? 'border border-[#f3f0ed]/20 bg-transparent text-[#f3f0ed] hover:bg-[#f3f0ed]/8'
                : 'bg-[#f3f0ed]/8 text-[#f3f0ed] hover:bg-[#f3f0ed]/12'
          }`}
        >
          {isSubscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : actionLabel}
        </button>
      )}
    </div>
  );
}

interface PlansModalProps {
  onClose: () => void;
}

export function PlansModal({ onClose }: PlansModalProps) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [subscribingSlug, setSubscribingSlug] = useState<string | null>(null);

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.plans.list(accessToken!),
    enabled: !!accessToken,
    staleTime: 5 * 60_000,
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.users.me(accessToken!),
    enabled: !!accessToken,
    staleTime: 60_000,
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isLoading = plansLoading || profileLoading;

  const currentPlanSlug =
    (profile?.plan as Record<string, unknown> | null)?.slug as string | null ?? null;

  const sub = profile?.subscription as Record<string, unknown> | null;
  const hasActiveSub = sub?.status === 'ACTIVE' || sub?.status === 'active';

  const sorted = (plans ?? []).slice().sort(
    (a, b) => PLAN_ORDER.indexOf(a.slug) - PLAN_ORDER.indexOf(b.slug),
  );

  function getPlanAction(targetSlug: string): 'upgrade' | 'downgrade' | 'create' {
    if (!hasActiveSub || !currentPlanSlug || currentPlanSlug === 'free') return 'create';
    const currentIdx = PLAN_ORDER.indexOf(currentPlanSlug);
    const targetIdx = PLAN_ORDER.indexOf(targetSlug);
    return targetIdx > currentIdx ? 'upgrade' : 'downgrade';
  }

  async function handleSubscribe(planSlug: string) {
    if (!accessToken || subscribingSlug) return;
    setSubscribingSlug(planSlug);
    const action = getPlanAction(planSlug);

    try {
      if (action === 'downgrade') {
        await api.subscriptions.downgrade(accessToken, planSlug);
        toast.success('Downgrade agendado', {
          description: 'Seu plano será alterado na próxima renovação.',
        });
        queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
        setSubscribingSlug(null);
        onClose();
        return;
      }

      let checkoutUrl: string;
      if (action === 'create') {
        const res = await api.subscriptions.create(accessToken, planSlug);
        checkoutUrl = res.checkoutUrl;
      } else {
        const res = await api.subscriptions.upgrade(accessToken, planSlug);
        checkoutUrl = res.checkoutUrl;
      }
      window.location.href = checkoutUrl;
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        try {
          const res = await api.subscriptions.upgrade(accessToken, planSlug);
          window.location.href = res.checkoutUrl;
        } catch {
          toast.error('Erro ao mudar de plano', { description: 'Tente novamente.' });
          setSubscribingSlug(null);
        }
      } else {
        toast.error('Erro ao mudar de plano', { description: 'Tente novamente.' });
        setSubscribingSlug(null);
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative mx-4 flex w-full max-w-4xl flex-col gap-6 rounded-2xl border border-[#f3f0ed]/[0.08] bg-[#1a2123] p-6 shadow-2xl">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/[0.08] hover:text-[#f3f0ed]/80"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Heading */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-xl font-bold text-[#f3f0ed]">Escolha seu plano</h2>
          <p className="text-[11px] text-[#f3f0ed]/40 flex items-center gap-1.5">
            <Coins className="h-3 w-3 text-[#a2dd00]" />
            Créditos do plano renovam mensalmente
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
          </div>
        )}

        {/* Cards */}
        {!isLoading && sorted.length > 0 && (
          <div
            className="grid items-stretch gap-4"
            style={{ gridTemplateColumns: `repeat(${Math.min(sorted.length, 5)}, minmax(0, 1fr))` }}
          >
            {sorted.map((plan) => {
              const isCurrent = currentPlanSlug === plan.slug;
              return (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrent={isCurrent}
                planAction={isCurrent ? 'current' : getPlanAction(plan.slug)}
                onSubscribe={handleSubscribe}
                subscribingSlug={subscribingSlug}
              />
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-[#f3f0ed]/20">
          Créditos extras comprados nunca expiram · Acumulam com os do plano
        </p>
      </div>
    </div>
  );
}
