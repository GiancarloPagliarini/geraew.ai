'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { AdminUserGeneration } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
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
  Power,
  Trash2,
  Play,
  ChevronLeft,
  ChevronRight,
  Eye,
  Video,
  AlertTriangle,
  RefreshCw,
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
    TEXT_TO_IMAGE: 'Texto \u2192 Imagem',
    IMAGE_TO_IMAGE: 'Imagem \u2192 Imagem',
    TEXT_TO_VIDEO: 'Texto \u2192 Vídeos',
    IMAGE_TO_VIDEO: 'Imagem \u2192 Vídeos',
    MOTION_CONTROL: 'Motion Control',
    REFERENCE_VIDEO: 'Refer\u00eancia',
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

function isVideoMime(mimeType: string | null) {
  return mimeType?.startsWith('video/') ?? false;
}

const VIDEO_GENERATION_TYPES = ['TEXT_TO_VIDEO', 'IMAGE_TO_VIDEO', 'MOTION_CONTROL', 'REFERENCE_VIDEO'];

function MediaPreview({ output, genType }: { output: AdminUserGeneration['outputs'][0]; genType: string }) {
  const [expanded, setExpanded] = useState(false);

  if (isVideoMime(output.mimeType) || VIDEO_GENERATION_TYPES.includes(genType)) {
    return (
      <>
        <button
          onClick={() => setExpanded(true)}
          className="group relative aspect-video w-full overflow-hidden rounded-lg border border-[#f3f0ed]/8 bg-black"
        >
          {output.thumbnailUrl ? (
            <img src={output.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#f3f0ed]/5">
              <Video className="h-8 w-8 text-[#f3f0ed]/20" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
            <Play className="h-8 w-8 text-white" />
          </div>
          <Badge className="absolute bottom-1.5 right-1.5 border-none bg-black/60 text-[10px] text-white">
            VIDEO
          </Badge>
        </button>
        {expanded && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setExpanded(false)}
          >
            <video
              src={output.url}
              controls
              autoPlay
              className="max-h-[85vh] max-w-[85vw] rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setExpanded(true)}
        className="group relative aspect-square w-full overflow-hidden rounded-lg border border-[#f3f0ed]/8"
      >
        <img
          src={output.thumbnailUrl || output.url}
          alt=""
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
          <Eye className="h-6 w-6 text-white" />
        </div>
      </button>
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setExpanded(false)}
        >
          <img
            src={output.url}
            alt=""
            className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

export default function AdminUserDetailPage() {
  const { accessToken } = useAuth();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [creditAmount, setCreditAmount] = useState('');
  const [creditDesc, setCreditDesc] = useState('');
  const [freeGenAmount, setFreeGenAmount] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [genPage, setGenPage] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => api.admin.user(accessToken!, id),
    enabled: !!accessToken && !!id,
  });

  const { data: genData, isLoading: genLoading } = useQuery({
    queryKey: ['admin', 'user', id, 'generations', genPage],
    queryFn: () => api.admin.userGenerations(accessToken!, id, genPage, 12),
    enabled: !!accessToken && !!id,
  });

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.plans.list(accessToken!),
    enabled: !!accessToken,
  });

  const changePlanMutation = useMutation({
    mutationFn: (planSlug: string) =>
      api.admin.changeUserPlan(accessToken!, id, planSlug),
    onSuccess: () => {
      toast.success('Plano alterado com sucesso');
      setSelectedPlan('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: () => {
      toast.error('Erro ao alterar plano');
    },
  });

  const currentPlanSlug = user?.subscription?.planSlug ?? 'free';
  const availablePlans = useMemo(
    () => (plans ?? []).filter((p) => p.slug !== currentPlanSlug),
    [plans, currentPlanSlug],
  );

  const adjustFreeGenMutation = useMutation({
    mutationFn: (amount: number) =>
      api.admin.adjustFreeGenerations(accessToken!, id, amount),
    onSuccess: () => {
      toast.success('Gerações gratuitas ajustadas com sucesso');
      setFreeGenAmount('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', id] });
    },
    onError: () => {
      toast.error('Erro ao ajustar Gerações gratuitas');
    },
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
      toast.error('Erro ao ajustar Créditos');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (isActive: boolean) =>
      api.admin.toggleUserStatus(accessToken!, id, isActive),
    onSuccess: (_, isActive) => {
      toast.success(isActive ? 'Usu\u00e1rio ativado' : 'Usu\u00e1rio desativado');
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: () => {
      toast.error('Erro ao alterar status do usu\u00e1rio');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.admin.deleteUser(accessToken!, id),
    onSuccess: () => {
      toast.success('Usu\u00e1rio exclu\u00eddo com sucesso');
      router.push('/admin/usuarios');
    },
    onError: () => {
      toast.error('Erro ao excluir usu\u00e1rio');
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

  const generations = genData?.data ?? [];
  const genTotalPages = genData?.meta?.totalPages ?? 1;

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
            <Badge
              variant="outline"
              className={
                user.isActive
                  ? 'border-green-500/30 bg-green-500/10 text-green-400'
                  : 'border-red-500/30 bg-red-500/10 text-red-400'
              }
            >
              {user.isActive ? 'Ativo' : 'Inativo'}
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

        {/* Actions + Credits */}
        <div className="flex items-center gap-3">
          {/* Toggle status */}
          <button
            onClick={() => toggleStatusMutation.mutate(!user.isActive)}
            disabled={toggleStatusMutation.isPending}
            className={`flex h-9 items-center gap-1.5 rounded-xl px-4 text-xs font-bold transition-all active:scale-[0.97] disabled:opacity-50 ${user.isActive
              ? 'border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
              : 'bg-[#a2dd00] text-[#1a2123] hover:bg-[#b5f000]'
              }`}
          >
            {toggleStatusMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Power className="h-3.5 w-3.5" />
            )}
            {user.isActive ? 'Desativar' : 'Ativar'}
          </button>

          {/* Delete */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={user.role === 'ADMIN'}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 text-xs font-bold text-red-400 transition-all hover:bg-red-500/20 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Excluir
          </button>

          {/* Credits summary */}
          <div className="flex flex-col items-end gap-1 pl-3 border-l border-[#f3f0ed]/8">
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

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div
            className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-red-500/20 bg-[#1a2123] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#f3f0ed]">Excluir usu\u00e1rio</h3>
                <p className="text-xs text-[#f3f0ed]/40">Esta a\u00e7\u00e3o \u00e9 irrevers\u00edvel</p>
              </div>
            </div>
            <p className="text-sm text-[#f3f0ed]/60">
              Tem certeza que deseja excluir permanentemente <strong className="text-[#f3f0ed]">{user.name || user.email}</strong>?
              Todos os dados, Gerações e hist\u00f3rico ser\u00e3o removidos.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex h-9 items-center rounded-xl border border-[#f3f0ed]/10 px-4 text-xs font-bold text-[#f3f0ed]/60 transition-colors hover:bg-[#f3f0ed]/5"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteMutation.mutate();
                  setShowDeleteConfirm(false);
                }}
                disabled={deleteMutation.isPending}
                className="flex h-9 items-center gap-1.5 rounded-xl bg-red-500 px-4 text-xs font-bold text-white transition-all hover:bg-red-600 active:scale-[0.97] disabled:opacity-50"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Confirmar exclus\u00e3o
              </button>
            </div>
          </div>
        </div>
      )}

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
                  {' \u2014 '}
                  {new Date(user.subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
                </span>
              </div>
              {user.subscription.cancelAtPeriodEnd && (
                <Badge variant="outline" className="w-fit border-red-500/30 bg-red-500/10 text-red-400">
                  Cancela no fim do Período
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
                <span className="text-xs text-[#f3f0ed]/40">Usados no Período</span>
                <span className="text-sm font-medium tabular-nums text-[#f3f0ed]/60">
                  {user.credits.planCreditsUsed.toLocaleString('pt-BR')}
                </span>
              </div>
              {user.credits.freeVeoGenerationsRemaining != null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#f3f0ed]/40">Gerações Gratuitos (Vídeos)</span>
                  <span className="text-sm font-medium tabular-nums text-emerald-400">
                    {user.credits.freeVeoGenerationsRemaining}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#f3f0ed]/30">Sem balan\u00e7o</p>
          )}
        </div>
      </div>

      {/* Change plan */}
      <div className="rounded-2xl border border-purple-500/15 bg-purple-500/[0.03] p-5">
        <div className="mb-4 flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-[#f3f0ed]">Alterar Plano</h3>
          <Badge variant="outline" className="border-[#f3f0ed]/10 bg-[#f3f0ed]/5 text-[#f3f0ed]/50 text-[10px]">
            Atual: {user.subscription?.planName ?? 'Free'}
          </Badge>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">
              Novo plano
            </label>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="h-9 rounded-xl border border-[#f3f0ed]/10 bg-[#f3f0ed]/[0.03] px-3 text-sm text-[#f3f0ed] focus:border-purple-500/30 focus:outline-none focus:ring-1 focus:ring-purple-500/10"
            >
              <option value="" className="bg-[#1a2123]">Selecione um plano</option>
              {availablePlans.map((p) => (
                <option key={p.slug} value={p.slug} className="bg-[#1a2123]">
                  {p.name} — {p.creditsPerMonth} créditos/mês — R$ {(p.priceCents / 100).toFixed(2)}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              if (!selectedPlan) {
                toast.error('Selecione um plano');
                return;
              }
              changePlanMutation.mutate(selectedPlan);
            }}
            disabled={changePlanMutation.isPending || !selectedPlan}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-purple-500 px-4 text-xs font-bold text-white transition-all hover:bg-purple-600 active:scale-[0.97] disabled:opacity-50"
          >
            {changePlanMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Alterar Plano
          </button>
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
              placeholder="Ex: Compensa\u00e7\u00e3o por erro no sistema"
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

      {/* Free generations adjustment */}
      <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.03] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Video className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-[#f3f0ed]">Gerações Gratuitas de Vídeos</h3>
          <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-[10px]">
            Atual: {user.credits?.freeVeoGenerationsRemaining ?? 0}
          </Badge>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">
              Nova quantidade
            </label>
            <Input
              type="number"
              min={0}
              placeholder="2"
              value={freeGenAmount}
              onChange={(e) => setFreeGenAmount(e.target.value)}
              className="h-9 w-32 border-[#f3f0ed]/10 bg-[#f3f0ed]/[0.03] text-sm tabular-nums text-[#f3f0ed] placeholder:text-[#f3f0ed]/20 focus-visible:border-emerald-500/30 focus-visible:ring-emerald-500/10"
            />
          </div>
          <button
            onClick={() => {
              const amount = parseInt(freeGenAmount, 10);
              if (isNaN(amount) || amount < 0) {
                toast.error('Informe uma quantidade v\u00e1lida (>= 0)');
                return;
              }
              adjustFreeGenMutation.mutate(amount);
            }}
            disabled={adjustFreeGenMutation.isPending}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-500 px-4 text-xs font-bold text-white transition-all hover:bg-emerald-600 active:scale-[0.97] disabled:opacity-50"
          >
            {adjustFreeGenMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Definir
          </button>
        </div>
      </div>

      {/* User Generations Gallery */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-[#f3f0ed]/40" />
            <h3 className="text-sm font-semibold text-[#f3f0ed]">
              Gerações do Usu\u00e1rio
            </h3>
            {genData?.meta && (
              <span className="text-xs text-[#f3f0ed]/30">
                ({genData.meta.total.toLocaleString('pt-BR')} total)
              </span>
            )}
          </div>
        </div>

        {genLoading ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02]">
            <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
          </div>
        ) : generations.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {generations.map((gen) => (
                <div
                  key={gen.id}
                  className="group flex flex-col gap-2 rounded-xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02] p-3"
                >
                  {/* Media outputs */}
                  {gen.outputs.length > 0 ? (
                    <MediaPreview output={gen.outputs[0]} genType={gen.type} />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-[#f3f0ed]/8 bg-[#f3f0ed]/5">
                      {gen.status === 'PROCESSING' ? (
                        <Loader2 className="h-6 w-6 animate-spin text-blue-400/50" />
                      ) : gen.status === 'FAILED' ? (
                        <XCircle className="h-6 w-6 text-red-400/50" />
                      ) : (
                        <Image className="h-6 w-6 text-[#f3f0ed]/15" />
                      )}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-[#f3f0ed]/50">
                        {genTypeLabel(gen.type)}
                      </span>
                      {statusBadge(gen.status)}
                    </div>
                    {gen.prompt && (
                      <p className="line-clamp-2 text-[11px] leading-tight text-[#f3f0ed]/40">
                        {gen.prompt}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] tabular-nums text-[#f3f0ed]/30">
                        {new Date(gen.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] tabular-nums text-[#a2dd00]/70">
                        <Coins className="h-2.5 w-2.5" />
                        {gen.creditsConsumed}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {genTotalPages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#f3f0ed]/30">
                  P\u00e1gina {genPage} de {genTotalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={genPage <= 1}
                    onClick={() => setGenPage((p) => p - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f3f0ed]/8 text-[#f3f0ed]/50 transition-colors hover:bg-[#f3f0ed]/5 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={genPage >= genTotalPages}
                    onClick={() => setGenPage((p) => p + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f3f0ed]/8 text-[#f3f0ed]/50 transition-colors hover:bg-[#f3f0ed]/5 disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02]">
            <span className="text-sm text-[#f3f0ed]/30">Nenhuma gera\u00e7\u00e3o encontrada</span>
          </div>
        )}
      </div>
    </div>
  );
}
