'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Check,
  Coins,
  X,
  Zap,
  Shield,
  Flame,
  BadgePercent,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { CancelRetentionModal } from '@/components/editor/CancelRetentionModal';
import { CreditPackagesGrid } from '@/components/editor/CreditPackagesGrid';
import { PlansGrid } from '@/components/editor/PlansGrid';
import { PLAN_ORDER, getPlanFeatures } from '@/lib/plans';

interface PlansModalProps {
  onClose: () => void;
}

export function PlansModal({ onClose }: PlansModalProps) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'plans' | 'credits'>('plans');
  const [subscribingSlug, setSubscribingSlug] = useState<string | null>(null);
  const [pendingDowngradeSlug, setPendingDowngradeSlug] = useState<string | null>(null);
  const [isDowngrading, setIsDowngrading] = useState(false);

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.plans.list(accessToken!),
    enabled: !!accessToken,
    staleTime: 5 * 60_000,
  });

  const { data: packages } = useQuery({
    queryKey: ['credits', 'packages'],
    queryFn: () => api.credits.packages(accessToken!),
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

  async function executeDowngrade(planSlug: string) {
    if (!accessToken) return;
    setIsDowngrading(true);
    try {
      await api.subscriptions.downgrade(accessToken, planSlug);
      toast.success('Downgrade agendado', {
        description: 'Seu plano será alterado na próxima renovação.',
      });
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      setPendingDowngradeSlug(null);
      onClose();
    } catch {
      toast.error('Erro ao fazer downgrade', { description: 'Tente novamente.' });
    } finally {
      setIsDowngrading(false);
    }
  }

  async function handleSubscribe(planSlug: string) {
    if (!accessToken || subscribingSlug) return;
    const action = getPlanAction(planSlug);

    if (action === 'downgrade') {
      setPendingDowngradeSlug(planSlug);
      return;
    }

    setSubscribingSlug(planSlug);

    try {
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
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-7xl flex-col gap-4 overflow-y-auto sidebar-scroll rounded-[20px] border border-[#f3f0ed]/[0.06] bg-[#1a2123] p-4 shadow-2xl sm:p-5">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/[0.08] hover:text-[#f3f0ed]/80"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Heading */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-1.5 rounded-full border border-[#a2dd00]/20 bg-[#a2dd00]/8 px-3 py-1">
            <Flame className="h-3 w-3 text-[#a2dd00]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#a2dd00]">Oferta por tempo limitado</span>
          </div>
          <h2 className="text-lg font-bold text-[#f3f0ed] sm:text-xl">
            {activeTab === 'plans' ? 'Escolha seu plano e comece a criar' : 'Pacotes de créditos avulsos'}
          </h2>
          <p className="max-w-md text-[12px] text-[#f3f0ed]/45">
            {activeTab === 'plans'
              ? <>Mais de <span className="font-semibold text-[#f3f0ed]/70">2.400 criadores</span> já estão gerando conteúdo.</>
              : 'Compra única · Sem assinatura · Créditos nunca expiram'}
          </p>
          <div className="flex items-center gap-3 text-[10px] text-[#f3f0ed]/30">
            {activeTab === 'plans' ? (
              <>
                <span className="flex items-center gap-1">
                  <Shield className="h-2.5 w-2.5" />
                  Garantia de 7 dias
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="h-2.5 w-2.5" />
                  Cancele quando quiser
                </span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1">
                  <Coins className="h-2.5 w-2.5" />
                  Acumulam com os créditos do plano
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="h-2.5 w-2.5" />
                  Entram na hora
                </span>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-center mb-2 mt-2">
          {isLoading ? (
            <div className="flex rounded-xl border border-[#f3f0ed]/[0.08] bg-[#f3f0ed]/[0.03] p-1 gap-1">
              <div className="h-9 w-28 animate-pulse rounded-lg bg-[#f3f0ed]/[0.06]" />
              <div className="h-9 w-40 animate-pulse rounded-lg bg-[#f3f0ed]/[0.06]" />
            </div>
          ) : packages && packages.length > 0 ? (
            <div className="flex rounded-xl border border-[#f3f0ed]/[0.08] bg-[#f3f0ed]/[0.03] p-1 gap-1">
              <button
                onClick={() => setActiveTab('plans')}
                className={`flex items-center gap-2 rounded-lg px-5 py-2 text-[13px] font-semibold transition-all duration-200 ${activeTab === 'plans'
                  ? 'bg-[#f3f0ed]/[0.1] text-[#f3f0ed] shadow-sm'
                  : 'text-[#f3f0ed]/40 hover:text-[#f3f0ed]/70'
                  }`}
              >
                <BadgePercent className="h-3.5 w-3.5" />
                Planos
              </button>
              <button
                onClick={() => setActiveTab('credits')}
                className={`flex items-center gap-2 rounded-lg px-5 py-2 text-[13px] font-semibold transition-all duration-200 ${activeTab === 'credits'
                  ? 'bg-[#f3f0ed]/[0.1] text-[#f3f0ed] shadow-sm'
                  : 'text-[#f3f0ed]/40 hover:text-[#f3f0ed]/70'
                  }`}
              >
                <Coins className="h-3.5 w-3.5" />
                Pacotes de Créditos
              </button>
            </div>
          ) : null}
        </div>

        {/* Plans tab */}
        {activeTab === 'plans' && (
          <>
            <PlansGrid
              plans={plans ?? []}
              currentPlanSlug={currentPlanSlug}
              hasActiveSub={hasActiveSub}
              subscribingSlug={subscribingSlug}
              onSubscribe={handleSubscribe}
              compact
              isLoading={isLoading}
            />
            {!isLoading && (
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-[#f3f0ed]/25">
                <span className="flex items-center gap-1">
                  <Check className="h-2.5 w-2.5 text-[#a2dd00]/50" />
                  Sem taxa de cancelamento
                </span>
                <span className="flex items-center gap-1">
                  <Check className="h-2.5 w-2.5 text-[#a2dd00]/50" />
                  Créditos renovam mensalmente
                </span>
                <span className="flex items-center gap-1">
                  <Check className="h-2.5 w-2.5 text-[#a2dd00]/50" />
                  Garantia de reembolso em 7 dias
                </span>
              </div>
            )}
          </>
        )}

        {/* Credits tab */}
        {!isLoading && activeTab === 'credits' && packages && packages.length > 0 && (
          <CreditPackagesGrid packages={packages} compact />
        )}
      </div>

      {/* Retention modal for downgrade */}
      {pendingDowngradeSlug && (() => {
        const currentPlan = sorted.find((p) => p.slug === currentPlanSlug);
        const targetPlan = sorted.find((p) => p.slug === pendingDowngradeSlug);
        const currentFeatures = currentPlan ? getPlanFeatures(currentPlan) : [];
        const targetFeatures = targetPlan ? getPlanFeatures(targetPlan) : [];
        const lostBenefits = currentFeatures.filter((f) => !targetFeatures.includes(f));
        if (currentPlan && targetPlan) {
          const creditDiff = currentPlan.creditsPerMonth - targetPlan.creditsPerMonth;
          if (creditDiff > 0) {
            lostBenefits.unshift(`${creditDiff.toLocaleString('pt-BR')} créditos mensais a menos`);
          }
        }
        return (
          <CancelRetentionModal
            action="downgrade"
            onClose={() => setPendingDowngradeSlug(null)}
            onConfirm={() => executeDowngrade(pendingDowngradeSlug)}
            isLoading={isDowngrading}
            currentPlanName={currentPlan?.name}
            targetPlanName={targetPlan?.name}
            lostBenefits={lostBenefits.length > 0 ? lostBenefits : ['Créditos e funcionalidades do plano atual']}
          />
        );
      })()}
    </div>
  );
}
