'use client';

import { useAuth } from '@/lib/auth-context';
import { api, type StripeSubscription } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Loader2, XCircle, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StripePager } from '@/components/admin/stripe-pager';
import { fmtCurrency, fmtUnix, statusColor, statusLabel } from '@/lib/stripe-fmt';

const STATUS_OPTS = [
  { value: 'all', label: 'Todas' },
  { value: 'active', label: 'Ativas' },
  { value: 'trialing', label: 'Trial' },
  { value: 'past_due', label: 'Em atraso' },
  { value: 'canceled', label: 'Canceladas' },
  { value: 'paused', label: 'Pausadas' },
  { value: 'unpaid', label: 'Não pagas' },
  { value: 'incomplete', label: 'Incompletas' },
];

export default function AssinaturasPage() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  const [status, setStatus] = useState('all');
  const [cursors, setCursors] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-stripe', 'subscriptions', status, currentCursor],
    queryFn: () => api.adminStripe.listSubscriptions(accessToken!, { limit: 25, status, starting_after: currentCursor }),
    enabled: !!accessToken,
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => api.adminStripe.cancelSubscription(accessToken!, id, true),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-stripe', 'subscriptions'] }),
  });
  const reactivateMut = useMutation({
    mutationFn: (id: string) => api.adminStripe.reactivateSubscription(accessToken!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-stripe', 'subscriptions'] }),
  });

  const subs = data?.data ?? [];

  const handleCancel = (s: StripeSubscription) => {
    if (!confirm('Cancelar essa assinatura ao fim do período?')) return;
    cancelMut.mutate(s.id);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1">
        {STATUS_OPTS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setStatus(opt.value);
              setCursors([]);
              setCurrentCursor(undefined);
            }}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
              status === opt.value
                ? 'bg-[#a2dd00]/10 text-[#a2dd00]'
                : 'text-[#f3f0ed]/50 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/80'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <StripePager
        hasMore={!!data?.has_more}
        hasPrev={cursors.length > 0}
        onNext={() => {
          const last = subs[subs.length - 1]?.id;
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
        count={subs.length}
      />

      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
        </div>
      ) : subs.length === 0 ? (
        <p className="py-10 text-center text-sm text-[#f3f0ed]/30">Nenhuma assinatura</p>
      ) : (
        <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2">
          <Table>
            <TableHeader>
              <TableRow className="border-[#f3f0ed]/6 hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Plano</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Cliente</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Status</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Criada</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Cancela ao fim?</TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subs.map((s) => {
                const item = s.items.data[0];
                const price = item?.price;
                const product = price && typeof price.product !== 'string' ? price.product : null;
                const customer = typeof s.customer === 'string' ? s.customer : s.customer.email ?? s.customer.id;
                return (
                  <TableRow key={s.id} className="border-[#f3f0ed]/6 hover:bg-[#f3f0ed]/3">
                    <TableCell className="text-sm text-[#f3f0ed]">
                      {product?.name ?? price?.nickname ?? s.id}
                      {price?.unit_amount != null && (
                        <span className="ml-2 text-xs text-[#f3f0ed]/50">
                          {fmtCurrency(price.unit_amount, price.currency)}/{price.recurring?.interval ?? '—'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-[#f3f0ed]/60">{customer}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColor(s.status)}>
                        {statusLabel(s.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-[#f3f0ed]/50">{fmtUnix(s.created, false)}</TableCell>
                    <TableCell className="text-xs text-[#f3f0ed]/50">{s.cancel_at_period_end ? 'Sim' : 'Não'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {s.status === 'active' && !s.cancel_at_period_end && (
                          <button
                            onClick={() => handleCancel(s)}
                            disabled={cancelMut.isPending}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400/70 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                            title="Cancelar ao fim"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {s.cancel_at_period_end && (
                          <button
                            onClick={() => reactivateMut.mutate(s.id)}
                            disabled={reactivateMut.isPending}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#a2dd00]/80 hover:bg-[#a2dd00]/10 hover:text-[#a2dd00] disabled:opacity-40"
                            title="Reativar"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
