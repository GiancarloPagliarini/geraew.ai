'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Loader2, TrendingUp, Users, AlertTriangle, XCircle } from 'lucide-react';
import { fmtCurrency } from '@/lib/stripe-fmt';

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'green' | 'blue' | 'amber' | 'red';
}) {
  const toneClass = {
    green: 'text-[#a2dd00] bg-[#a2dd00]/10',
    blue: 'text-blue-400 bg-blue-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    red: 'text-red-400 bg-red-500/10',
  }[tone];

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2 p-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#f3f0ed]/40">{label}</p>
        <p className="text-lg font-bold text-[#f3f0ed]">{value}</p>
      </div>
    </div>
  );
}

export default function StripeOverviewPage() {
  const { accessToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-stripe', 'overview'],
    queryFn: () => api.adminStripe.overview(accessToken!),
    enabled: !!accessToken,
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
      </div>
    );
  }

  const available = data.balance.available.reduce((sum, b) => sum + b.amount, 0);
  const pending = data.balance.pending.reduce((sum, b) => sum + b.amount, 0);
  const currency = data.balance.available[0]?.currency ?? data.balance.pending[0]?.currency ?? 'brl';

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Stat label="Saldo disponível" value={fmtCurrency(available, currency)} icon={TrendingUp} tone="green" />
        <Stat label="Saldo pendente" value={fmtCurrency(pending, currency)} icon={TrendingUp} tone="blue" />
      </div>

      <div>
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/40">Assinaturas</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Ativas" value={`${data.subscriptions.active.count}${data.subscriptions.active.hasMore ? '+' : ''}`} icon={Users} tone="green" />
          <Stat label="Trial" value={`${data.subscriptions.trialing.count}${data.subscriptions.trialing.hasMore ? '+' : ''}`} icon={Users} tone="blue" />
          <Stat label="Em atraso" value={`${data.subscriptions.pastDue.count}${data.subscriptions.pastDue.hasMore ? '+' : ''}`} icon={AlertTriangle} tone="amber" />
          <Stat label="Canceladas" value={`${data.subscriptions.canceled.count}${data.subscriptions.canceled.hasMore ? '+' : ''}`} icon={XCircle} tone="red" />
        </div>
      </div>

      <p className="text-xs text-[#f3f0ed]/30">
        Contadores refletem até 100 por status. Se aparecer &quot;+&quot;, há mais registros — abra a aba Assinaturas para filtrar.
      </p>
    </div>
  );
}
