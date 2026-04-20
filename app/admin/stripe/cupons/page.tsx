'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Loader2, Plus, Trash2, Power } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StripePager } from '@/components/admin/stripe-pager';
import { fmtCurrency } from '@/lib/stripe-fmt';

export default function CuponsPage() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'coupons' | 'promo'>('coupons');
  const [cursors, setCursors] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>();
  const [showCoupon, setShowCoupon] = useState(false);
  const [showPromo, setShowPromo] = useState(false);

  const [couponForm, setCouponForm] = useState({
    id: '',
    name: '',
    percentOff: '',
    amountOff: '',
    currency: 'brl',
    duration: 'once' as 'once' | 'repeating' | 'forever',
    durationInMonths: '',
  });

  const [promoForm, setPromoForm] = useState({
    coupon: '',
    code: '',
    firstTimeTransaction: false,
    maxRedemptions: '',
  });

  const couponsQ = useQuery({
    queryKey: ['admin-stripe', 'coupons', currentCursor],
    queryFn: () => api.adminStripe.listCoupons(accessToken!, { limit: 25, starting_after: currentCursor }),
    enabled: !!accessToken && tab === 'coupons',
  });
  const promosQ = useQuery({
    queryKey: ['admin-stripe', 'promos', currentCursor],
    queryFn: () => api.adminStripe.listPromotionCodes(accessToken!, { limit: 25, starting_after: currentCursor }),
    enabled: !!accessToken && tab === 'promo',
  });

  const createCouponMut = useMutation({
    mutationFn: () =>
      api.adminStripe.createCoupon(accessToken!, {
        id: couponForm.id || undefined,
        name: couponForm.name || undefined,
        percentOff: couponForm.percentOff ? parseInt(couponForm.percentOff, 10) : undefined,
        amountOff: couponForm.amountOff ? Math.round(parseFloat(couponForm.amountOff.replace(',', '.')) * 100) : undefined,
        currency: couponForm.amountOff ? couponForm.currency : undefined,
        duration: couponForm.duration,
        durationInMonths: couponForm.duration === 'repeating' && couponForm.durationInMonths ? parseInt(couponForm.durationInMonths, 10) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-stripe', 'coupons'] });
      setShowCoupon(false);
      setCouponForm({ id: '', name: '', percentOff: '', amountOff: '', currency: 'brl', duration: 'once', durationInMonths: '' });
    },
  });

  const deleteCouponMut = useMutation({
    mutationFn: (id: string) => api.adminStripe.deleteCoupon(accessToken!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-stripe', 'coupons'] }),
  });

  const createPromoMut = useMutation({
    mutationFn: () =>
      api.adminStripe.createPromotionCode(accessToken!, {
        coupon: promoForm.coupon,
        code: promoForm.code || undefined,
        firstTimeTransaction: promoForm.firstTimeTransaction,
        maxRedemptions: promoForm.maxRedemptions ? parseInt(promoForm.maxRedemptions, 10) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-stripe', 'promos'] });
      setShowPromo(false);
      setPromoForm({ coupon: '', code: '', firstTimeTransaction: false, maxRedemptions: '' });
    },
  });

  const togglePromoMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.adminStripe.togglePromotionCode(accessToken!, id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-stripe', 'promos'] }),
  });

  const data = tab === 'coupons' ? couponsQ.data : promosQ.data;
  const loading = tab === 'coupons' ? couponsQ.isLoading : promosQ.isLoading;
  const fetching = tab === 'coupons' ? couponsQ.isFetching : promosQ.isFetching;
  const refetch = tab === 'coupons' ? couponsQ.refetch : promosQ.refetch;
  const items = data?.data ?? [];

  const onTabChange = (t: 'coupons' | 'promo') => {
    setTab(t);
    setCursors([]);
    setCurrentCursor(undefined);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <button
            onClick={() => onTabChange('coupons')}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-medium ${tab === 'coupons' ? 'bg-[#a2dd00]/10 text-[#a2dd00]' : 'text-[#f3f0ed]/50 hover:text-[#f3f0ed]/80'}`}
          >
            Cupons
          </button>
          <button
            onClick={() => onTabChange('promo')}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-medium ${tab === 'promo' ? 'bg-[#a2dd00]/10 text-[#a2dd00]' : 'text-[#f3f0ed]/50 hover:text-[#f3f0ed]/80'}`}
          >
            Promotion Codes
          </button>
        </div>
        <button
          onClick={() => (tab === 'coupons' ? setShowCoupon(true) : setShowPromo(true))}
          className="flex items-center gap-1.5 rounded-xl bg-[#a2dd00]/10 px-3 py-2 text-[12px] font-semibold text-[#a2dd00] hover:bg-[#a2dd00]/15"
        >
          <Plus className="h-3.5 w-3.5" /> Novo
        </button>
      </div>

      {showCoupon && tab === 'coupons' && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2 p-4">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="ID customizado (opcional, vira o código)" value={couponForm.id} onChange={(e) => setCouponForm((f) => ({ ...f, id: e.target.value }))} className="h-10 border-[#f3f0ed]/8 bg-[#f3f0ed]/3 text-sm text-[#f3f0ed]" />
            <Input placeholder="Nome" value={couponForm.name} onChange={(e) => setCouponForm((f) => ({ ...f, name: e.target.value }))} className="h-10 border-[#f3f0ed]/8 bg-[#f3f0ed]/3 text-sm text-[#f3f0ed]" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="% off (1-100)" value={couponForm.percentOff} onChange={(e) => setCouponForm((f) => ({ ...f, percentOff: e.target.value, amountOff: '' }))} className="h-10 border-[#f3f0ed]/8 bg-[#f3f0ed]/3 text-sm text-[#f3f0ed]" />
            <Input placeholder="Valor off (ex: 20.00)" value={couponForm.amountOff} onChange={(e) => setCouponForm((f) => ({ ...f, amountOff: e.target.value, percentOff: '' }))} className="h-10 border-[#f3f0ed]/8 bg-[#f3f0ed]/3 text-sm text-[#f3f0ed]" />
            <Input placeholder="Moeda" value={couponForm.currency} onChange={(e) => setCouponForm((f) => ({ ...f, currency: e.target.value }))} className="h-10 border-[#f3f0ed]/8 bg-[#f3f0ed]/3 text-sm text-[#f3f0ed]" disabled={!couponForm.amountOff} />
          </div>
          <div className="flex items-center gap-3">
            <select value={couponForm.duration} onChange={(e) => setCouponForm((f) => ({ ...f, duration: e.target.value as typeof couponForm.duration }))} className="h-10 rounded-lg border border-[#f3f0ed]/8 bg-[#f3f0ed]/3 px-3 text-sm text-[#f3f0ed]">
              <option value="once">Uma vez</option>
              <option value="repeating">Recorrente (N meses)</option>
              <option value="forever">Para sempre</option>
            </select>
            {couponForm.duration === 'repeating' && (
              <Input placeholder="Meses" value={couponForm.durationInMonths} onChange={(e) => setCouponForm((f) => ({ ...f, durationInMonths: e.target.value }))} className="h-10 w-24 border-[#f3f0ed]/8 bg-[#f3f0ed]/3 text-sm text-[#f3f0ed]" />
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCoupon(false)} className="rounded-lg px-3 py-1.5 text-[12px] text-[#f3f0ed]/50 hover:text-[#f3f0ed]">Cancelar</button>
            <button onClick={() => createCouponMut.mutate()} disabled={(!couponForm.percentOff && !couponForm.amountOff) || createCouponMut.isPending} className="flex items-center gap-1.5 rounded-lg bg-[#a2dd00] px-3 py-1.5 text-[12px] font-semibold text-black hover:bg-[#bdff00] disabled:opacity-40">
              {createCouponMut.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              Criar
            </button>
          </div>
        </div>
      )}

      {showPromo && tab === 'promo' && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2 p-4">
          <Input placeholder="Coupon ID (ex: GERAEW20)" value={promoForm.coupon} onChange={(e) => setPromoForm((f) => ({ ...f, coupon: e.target.value }))} className="h-10 border-[#f3f0ed]/8 bg-[#f3f0ed]/3 text-sm text-[#f3f0ed]" />
          <Input placeholder="Código customer-facing (opcional)" value={promoForm.code} onChange={(e) => setPromoForm((f) => ({ ...f, code: e.target.value }))} className="h-10 border-[#f3f0ed]/8 bg-[#f3f0ed]/3 text-sm text-[#f3f0ed]" />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-[12px] text-[#f3f0ed]/70">
              <input type="checkbox" checked={promoForm.firstTimeTransaction} onChange={(e) => setPromoForm((f) => ({ ...f, firstTimeTransaction: e.target.checked }))} />
              Só primeira compra
            </label>
            <Input placeholder="Limite de usos" value={promoForm.maxRedemptions} onChange={(e) => setPromoForm((f) => ({ ...f, maxRedemptions: e.target.value }))} className="h-10 w-32 border-[#f3f0ed]/8 bg-[#f3f0ed]/3 text-sm text-[#f3f0ed]" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowPromo(false)} className="rounded-lg px-3 py-1.5 text-[12px] text-[#f3f0ed]/50 hover:text-[#f3f0ed]">Cancelar</button>
            <button onClick={() => createPromoMut.mutate()} disabled={!promoForm.coupon || createPromoMut.isPending} className="flex items-center gap-1.5 rounded-lg bg-[#a2dd00] px-3 py-1.5 text-[12px] font-semibold text-black hover:bg-[#bdff00] disabled:opacity-40">
              {createPromoMut.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              Criar
            </button>
          </div>
        </div>
      )}

      <StripePager
        hasMore={!!data?.has_more}
        hasPrev={cursors.length > 0}
        onNext={() => {
          const last = items[items.length - 1]?.id;
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
        loading={fetching}
        count={items.length}
      />

      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-[#f3f0ed]/30">Nenhum registro</p>
      ) : (
        <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2">
          {tab === 'coupons' ? (
            <Table>
              <TableHeader>
                <TableRow className="border-[#f3f0ed]/6 hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">ID</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Nome</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Desconto</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Duração</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Usos</TableHead>
                  <TableHead className="text-right text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {couponsQ.data?.data.map((c) => (
                  <TableRow key={c.id} className="border-[#f3f0ed]/6 hover:bg-[#f3f0ed]/3">
                    <TableCell className="font-mono text-xs text-[#f3f0ed]">{c.id}</TableCell>
                    <TableCell className="text-sm text-[#f3f0ed]/70">{c.name ?? '—'}</TableCell>
                    <TableCell className="text-sm text-[#f3f0ed]">
                      {c.percent_off ? `${c.percent_off}%` : c.amount_off ? fmtCurrency(c.amount_off, c.currency ?? 'brl') : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-[#f3f0ed]/50">
                      {c.duration === 'repeating' ? `${c.duration_in_months} meses` : c.duration}
                    </TableCell>
                    <TableCell className="text-xs text-[#f3f0ed]/50">
                      {c.times_redeemed}{c.max_redemptions ? `/${c.max_redemptions}` : ''}
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Deletar cupom ${c.id}?`)) deleteCouponMut.mutate(c.id);
                        }}
                        disabled={deleteCouponMut.isPending}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400/70 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#f3f0ed]/6 hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Código</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Cupom</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Status</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Restrição</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Usos</TableHead>
                  <TableHead className="text-right text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promosQ.data?.data.map((p) => (
                  <TableRow key={p.id} className="border-[#f3f0ed]/6 hover:bg-[#f3f0ed]/3">
                    <TableCell className="font-mono text-sm text-[#f3f0ed]">{p.code}</TableCell>
                    <TableCell className="text-xs text-[#f3f0ed]/70">
                      {p.coupon.name ?? p.coupon.id} · {p.coupon.percent_off ? `${p.coupon.percent_off}%` : p.coupon.amount_off ? fmtCurrency(p.coupon.amount_off, p.coupon.currency ?? 'brl') : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={p.active ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-[#f3f0ed]/10 text-[#f3f0ed]/40'}>
                        {p.active ? 'Ativo' : 'Desativado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-[#f3f0ed]/50">
                      {p.restrictions.first_time_transaction ? '1ª compra' : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-[#f3f0ed]/50">
                      {p.times_redeemed}{p.max_redemptions ? `/${p.max_redemptions}` : ''}
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => togglePromoMut.mutate({ id: p.id, active: !p.active })}
                        disabled={togglePromoMut.isPending}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#f3f0ed]/40 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 disabled:opacity-40"
                        title={p.active ? 'Desativar' : 'Ativar'}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}
