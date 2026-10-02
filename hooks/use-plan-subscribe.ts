'use client';

import { useState } from 'react';
import { api, type BillingInterval } from '@/lib/api';
import { clearRecoveryPromo, getStoredRecoveryPromo } from '@/lib/recovery-promo';
import { resolvePlanChange } from '@/lib/plans';

/**
 * Abre o checkout de uma assinatura nova ou de um upgrade e devolve a URL.
 * Assinatura nova que bate em 409 (o perfil em cache ainda não mostrava o
 * plano ativo) segue como upgrade.
 */
export async function startPlanCheckout(params: {
  accessToken: string;
  planSlug: string;
  billingInterval: BillingInterval;
  action: 'create' | 'upgrade';
  currency?: string;
}): Promise<string> {
  const { accessToken, planSlug, billingInterval, action, currency } = params;

  if (action === 'create') {
    const recoveryPromo = getStoredRecoveryPromo();
    try {
      const res = await api.subscriptions.create(
        accessToken,
        planSlug,
        currency,
        recoveryPromo,
        billingInterval,
      );
      if (recoveryPromo) clearRecoveryPromo();
      return res.checkoutUrl;
    } catch (err: unknown) {
      if ((err as { status?: number })?.status !== 409) throw err;
    }
  }

  const res = await api.subscriptions.upgrade(accessToken, planSlug, currency, billingInterval);
  return res.checkoutUrl;
}

export interface PendingPlanChange {
  slug: string;
  interval: BillingInterval;
}

/**
 * Fluxo de assinar/trocar plano usado nas telas de planos (modal, /pricing,
 * /creditos). Upgrade e assinatura nova vão pro checkout; trocas que só valem
 * na renovação viram `pendingChange` para a tela confirmar (modal de retenção).
 */
export function usePlanSubscribe(opts: {
  accessToken: string | null | undefined;
  currency?: string;
  currentPlanSlug: string | null;
  currentInterval: BillingInterval;
  hasActiveSub: boolean;
  onError: () => void;
}) {
  const [subscribingSlug, setSubscribingSlug] = useState<string | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingPlanChange | null>(null);

  async function subscribe(planSlug: string, billingInterval: BillingInterval) {
    if (!opts.accessToken || subscribingSlug) return;

    const action = resolvePlanChange({
      targetSlug: planSlug,
      targetInterval: billingInterval,
      currentSlug: opts.currentPlanSlug,
      currentInterval: opts.currentInterval,
      hasActiveSub: opts.hasActiveSub,
    });

    if (action === 'current') return;
    if (action === 'downgrade') {
      setPendingChange({ slug: planSlug, interval: billingInterval });
      return;
    }

    setSubscribingSlug(planSlug);
    try {
      window.location.href = await startPlanCheckout({
        accessToken: opts.accessToken,
        planSlug,
        billingInterval,
        action,
        currency: opts.currency,
      });
    } catch {
      opts.onError();
      setSubscribingSlug(null);
    }
  }

  return { subscribingSlug, subscribe, pendingChange, setPendingChange };
}
