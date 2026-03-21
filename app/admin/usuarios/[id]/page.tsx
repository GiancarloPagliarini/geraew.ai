'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowLeft,
  Mail,
  Calendar,
  Shield,
  Coins,
  Sparkles,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  Image,
  Plus,
  Minus,
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

function genTypeLabel(type: string) {
  const map: Record<string, string> = {
    TEXT_TO_IMAGE: 'Texto → Imagem',
    IMAGE_TO_IMAGE: 'Imagem → Imagem',
    TEXT_TO_VIDEO: 'Texto → Vídeo',
    IMAGE_TO_VIDEO: 'Imagem → Vídeo',
    MOTION_CONTROL: 'Motion Control',
    REFERENCE_VIDEO: 'Referência',
  };
  return map[type] ?? type;
}

function statusBadge(status: string) {
  const config: Record<string, { color: string; icon: React.ElementType }> = {
    COMPLETED: { color: 'border-green-500/30 bg-green-500/10 text-green-400', icon: CheckCircle2 },
    PROCESSING: { color: 'border-blue-500/30 bg-blue-500/10 text-blue-400', icon: Clock },
    PENDING: { color: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400', icon: Clock },
    FAILED: { color: 'border-red-500/30 bg-red-500/10 text-red-400', icon: XCircle },
  };
  const c = config[status] ?? config.PENDING;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${c.color}`}>
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  );
}

export default function AdminUserDetailPage() {
  const { accessToken } = useAuth();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [creditAmount, setCreditAmount] = useState('');
  const [creditDesc, setCreditDesc] = useState('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => api.admin.user(accessToken!, id),
    enabled: !!accessToken && !!id,
  });

  const adjustMutation = useMutation({
    mutationFn: ({ amount, description }: { amount: number; description: string }) =>
      api.admin.adjustCredits(accessToken!, id, amount, description),
    onSuccess: () => {
      toast.success('Créditos ajustados com sucesso');
      setCreditAmount('');
      setCreditDesc('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', id] });
    },
    onError: () => {
      toast.error('Erro ao ajustar créditos');
    },
  });

  function handleAdjust(positive: boolean) {
    const amount = parseInt(creditAmount, 10);
    if (!amount || amount <= 0 || !creditDesc.trim()) {
      toast.error('Preencha a quantidade e o motivo');
      return;
    }
    adjustMutation.mutate({
      amount: positive ? amount : -amount,
      description: creditDesc.trim(),
    });
  }

  if (isLoading || !user) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
      </div>
    );
  }

  const totalCredits = user.credits
    ? user.credits.planCreditsRemaining + user.credits.bonusCreditsRemaining
    : 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Back */}
      <button
        onClick={() => router.push('/admin/usuarios')}
        className="flex w-fit items-center gap-2 text-sm text-[#f3f0ed]/50 transition-colors hover:text-[#f3f0ed]"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      {/* User info header */}
      <div className="flex flex-col gap-6 rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[#f3f0ed]">{user.name || 'Sem nome'}</h1>
            <Badge variant="outline" className="border-[#a2dd00]/20 bg-[#a2dd00]/5 text-[#a2dd00]">
              {user.role}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-[#f3f0ed]/40">
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> {user.email}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Cadastro: {new Date(user.createdAt).toLocaleDateString('pt-BR')}
            </span>
            {user.oauthProvider && (
              <span className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> {user.oauthProvider}
              </span>
            )}
          </div>
        </div>

        {/* Credits summary */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">
              Créditos
            </span>
            <div className="flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-[#a2dd00]" />
              <span className="text-2xl font-bold tabular-nums text-[#a2dd00]">
                {totalCredits.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription + Credits cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Subscription */}
        <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] p-5">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[#f3f0ed]/40" />
            <h3 className="text-sm font-semibold text-[#f3f0ed]">Assinatura</h3>
          </div>
          {user.subscription ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#f3f0ed]/40">Plano</span>
                <span className="text-sm font-medium text-[#f3f0ed]">{user.subscription.planName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#f3f0ed]/40">Status</span>
                <Badge variant="outline" className="border-[#a2dd00]/20 bg-[#a2dd00]/5 text-[#a2dd00]">
                  {user.subscription.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#f3f0ed]/40">Período</span>
                <span className="text-xs tabular-nums text-[#f3f0ed]/60">
                  {new Date(user.subscription.currentPeriodStart).toLocaleDateString('pt-BR')}
                  {' — '}
                  {new Date(user.subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
                </span>
              </div>
              {user.subscription.cancelAtPeriodEnd && (
                <Badge variant="outline" className="w-fit border-red-500/30 bg-red-500/10 text-red-400">
                  Cancela no fim do período
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#f3f0ed]/30">Sem assinatura ativa</p>
          )}
        </div>

        {/* Credits breakdown */}
        <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#a2dd00]/60" />
            <h3 className="text-sm font-semibold text-[#f3f0ed]">Créditos</h3>
          </div>
          {user.credits ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#f3f0ed]/40">Do plano</span>
                <span className="text-sm font-medium tabular-nums text-[#f3f0ed]">
                  {user.credits.planCreditsRemaining.toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#f3f0ed]/40">Bônus</span>
                <span className="text-sm font-medium tabular-nums text-[#a2dd00]">
                  {user.credits.bonusCreditsRemaining.toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#f3f0ed]/40">Usados no período</span>
                <span className="text-sm font-medium tabular-nums text-[#f3f0ed]/60">
                  {user.credits.planCreditsUsed.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#f3f0ed]/30">Sem balanço</p>
          )}
        </div>
      </div>

      {/* Credit adjustment */}
      <div className="rounded-2xl border border-[#a2dd00]/15 bg-[#a2dd00]/[0.03] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Coins className="h-4 w-4 text-[#a2dd00]" />
          <h3 className="text-sm font-semibold text-[#f3f0ed]">Ajustar Créditos</h3>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">
              Quantidade
            </label>
            <Input
              type="number"
              min={1}
              placeholder="500"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              className="h-9 w-32 border-[#f3f0ed]/10 bg-[#f3f0ed]/[0.03] text-sm tabular-nums text-[#f3f0ed] placeholder:text-[#f3f0ed]/20 focus-visible:border-[#a2dd00]/30 focus-visible:ring-[#a2dd00]/10"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">
              Motivo
            </label>
            <Input
              placeholder="Ex: Compensação por erro no sistema"
              value={creditDesc}
              onChange={(e) => setCreditDesc(e.target.value)}
              className="h-9 border-[#f3f0ed]/10 bg-[#f3f0ed]/[0.03] text-sm text-[#f3f0ed] placeholder:text-[#f3f0ed]/20 focus-visible:border-[#a2dd00]/30 focus-visible:ring-[#a2dd00]/10"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleAdjust(true)}
              disabled={adjustMutation.isPending}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-[#a2dd00] px-4 text-xs font-bold text-[#1a2123] transition-all hover:bg-[#b5f000] active:scale-[0.97] disabled:opacity-50"
            >
              {adjustMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Adicionar
            </button>
            <button
              onClick={() => handleAdjust(false)}
              disabled={adjustMutation.isPending}
              className="flex h-9 items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 text-xs font-bold text-red-400 transition-all hover:bg-red-500/20 active:scale-[0.97] disabled:opacity-50"
            >
              <Minus className="h-3.5 w-3.5" />
              Remover
            </button>
          </div>
        </div>
      </div>

      {/* Recent generations */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 text-[#f3f0ed]/40" />
          <h3 className="text-sm font-semibold text-[#f3f0ed]">Últimas Gerações</h3>
        </div>

        {user.recentGenerations.length > 0 ? (
          <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02]">
            <Table>
              <TableHeader>
                <TableRow className="border-[#f3f0ed]/6 hover:bg-transparent">
                  <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Tipo</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Status</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Prompt</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Créditos</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.recentGenerations.map((gen) => (
                  <TableRow key={gen.id} className="border-[#f3f0ed]/4">
                    <TableCell>
                      <span className="text-xs font-medium text-[#f3f0ed]/70">
                        {genTypeLabel(gen.type)}
                      </span>
                    </TableCell>
                    <TableCell>{statusBadge(gen.status)}</TableCell>
                    <TableCell>
                      <span className="line-clamp-1 max-w-[200px] text-xs text-[#f3f0ed]/50">
                        {gen.prompt || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs tabular-nums text-[#a2dd00]">
                        {gen.creditsConsumed}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs tabular-nums text-[#f3f0ed]/40">
                        {new Date(gen.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02]">
            <span className="text-sm text-[#f3f0ed]/30">Nenhuma geração encontrada</span>
          </div>
        )}
      </div>
    </div>
  );
}
