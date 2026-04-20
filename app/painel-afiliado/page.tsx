'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, type PixKeyType } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLoadingMessage } from '@/lib/loading-messages';
import {
  Loader2,
  Users,
  CheckCircle2,
  Copy,
  Check,
  Link,
  ArrowLeft,
  Wallet,
  Timer,
  Info,
  RefreshCw,
  Pencil,
  KeyRound,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://geraew.com.br';

function formatCents(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR');
}

function getAvailableDate(createdAt: string, maturationDays: number) {
  const d = new Date(createdAt);
  d.setDate(d.getDate() + maturationDays);
  return d;
}

function daysUntil(date: Date) {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const PIX_TYPES: { value: PixKeyType; label: string; placeholder: string }[] = [
  { value: 'CPF', label: 'CPF', placeholder: '000.000.000-00' },
  { value: 'CNPJ', label: 'CNPJ', placeholder: '00.000.000/0000-00' },
  { value: 'EMAIL', label: 'E-mail', placeholder: 'seu@email.com' },
  { value: 'PHONE', label: 'Telefone', placeholder: '+55 11 9xxxx-xxxx' },
  { value: 'RANDOM', label: 'Aleatória', placeholder: 'xxxxxxxx-xxxx-...' },
];

function PixKeyForm({
  initialType,
  initialKey,
  submitting,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialType?: PixKeyType | null;
  initialKey?: string | null;
  submitting?: boolean;
  submitLabel: string;
  onSubmit: (data: { pixKeyType: PixKeyType; pixKey: string }) => void;
  onCancel?: () => void;
}) {
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>(initialType ?? 'CPF');
  const [pixKey, setPixKey] = useState(initialKey ?? '');
  const selected = PIX_TYPES.find((t) => t.value === pixKeyType);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pixKey.trim()) return;
    onSubmit({ pixKeyType, pixKey: pixKey.trim() });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-left">
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wide text-[#f3f0ed]/40">Tipo de chave</label>
        <div className="grid grid-cols-5 gap-1">
          {PIX_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setPixKeyType(type.value)}
              className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors ${pixKeyType === type.value
                ? 'border-[#a2dd00]/50 bg-[#a2dd00]/10 text-[#a2dd00]'
                : 'border-[#f3f0ed]/8 text-[#f3f0ed]/50 hover:border-[#f3f0ed]/20 hover:text-[#f3f0ed]/80'
                }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wide text-[#f3f0ed]/40">Chave Pix</label>
        <input
          type="text"
          value={pixKey}
          onChange={(e) => setPixKey(e.target.value)}
          placeholder={selected?.placeholder}
          required
          className="h-10 rounded-lg border border-[#f3f0ed]/8 bg-[#f3f0ed]/3 px-3 text-sm text-[#f3f0ed] placeholder:text-[#f3f0ed]/20 focus:border-[#a2dd00]/30 focus:outline-none"
        />
      </div>
      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-[#f3f0ed]/8 px-4 py-2.5 text-sm font-medium text-[#f3f0ed]/60 transition-colors hover:bg-[#f3f0ed]/5"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || !pixKey.trim()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#a2dd00] px-4 py-2.5 text-sm font-semibold text-[#1c1917] transition-colors hover:bg-[#a2dd00]/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copiado!');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors ${copied
        ? 'border-[#a2dd00]/30 bg-[#a2dd00]/10 text-[#a2dd00]'
        : 'border-[#f3f0ed]/8 text-[#f3f0ed]/50 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70'
        }`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : label ? <Link className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {label ? (copied ? 'Copiado!' : label) : (copied ? 'Copiado!' : 'Copiar')}
    </button>
  );
}

export default function PainelAfiliadoPage() {
  const { accessToken, user, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const loadingMsg = useLoadingMessage('afiliado');

  useEffect(() => {
    if (!loading && !accessToken) {
      router.replace('/workspace');
    }
  }, [loading, accessToken, router]);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['affiliate', 'me'],
    queryFn: () => api.affiliates.me(accessToken!),
    enabled: !!accessToken,
    refetchInterval: 30_000,
  });

  const [editingPix, setEditingPix] = useState(false);

  const createMutation = useMutation({
    mutationFn: (input: { pixKey: string; pixKeyType: PixKeyType }) =>
      api.affiliates.createMe(accessToken!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate', 'me'] });
      toast.success('Link de afiliado criado!', {
        description: 'Seu código já está disponível no painel.',
      });
    },
    onError: () =>
      toast.error('Não foi possível criar', {
        description: 'Tente novamente em instantes.',
      }),
  });

  const updatePixMutation = useMutation({
    mutationFn: (input: { pixKey: string; pixKeyType: PixKeyType }) =>
      api.affiliates.updateMyPixKey(accessToken!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate', 'me'] });
      toast.success('Chave Pix atualizada!');
      setEditingPix(false);
    },
    onError: () =>
      toast.error('Não foi possível atualizar', {
        description: 'Tente novamente em instantes.',
      }),
  });

  // Still loading auth
  if (loading || !accessToken) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#111618] px-4">
        <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
        {loadingMsg && <p className="text-center text-sm text-[#f3f0ed]/40">{loadingMsg}</p>}
      </div>
    );
  }

  // Loading affiliate data
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#111618] px-4">
        <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
        {loadingMsg && <p className="text-center text-sm text-[#f3f0ed]/40">{loadingMsg}</p>}
      </div>
    );
  }

  // Not an affiliate
  if (!data || error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#111618] px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2 p-8">
          <div className="text-center">
            <Users className="mx-auto h-10 w-10 text-[#a2dd00]/50" />
            <h1 className="mt-4 text-lg font-bold text-[#f3f0ed]">Torne-se afiliado da Geraew</h1>
            <p className="mt-2 text-sm leading-relaxed text-[#f3f0ed]/50">
              Ganhe 20% de comissão recorrente sobre cada pagamento dos seus indicados.
              Pagamento via Pix em até 30 dias.
            </p>
          </div>
          <div className="mt-6">
            <PixKeyForm
              submitLabel="Tornar-se afiliado"
              submitting={createMutation.isPending}
              onSubmit={(input) => createMutation.mutate(input)}
            />
          </div>
          <a
            href="/workspace"
            className="mt-4 flex items-center justify-center gap-2 text-xs text-[#f3f0ed]/40 transition-colors hover:text-[#f3f0ed]/70"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao Workspace
          </a>
        </div>
      </div>
    );
  }

  const { affiliate, summary, earnings } = data;
  const maturationDays = summary.maturationDays ?? 30;
  const referralLink = `${SITE_URL}/?ref=${affiliate.code}`;

  const statCards = [
    { label: 'Usuários Indicados', value: summary.referredUsers.toLocaleString('pt-BR'), icon: Users, color: 'text-blue-400' },
    { label: 'A Receber', value: formatCents(summary.availableCommissionCents ?? 0), icon: Wallet, color: 'text-emerald-400' },
    { label: 'Em Maturação', value: formatCents(summary.maturingCommissionCents ?? 0), icon: Timer, color: 'text-yellow-400' },
    { label: 'Pago', value: formatCents(summary.paidCommissionCents ?? 0), icon: CheckCircle2, color: 'text-green-400' },
  ];

  return (
    <div className="min-h-screen bg-[#111618]">
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10">
        <div className="flex flex-col gap-5 md:gap-8">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <a
                  href="/workspace"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#f3f0ed]/8 text-[#f3f0ed]/40 transition-colors hover:bg-[#f3f0ed]/5"
                >
                  <ArrowLeft className="h-4 w-4" />
                </a>
                <div>
                  <h1 className="text-xl font-bold text-[#f3f0ed] md:text-2xl">Painel de Afiliado</h1>
                  <p className="mt-0.5 text-sm text-[#f3f0ed]/40">
                    {affiliate.name} · Comissão: {affiliate.commissionPercent}%
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-[#f3f0ed]/8 bg-[#f3f0ed]/3 px-3 py-1.5">
                <span className="text-xs text-[#f3f0ed]/40">Código:</span>
                <span className="font-mono text-sm font-medium text-[#a2dd00]">{affiliate.code}</span>
              </div>
              <CopyButton text={affiliate.code} />
              <CopyButton text={referralLink} label="Copiar Link" />
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                title="Atualizar"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f3f0ed]/8 text-[#f3f0ed]/40 transition-colors hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 disabled:opacity-40"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="flex flex-col gap-2 rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2 p-4"
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${card.color}`} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#f3f0ed]/30">
                      {card.label}
                    </span>
                  </div>
                  <span className="text-lg font-bold tabular-nums text-[#f3f0ed]">{card.value}</span>
                </div>
              );
            })}
          </div>

          {/* Maturation info */}
          <div className="flex items-start gap-3 rounded-xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2 px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#f3f0ed]/30" />
            <p className="text-xs leading-relaxed text-[#f3f0ed]/40">
              As comissões ficam em maturação por <span className="font-medium text-[#f3f0ed]/60">{maturationDays} dias</span> após
              o pagamento. Após esse período, ficam disponíveis para saque.
            </p>
          </div>

          {/* Pix key card */}
          <div
            className={`rounded-2xl border p-4 ${affiliate.pixKey
              ? 'border-[#f3f0ed]/6 bg-[#f3f0ed]/2'
              : 'border-yellow-500/30 bg-yellow-500/5'
              }`}
          >
            {editingPix ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-[#a2dd00]" />
                  <span className="text-sm font-semibold text-[#f3f0ed]">
                    {affiliate.pixKey ? 'Editar chave Pix' : 'Cadastrar chave Pix'}
                  </span>
                </div>
                <PixKeyForm
                  initialType={affiliate.pixKeyType}
                  initialKey={affiliate.pixKey}
                  submitLabel="Salvar"
                  submitting={updatePixMutation.isPending}
                  onSubmit={(input) => updatePixMutation.mutate(input)}
                  onCancel={() => setEditingPix(false)}
                />
              </div>
            ) : affiliate.pixKey ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#a2dd00]/10">
                    <KeyRound className="h-4 w-4 text-[#a2dd00]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#f3f0ed]/30">
                      Chave Pix ({affiliate.pixKeyType})
                    </p>
                    <p className="mt-0.5 truncate font-mono text-sm text-[#f3f0ed]">{affiliate.pixKey}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingPix(true)}
                  className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[#f3f0ed]/8 px-2.5 text-xs font-medium text-[#f3f0ed]/50 transition-colors hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-500/10">
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#f3f0ed]">Cadastre sua chave Pix</p>
                    <p className="mt-0.5 text-xs text-[#f3f0ed]/50">
                      Sem chave cadastrada não é possível receber as comissões.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingPix(true)}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#a2dd00] px-3 text-xs font-semibold text-[#1c1917] transition-colors hover:bg-[#a2dd00]/90"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Cadastrar
                </button>
              </div>
            )}
          </div>

          {/* Earnings section */}
          <div className="overflow-hidden rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2">
            <div className="border-b border-[#f3f0ed]/6 px-4 py-3">
              <span className="text-sm font-medium text-[#f3f0ed]">
                Comissões ({earnings.length})
              </span>
            </div>

            {earnings.length === 0 ? (
              <p className="py-10 text-center text-sm text-[#f3f0ed]/30">
                Nenhuma comissão registrada ainda
              </p>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="flex flex-col gap-2 p-3 md:hidden">
                  {earnings.map((earning) => (
                    <div
                      key={earning.id}
                      className="flex items-center gap-3 rounded-xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#f3f0ed]">
                          {earning.user.name || earning.user.email}
                        </p>
                        <p className="text-xs text-[#f3f0ed]/40">
                          {earning.payment.type === 'SUBSCRIPTION'
                            ? `Assinatura ${earning.payment.subscription?.plan.name ?? ''}`
                            : `Créditos ${earning.payment.creditPackage?.name ?? ''}`}
                          {' · '}{formatDate(earning.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-bold tabular-nums text-[#a2dd00]">
                          {formatCents(earning.commissionCents)}
                        </span>
                        {earning.status === 'PAID' ? (
                          <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-400">
                            Pago
                          </Badge>
                        ) : (() => {
                          const availDate = getAvailableDate(earning.createdAt, maturationDays);
                          const days = daysUntil(availDate);
                          return days > 0 ? (
                            <span className="text-[10px] tabular-nums text-yellow-400">
                              Disponível em {formatDate(availDate.toISOString())}
                            </span>
                          ) : (
                            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                              Disponível
                            </Badge>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#f3f0ed]/6 hover:bg-transparent">
                        <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">
                          Usuário
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">
                          Tipo
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">
                          Valor Líquido
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">
                          Comissão
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">
                          Status
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">
                          Data
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {earnings.map((earning) => (
                        <TableRow
                          key={earning.id}
                          className="border-[#f3f0ed]/6 transition-colors hover:bg-[#f3f0ed]/[0.04]"
                        >
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm text-[#f3f0ed]">{earning.user.name || '—'}</span>
                              <span className="text-xs text-[#f3f0ed]/40">{earning.user.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm text-[#f3f0ed]/60">
                                {earning.payment.type === 'SUBSCRIPTION' ? 'Assinatura' : 'Créditos'}
                              </span>
                              <span className="text-xs text-[#f3f0ed]/30">
                                {earning.payment.subscription?.plan.name ?? earning.payment.creditPackage?.name ?? ''}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm tabular-nums text-[#f3f0ed]/60">
                              {formatCents(earning.amountCents)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-bold tabular-nums text-[#a2dd00]">
                              {formatCents(earning.commissionCents)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {earning.status === 'PAID' ? (
                              <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-400">
                                Pago
                              </Badge>
                            ) : (() => {
                              const availDate = getAvailableDate(earning.createdAt, maturationDays);
                              const days = daysUntil(availDate);
                              return days > 0 ? (
                                <div className="flex flex-col">
                                  <Badge variant="outline" className="w-fit border-yellow-500/30 bg-yellow-500/10 text-yellow-400">
                                    Em maturação
                                  </Badge>
                                  <span className="mt-1 text-[10px] tabular-nums text-[#f3f0ed]/30">
                                    Disponível em {formatDate(availDate.toISOString())}
                                  </span>
                                </div>
                              ) : (
                                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                                  Disponível
                                </Badge>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs tabular-nums text-[#f3f0ed]/40">
                              {formatDate(earning.createdAt)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
