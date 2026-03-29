'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { OverviewTab } from '@/components/admin/tabs/overview-tab';
import { FinancialTab } from '@/components/admin/tabs/financial-tab';
import { UsersTab } from '@/components/admin/tabs/users-tab';
import { UsageTab } from '@/components/admin/tabs/usage-tab';
import { CreditsTab } from '@/components/admin/tabs/credits-tab';
import { HealthTab } from '@/components/admin/tabs/health-tab';

const TABS = [
  { value: 'overview', label: 'Visão Geral' },
  { value: 'financial', label: 'Financeiro' },
  { value: 'users', label: 'Usuários' },
  { value: 'usage', label: 'Uso' },
  { value: 'credits', label: 'Créditos' },
  { value: 'health', label: 'Sistema' },
] as const;

export default function AdminDashboardPage() {
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('overview');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => api.admin.stats(accessToken!),
    enabled: !!accessToken,
    refetchInterval: 30_000,
  });

  const { data: providerData } = useQuery({
    queryKey: ['admin', 'provider-stats'],
    queryFn: () => api.admin.providerStats(accessToken!),
    enabled: !!accessToken,
    refetchInterval: 30_000,
  });

  if (isLoading || !stats) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 md:gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#f3f0ed]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#f3f0ed]/40">Painel de controle do sistema</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line" className="mb-2 w-full flex-wrap gap-1 border-b border-[#f3f0ed]/6 pb-1">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#f3f0ed]/40 hover:text-[#f3f0ed]/60 data-[state=active]:bg-[#a2dd00]/5 data-[state=active]:text-[#a2dd00] data-[state=active]:after:bg-[#a2dd00]"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab stats={stats} providers={providerData?.providers ?? []} />
        </TabsContent>

        <TabsContent value="financial">
          <FinancialTab active={activeTab === 'financial'} />
        </TabsContent>

        <TabsContent value="users">
          <UsersTab active={activeTab === 'users'} />
        </TabsContent>

        <TabsContent value="usage">
          <UsageTab active={activeTab === 'usage'} />
        </TabsContent>

        <TabsContent value="credits">
          <CreditsTab active={activeTab === 'credits'} />
        </TabsContent>

        <TabsContent value="health">
          <HealthTab active={activeTab === 'health'} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
