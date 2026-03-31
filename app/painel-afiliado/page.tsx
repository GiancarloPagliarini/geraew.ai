'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  Users,
  DollarSign,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  Link,
  ArrowLeft,
  Wallet,
  Timer,
  Info,
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
      className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
        copied
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

  useEffect(() => {
    if (!loading && !accessToken) {
      router.replace('/workspace');
    }
  }, [loading, accessToken, router]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['affiliate', 'me'],
    queryFn: () => api.affiliates.me(accessToken!),
    enabled: !!accessToken,
    refetchInterval: 30_000,
  });

  // Still loading auth
  if (loading || !accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#111618]">
        <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
      </div>
    );
  }

  // Loading affiliate data
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#111618]">
        <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
      </div>
    );
  }

  // Not an affiliate
  if (!data || error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#111618] px-4">
        <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2 p-8 text-center">
          <Users className="mx-auto h-10 w-10 text-[#f3f0ed]/15" />
          <h1 className="mt-4 text-lg font-bold text-[#f3f0ed]">Voce nao e um afiliado</h1>
          <p className="mt-2 text-sm text-[#f3f0ed]/40">
            Sua conta nao esta vinculada a nenhum programa de afiliados.
          </p>
          <a
            href="/workspace"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#a2dd00] px-4 py-2.5 text-sm font-semibold text-[#1c1917] transition-colors hover:bg-[#a2dd00]/90"
          >
            <ArrowLeft className="h-4 w-4" />
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
    { label: 'Usuarios Indicados', value: summary.referredUsers.toLocaleString('pt-BR'), icon: Users, color: 'text-blue-400' },
    { label: 'Disponivel p/ Saque', value: formatCents(summary.availableCommissionCents ?? 0), icon: Wallet, color: 'text-emerald-400' },
    { label: 'Em Maturacao', value: formatCents(summary.maturingCommissionCents ?? 0), icon: Timer, color: 'text-yellow-400' },
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
                    {affiliate.name} · Comissao: {affiliate.commissionPercent}%
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-[#f3f0ed]/8 bg-[#f3f0ed]/3 px-3 py-1.5">
                <span className="text-xs text-[#f3f0ed]/40">Codigo:</span>
                <span className="font-mono text-sm font-medium text-[#a2dd00]">{affiliate.code}</span>
              </div>
              <CopyButton text={affiliate.code} />
              <CopyButton text={referralLink} label="Copiar Link" />
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
              As comissoes ficam em maturacao por <span className="font-medium text-[#f3f0ed]/60">{maturationDays} dias</span> apos
              o pagamento. Apos esse periodo, ficam disponiveis para saque.
            </p>
          </div>

          {/* Earnings section */}
          <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2">
            <div className="border-b border-[#f3f0ed]/6 px-4 py-3">
              <span className="text-sm font-medium text-[#f3f0ed]">
                Comissoes ({earnings.length})
              </span>
            </div>

            {earnings.length === 0 ? (
              <p className="py-10 text-center text-sm text-[#f3f0ed]/30">
                Nenhuma comissao registrada ainda
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
                            : `Creditos ${earning.payment.creditPackage?.name ?? ''}`}
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
                              Disponivel em {formatDate(availDate.toISOString())}
                            </span>
                          ) : (
                            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                              Disponivel
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
                          Usuario
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">
                          Tipo
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">
                          Valor Pago
                        </TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">
                          Comissao
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
                          className="border-[#f3f0ed]/4 transition-colors hover:bg-[#f3f0ed]/3"
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
                                {earning.payment.type === 'SUBSCRIPTION' ? 'Assinatura' : 'Creditos'}
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
                                    Em maturacao
                                  </Badge>
                                  <span className="mt-1 text-[10px] tabular-nums text-[#f3f0ed]/30">
                                    Disponivel em {formatDate(availDate.toISOString())}
                                  </span>
                                </div>
                              ) : (
                                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                                  Disponivel
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
