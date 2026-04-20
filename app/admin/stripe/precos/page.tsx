'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Loader2, Plus, Archive, ArchiveRestore } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StripePager } from '@/components/admin/stripe-pager';
import { fmtCurrency, fmtUnix } from '@/lib/stripe-fmt';

export default function PrecosPage() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  const [cursors, setCursors] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    product: '',
    amount: '',
    currency: 'brl',
    nickname: '',
    mode: 'one_time' as 'one_time' | 'recurring',
    interval: 'month' as 'day' | 'week' | 'month' | 'year',
  });

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-stripe', 'prices', currentCursor],
    queryFn: () => api.adminStripe.listPrices(accessToken!, { limit: 25, starting_after: currentCursor }),
    enabled: !!accessToken,
  });

  const prices = data?.data ?? [];

  const createMut = useMutation({
    mutationFn: () => {
      const cents = Math.round(parseFloat(form.amount.replace(',', '.')) * 100);
      return api.adminStripe.createPrice(accessToken!, {
        product: form.product,
        unitAmount: cents,
        currency: form.currency,
        nickname: form.nickname || undefined,
        ...(form.mode === 'recurring' ? { recurring: { interval: form.interval } } : {}),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-stripe', 'prices'] });
      setShowForm(false);
      setForm({ product: '', amount: '', currency: 'brl', nickname: '', mode: 'one_time', interval: 'month' });
    },
  });

  const archiveMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? api.adminStripe.archivePrice(accessToken!, id) : api.adminStripe.activatePrice(accessToken!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-stripe', 'prices'] }),
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 rounded-xl bg-[#a2dd00]/10 px-3 py-2 text-[12px] font-semibold text-[#a2dd00] hover:bg-[#a2dd00]/15"
        >
          <Plus className="h-3.5 w-3.5" /> Novo preço
        </button>
      </div>

      {showForm && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2 p-4">
          <Input
            placeholder="Product ID (prod_...)"
            value={form.product}
            onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))}
            className="h-10 border-[#f3f0ed]/8 bg-[#f3f0ed]/3 text-sm text-[#f3f0ed]"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Valor (ex: 39.90)"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="h-10 border-[#f3f0ed]/8 bg-[#f3f0ed]/3 text-sm text-[#f3f0ed]"
            />
            <Input
              placeholder="Moeda (brl)"
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              className="h-10 border-[#f3f0ed]/8 bg-[#f3f0ed]/3 text-sm text-[#f3f0ed]"
            />
          </div>
          <Input
            placeholder="Nickname (opcional)"
            value={form.nickname}
            onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
            className="h-10 border-[#f3f0ed]/8 bg-[#f3f0ed]/3 text-sm text-[#f3f0ed]"
          />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-[12px] text-[#f3f0ed]/70">
              <input
                type="radio"
                checked={form.mode === 'one_time'}
                onChange={() => setForm((f) => ({ ...f, mode: 'one_time' }))}
              />
              Avulso
            </label>
            <label className="flex items-center gap-1.5 text-[12px] text-[#f3f0ed]/70">
              <input
                type="radio"
                checked={form.mode === 'recurring'}
                onChange={() => setForm((f) => ({ ...f, mode: 'recurring' }))}
              />
              Recorrente
            </label>
            {form.mode === 'recurring' && (
              <select
                value={form.interval}
                onChange={(e) => setForm((f) => ({ ...f, interval: e.target.value as typeof form.interval }))}
                className="h-8 rounded-lg border border-[#f3f0ed]/8 bg-[#f3f0ed]/3 px-2 text-[12px] text-[#f3f0ed]"
              >
                <option value="day">por dia</option>
                <option value="week">por semana</option>
                <option value="month">por mês</option>
                <option value="year">por ano</option>
              </select>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="rounded-lg px-3 py-1.5 text-[12px] text-[#f3f0ed]/50 hover:text-[#f3f0ed]">
              Cancelar
            </button>
            <button
              onClick={() => createMut.mutate()}
              disabled={!form.product || !form.amount || createMut.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-[#a2dd00] px-3 py-1.5 text-[12px] font-semibold text-black hover:bg-[#bdff00] disabled:opacity-40"
            >
              {createMut.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              Criar
            </button>
          </div>
        </div>
      )}

      <StripePager
        hasMore={!!data?.has_more}
        hasPrev={cursors.length > 0}
        onNext={() => {
          const last = prices[prices.length - 1]?.id;
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
        count={prices.length}
      />

      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
        </div>
      ) : prices.length === 0 ? (
        <p className="py-10 text-center text-sm text-[#f3f0ed]/30">Nenhum preço</p>
      ) : (
        <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2">
          <Table>
            <TableHeader>
              <TableRow className="border-[#f3f0ed]/6 hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Produto</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Valor</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Tipo</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Status</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">ID</TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prices.map((p) => {
                const product = typeof p.product === 'string' ? { name: p.product, id: p.product } : p.product;
                return (
                  <TableRow key={p.id} className="border-[#f3f0ed]/6 hover:bg-[#f3f0ed]/3">
                    <TableCell className="text-sm text-[#f3f0ed]">
                      {product.name}
                      {p.nickname && <span className="ml-2 text-xs text-[#f3f0ed]/40">· {p.nickname}</span>}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-[#f3f0ed]">
                      {p.unit_amount != null ? fmtCurrency(p.unit_amount, p.currency) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-[#f3f0ed]/50">
                      {p.type === 'recurring' ? `${p.recurring?.interval}ly` : 'one-time'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={p.active ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-[#f3f0ed]/10 text-[#f3f0ed]/40'}
                      >
                        {p.active ? 'Ativo' : 'Arquivado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-[#f3f0ed]/40">{p.id}</TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => archiveMut.mutate({ id: p.id, active: p.active })}
                        disabled={archiveMut.isPending}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#f3f0ed]/40 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 disabled:opacity-40"
                        title={p.active ? 'Arquivar' : 'Reativar'}
                      >
                        {p.active ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
                      </button>
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
