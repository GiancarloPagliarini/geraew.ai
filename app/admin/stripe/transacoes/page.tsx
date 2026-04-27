'use client';

import { useAuth } from '@/lib/auth-context';
import { api, type StripeCharge } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Fragment, useState } from 'react';
import { Loader2, ExternalLink, RotateCcw, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StripePager } from '@/components/admin/stripe-pager';
import { fmtCurrency, fmtUnix, statusColor, statusLabel } from '@/lib/stripe-fmt';

export default function TransacoesPage() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  const [cursors, setCursors] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-stripe', 'charges', currentCursor],
    queryFn: () => api.adminStripe.listCharges(accessToken!, { limit: 25, starting_after: currentCursor }),
    enabled: !!accessToken,
  });

  const [pendingRefund, setPendingRefund] = useState<StripeCharge | null>(null);

  const refundMut = useMutation({
    mutationFn: (chargeId: string) => api.adminStripe.refundCharge(accessToken!, chargeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-stripe', 'charges'] });
      setPendingRefund(null);
    },
  });

  const charges = data?.data ?? [];

  return (
    <div className="flex flex-col gap-3">
      <StripePager
        hasMore={!!data?.has_more}
        hasPrev={cursors.length > 0}
        onNext={() => {
          const last = charges[charges.length - 1]?.id;
          if (last) {
            setCursors((c) => [...c, currentCursor ?? '']);
            setCurrentCursor(last);
          }
        }}
        onPrev={() => {
          const prev = cursors[cursors.length - 1];
          setCursors((c) => c.slice(0, -1));
          setCurrentCursor(prev || undefined);
        }}
        onRefresh={refetch}
        loading={isFetching}
        count={charges.length}
      />

      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
        </div>
      ) : charges.length === 0 ? (
        <p className="py-10 text-center text-sm text-[#f3f0ed]/30">Nenhuma transação</p>
      ) : (
        <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2">
          <Table>
            <TableHeader>
              <TableRow className="border-[#f3f0ed]/6 hover:bg-transparent">
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Data</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Valor</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Método</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Status</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Cliente</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {charges.map((c) => {
                const pm = c.payment_method_details;
                const pmLabel = pm?.card ? `${pm.card.brand} •••• ${pm.card.last4}` : pm?.type ?? '—';
                const isFailed = c.status === 'failed' || (!c.paid && c.failure_message);
                const errorMsg = c.failure_message ?? c.outcome?.seller_message ?? c.outcome?.reason ?? null;
                return (
                  <Fragment key={c.id}>
                    <TableRow className="border-[#f3f0ed]/6 hover:bg-[#f3f0ed]/3">
                      <TableCell className="text-xs text-[#f3f0ed]/50">{fmtUnix(c.created)}</TableCell>
                      <TableCell className="text-sm font-medium tabular-nums text-[#f3f0ed]">
                        {fmtCurrency(c.amount, c.currency)}
                        {c.amount_refunded > 0 && (
                          <span className="ml-2 text-xs text-red-400">
                            -{fmtCurrency(c.amount_refunded, c.currency)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-[#f3f0ed]/50">{pmLabel}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColor(c.refunded ? 'refunded' : c.status)}>
                          {statusLabel(c.refunded ? 'refunded' : c.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-[#f3f0ed]/50">{typeof c.customer === 'string' ? c.customer.slice(0, 16) : '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {c.receipt_url && (
                            <a
                              href={c.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#f3f0ed]/40 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70"
                              title="Recibo"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {c.paid && !c.refunded && c.amount_refunded < c.amount && (
                            <button
                              onClick={() => setPendingRefund(c)}
                              disabled={refundMut.isPending}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-amber-400/70 hover:bg-amber-500/10 hover:text-amber-400 disabled:opacity-40"
                              title="Reembolsar"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {isFailed && errorMsg && (
                      <TableRow className="border-[#f3f0ed]/6 bg-red-500/[0.03] hover:bg-red-500/5">
                        <TableCell colSpan={6} className="py-2">
                          <div className="flex items-start gap-2 text-xs">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400/70" />
                            <div className="min-w-0 flex-1">
                              <span className="text-red-400/90">{errorMsg}</span>
                              {c.failure_code && (
                                <span className="ml-2 font-mono text-[10px] text-red-400/50">
                                  [{c.failure_code}]
                                </span>
                              )}
                              {c.outcome?.risk_level && c.outcome.risk_level !== 'normal' && (
                                <span className="ml-2 rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] uppercase text-red-400/70">
                                  risco: {c.outcome.risk_level}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {pendingRefund && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !refundMut.isPending && setPendingRefund(null)}
        >
          <div
            className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-amber-500/20 bg-[#1a2123] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#f3f0ed]">Confirmar reembolso</h3>
                <p className="text-xs text-[#f3f0ed]/40">Esta ação é irreversível</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/[0.02] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#f3f0ed]/40">Valor</span>
                <span className="text-base font-bold tabular-nums text-amber-400">
                  {fmtCurrency(pendingRefund.amount, pendingRefund.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#f3f0ed]/40">Charge</span>
                <span className="font-mono text-[10px] text-[#f3f0ed]/50">{pendingRefund.id}</span>
              </div>
              {typeof pendingRefund.customer === 'string' && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#f3f0ed]/40">Cliente</span>
                  <span className="font-mono text-[10px] text-[#f3f0ed]/50">{pendingRefund.customer}</span>
                </div>
              )}
            </div>
            <p className="text-sm text-[#f3f0ed]/60">
              Tem certeza que deseja reembolsar este pagamento? O valor será devolvido ao cliente via Stripe.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingRefund(null)}
                disabled={refundMut.isPending}
                className="flex h-9 items-center rounded-xl border border-[#f3f0ed]/10 px-4 text-xs font-bold text-[#f3f0ed]/60 transition-colors hover:bg-[#f3f0ed]/5 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => refundMut.mutate(pendingRefund.id)}
                disabled={refundMut.isPending}
                className="flex h-9 items-center gap-1.5 rounded-xl bg-amber-500 px-4 text-xs font-bold text-[#1a2123] transition-all hover:bg-amber-400 active:scale-[0.97] disabled:opacity-50"
              >
                {refundMut.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                Confirmar reembolso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
