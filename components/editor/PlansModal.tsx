'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Check,
  Coins,
  Loader2,
  Lock,
  ShoppingCart,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api, Plan, CreditPackage } from '@/lib/api';
import {
  PLAN_ORDER,
  PLAN_GENERATIONS,
  formatPrice,
  formatBoostPrice,
  getBoostMeta,
  getPlanFeatures,
} from '@/lib/plans';

interface PlanCardProps {
  plan: Plan;
  isCurrent: boolean;
  planAction: 'upgrade' | 'downgrade' | 'create' | 'current';
  onSubscribe: (slug: string) => void;
  subscribingSlug: string | null;
}

function PlanCard({ plan, isCurrent, planAction, onSubscribe, subscribingSlug }: PlanCardProps) {
  const isFree = plan.priceCents === 0;
  const isCreator = plan.slug === 'creator';
  const { main, sub } = formatPrice(plan.priceCents);
  const isSubscribing = subscribingSlug === plan.slug;
  const features = getPlanFeatures(plan);
  const generationExamples = PLAN_GENERATIONS[plan.slug] ?? [];

  const actionLabel = {
    upgrade: 'Fazer upgrade',
    downgrade: 'Fazer downgrade',
    create: 'Assinar',
    current: 'Plano ativo',
  }[planAction];

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-4 transition-all sm:p-5 ${isCurrent
        ? 'border-[#a2dd00]/50 bg-[#1e2b1f] shadow-[0_0_30px_rgba(162,221,0,0.1)]'
        : isCreator
          ? 'border-[#a2dd00]/30 bg-[#1f2a2d] shadow-[0_0_20px_rgba(162,221,0,0.06)]'
          : 'border-[#f3f0ed]/8 bg-[#1c2527]'
        }`}
    >
      {isCreator && !isCurrent && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="flex items-center gap-1 rounded-full bg-[#a2dd00] px-3 py-1 text-[10px] font-bold tracking-widest text-[#1a2123]">
            <Sparkles className="h-2.5 w-2.5" />
            MAIS POPULAR
          </span>
        </div>
      )}

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

      <ul className="flex flex-col gap-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-[#f3f0ed]/60">
            <Check className={`mt-px h-3.5 w-3.5 shrink-0 ${isCurrent ? 'text-[#a2dd00]' : 'text-[#a2dd00]/60'}`} />
            {f}
          </li>
        ))}
      </ul>

      {generationExamples.length > 0 && (
        <>
          <div className="my-3 h-px w-full bg-[#f3f0ed]/6" />
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-bold tracking-[0.1em] text-[#f3f0ed]/25">GERAÇÕES</p>
            {generationExamples.map((ex) => (
              <div key={ex.label} className="flex items-center justify-between text-[11px]">
                <span className="text-[#f3f0ed]/40">{ex.label}</span>
                {ex.blocked ? (
                  <span className="flex items-center gap-1 text-red-400/60">
                    <Lock className="h-2.5 w-2.5" />
                    bloqueado
                  </span>
                ) : (
                  <span className="font-medium text-[#f3f0ed]/60">{ex.count}</span>
                )}
              </div>
            ))}
            <p className="text-[10px] text-[#f3f0ed]/15 mt-1">Estimativa usando todos os créditos em um único modelo</p>
          </div>
        </>
      )}

      <div className="flex-1" />

      {!isFree && (
        <button
          disabled={isCurrent || !!subscribingSlug}
          onClick={() => onSubscribe(plan.slug)}
          className={`mt-5 flex h-10 w-full items-center justify-center rounded-xl text-xs font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${isCurrent
            ? 'bg-[#a2dd00]/20 text-[#a2dd00]'
            : isCreator
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
  const [purchasingPackageId, setPurchasingPackageId] = useState<string | null>(null);

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

  const { data: packages } = useQuery({
    queryKey: ['credits', 'packages'],
    queryFn: () => api.credits.packages(accessToken!),
    enabled: !!accessToken,
    staleTime: 5 * 60_000,
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

  const sortedPackages = (packages ?? []).slice().sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  async function handlePurchaseBoost(packageId: string) {
    if (!accessToken || purchasingPackageId) return;
    setPurchasingPackageId(packageId);
    try {
      const res = await api.credits.purchase(accessToken, packageId);
      window.location.href = res.checkoutUrl;
    } catch {
      toast.error('Erro ao comprar créditos', { description: 'Tente novamente.' });
      setPurchasingPackageId(null);
    }
  }

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
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-7xl flex-col gap-4 overflow-y-auto sidebar-scroll rounded-2xl border border-[#f3f0ed]/[0.08] bg-[#1a2123] p-4 shadow-2xl sm:gap-6 sm:p-6">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/[0.08] hover:text-[#f3f0ed]/80"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Heading */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-lg font-bold text-[#f3f0ed] sm:text-xl">Escolha seu plano</h2>
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
            className="flex flex-col items-stretch gap-3 sm:grid sm:gap-4"
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
