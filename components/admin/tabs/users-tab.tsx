'use client';

import { useAuth } from '@/lib/auth-context';
import { api, type AdminUser } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Users, UserPlus, UserMinus, UserX, ArrowUpRight, Loader2, CreditCard } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { Sparkline } from '@/components/admin/charts/sparkline';
import { AdminDonutChart } from '@/components/admin/charts/donut-chart';

const PLAN_COLORS: Record<string, string> = {
  free: '#6b7280',
  starter: '#3b82f6',
  creator: '#10b981',
  pro: '#a78bfa',
  studio: '#f59e0b',
};


function getInitials(name: string, email: string) {
  if (name && name.trim()) {
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function UsersTab({ active }: { active: boolean }) {
  const { accessToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'user-stats'],
    queryFn: () => api.admin.userStats(accessToken!),
    enabled: active && !!accessToken,
    refetchInterval: 60_000,
  });

  const { data: allUsersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['admin', 'users-all-pages'],
    queryFn: async () => {
      const first = await api.admin.users(accessToken!, 1, 100);
      const totalPages = first.meta.totalPages;
      const rest = totalPages > 1
        ? await Promise.all(Array.from({ length: totalPages - 1 }, (_, i) => api.admin.users(accessToken!, i + 2, 100)))
        : [];
      const all = [...first.data, ...rest.flatMap((r) => r.data)];

      const paid = all.filter((u) => u.subscription && u.subscription.planSlug !== 'free');
      const details: Awaited<ReturnType<typeof api.admin.user>>[] = [];
      for (let i = 0; i < paid.length; i += 3) {
        const batch = paid.slice(i, i + 3);
        const results = await Promise.all(batch.map((u) => api.admin.user(accessToken!, u.id)));
        details.push(...results);
        if (i + 3 < paid.length) await new Promise((r) => setTimeout(r, 500));
      }
      const cancelMap = new Map(details.map((d) => [d.id, d.subscription?.cancelAtPeriodEnd ?? false]));

      return all.map((u) => ({
        ...u,
        subscription: u.subscription
          ? { ...u.subscription, cancelAtPeriodEnd: cancelMap.get(u.id) ?? false }
          : null,
      }));
    },
    enabled: active && !!accessToken,
    refetchInterval: 120_000,
  });

  if (!active) return null;

  if (isLoading || !data) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
      </div>
    );
  }

  const sparkData = data.dailyNewUsers.map((d) => ({ value: d.count }));

  const donutData = data.planDistribution.map((p) => ({
    name: p.planName,
    value: p.userCount,
    color: PLAN_COLORS[p.planSlug] ?? '#6b7280',
  }));

  const allUsers: AdminUser[] = allUsersData ?? [];
  const paidUsers = allUsers.filter(
    (u) => u.subscription && u.subscription.planSlug !== 'free',
  );
  const byPlan = Object.values(
    paidUsers.reduce<Record<string, { slug: string; label: string; users: AdminUser[] }>>((acc, u) => {
      const slug = u.subscription!.planSlug;
      const label = u.subscription!.planName;
      if (!acc[slug]) acc[slug] = { slug, label, users: [] };
      acc[slug].users.push(u);
      return acc;
    }, {}),
  );

  return (
    <div className="flex flex-col gap-5 md:gap-8">
      {/* New users cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Novos Hoje" value={data.newUsersToday.toLocaleString('pt-BR')} icon={UserPlus} accent>
          <Sparkline data={sparkData} />
        </StatCard>
        <StatCard label="Novos Semana" value={data.newUsersWeek.toLocaleString('pt-BR')} icon={UserPlus} />
        <StatCard label="Novos Mês" value={data.newUsersMonth.toLocaleString('pt-BR')} icon={UserPlus} />
        <StatCard label="Total Usuários" value={data.totalUsers.toLocaleString('pt-BR')} icon={Users} />
      </div>

      {/* Conversion, churn, inactive */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Conversão Free→Pago"
          value={`${data.conversionRate.toFixed(1)}%`}
          icon={ArrowUpRight}
          accent={data.conversionRate > 5}
          sub={`${data.paidUsers} pagantes de ${data.totalUsers}`}
        />
        <StatCard
          label="Churn Rate"
          value={`${data.churnRate.toFixed(1)}%`}
          icon={UserMinus}
          sub="Cancelamentos no período"
        />
        <StatCard
          label="Usuários Inativos"
          value={(data.inactiveUsers ?? 0).toLocaleString('pt-BR')}
          icon={UserX}
          sub="Nunca geraram conteúdo"
        />
      </div>

      {/* Plan distribution + Top consumers */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-[#f3f0ed]">Distribuição por Plano</h3>
          <AdminDonutChart data={donutData} />
        </div>
        <div className="lg:col-span-3">
          <h3 className="mb-3 text-sm font-semibold text-[#f3f0ed]">Top 10 Consumidores</h3>
          <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] p-4">
            {data.topConsumers.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#f3f0ed]/30">Sem dados</p>
            ) : (
              <div className="flex flex-col gap-2">
                {data.topConsumers.map((u, i) => (
                  <div key={u.userId} className="flex items-center gap-3 border-b border-[#f3f0ed]/5 pb-2 last:border-0 last:pb-0">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f3f0ed]/5 text-[10px] font-bold text-[#f3f0ed]/40">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#f3f0ed]">{u.name || u.email}</p>
                      <p className="truncate text-[10px] text-[#f3f0ed]/30">{u.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold tabular-nums text-[#a2dd00]">{(u.totalCredits ?? 0).toLocaleString('pt-BR')}</p>
                      <p className="text-[10px] text-[#f3f0ed]/30">créditos</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Paid subscribers by plan */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-[#a2dd00]" />
          <h3 className="text-sm font-semibold text-[#f3f0ed]">Assinantes Pagos</h3>
          {!isLoadingUsers && (
            <span className="rounded-full bg-[#a2dd00]/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-[#a2dd00]">
              {paidUsers.length}
            </span>
          )}
        </div>

        {isLoadingUsers ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3 rounded-2xl border border-landing-text/6 bg-landing-text/2 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-landing-text/10 animate-pulse" />
                    <span className="h-3 w-14 rounded bg-landing-text/10 animate-pulse" />
                  </div>
                  <span className="h-4 w-5 rounded-full bg-landing-text/10 animate-pulse" />
                </div>
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <span className="h-6 w-6 shrink-0 rounded-full bg-landing-text/10 animate-pulse" />
                      <div className="flex flex-1 flex-col gap-1">
                        <span className="h-2.5 w-3/4 rounded bg-landing-text/10 animate-pulse" />
                        <span className="h-2 w-1/2 rounded bg-landing-text/6 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : byPlan.length === 0 ? (
          <div className="rounded-2xl border border-landing-text/6 bg-landing-text/2 p-6 text-center text-sm text-landing-text/30">
            Nenhum assinante pago encontrado
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {byPlan.map((plan) => {
              const color = PLAN_COLORS[plan.slug] ?? '#6b7280';
              return (
                <div
                  key={plan.slug}
                  className="flex flex-col gap-3 rounded-2xl border border-landing-text/6 bg-landing-text/2 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color }}>
                        {plan.label}
                      </span>
                    </div>
                    <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums" style={{ backgroundColor: `${color}18`, color }}>
                      {plan.users.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {plan.users.map((u) => (
                      <div key={u.id} className="flex items-center gap-2">
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-[#1a1a1a]"
                          style={{ backgroundColor: color }}
                        >
                          {getInitials(u.name, u.email)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-[11px] font-medium leading-tight text-landing-text/80">
                              {u.name || u.email}
                            </p>
                            {u.subscription?.cancelAtPeriodEnd && (
                              <span className="shrink-0 rounded px-1 py-0.5 text-[8px] font-bold uppercase leading-none text-orange-400 border border-orange-400/30 bg-orange-400/10">
                                Cancelando
                              </span>
                            )}
                          </div>
                          {u.name && (
                            <p className="truncate text-[9px] leading-tight text-landing-text/30">{u.email}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
