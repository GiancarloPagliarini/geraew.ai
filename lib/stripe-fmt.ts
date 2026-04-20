export function fmtCurrency(amountCents: number, currency: string = 'brl'): string {
  const amount = amountCents / 100;
  const cur = currency.toUpperCase();
  try {
    return amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
    });
  } catch {
    return `${cur} ${amount.toFixed(2)}`;
  }
}

export function fmtUnix(ts: number | null | undefined, withTime = true): string {
  if (!ts) return '—';
  const d = new Date(ts * 1000);
  if (withTime) {
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return d.toLocaleDateString('pt-BR');
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'border-green-500/30 bg-green-500/10 text-green-400',
    trialing: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    past_due: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    unpaid: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    canceled: 'border-red-500/30 bg-red-500/10 text-red-400',
    paused: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400',
    incomplete: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400',
    incomplete_expired: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400',
    succeeded: 'border-green-500/30 bg-green-500/10 text-green-400',
    paid: 'border-green-500/30 bg-green-500/10 text-green-400',
    failed: 'border-red-500/30 bg-red-500/10 text-red-400',
    refunded: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400',
    open: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    draft: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400',
    void: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400',
    uncollectible: 'border-red-500/30 bg-red-500/10 text-red-400',
  };
  return map[status] ?? 'border-[#f3f0ed]/10 bg-[#f3f0ed]/5 text-[#f3f0ed]/40';
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    active: 'Ativa',
    trialing: 'Trial',
    past_due: 'Em atraso',
    unpaid: 'Não paga',
    canceled: 'Cancelada',
    paused: 'Pausada',
    incomplete: 'Incompleta',
    incomplete_expired: 'Expirada',
    succeeded: 'Aprovado',
    paid: 'Pago',
    failed: 'Falhou',
    refunded: 'Reembolsado',
    open: 'Aberta',
    draft: 'Rascunho',
    void: 'Anulada',
    uncollectible: 'Incobrável',
  };
  return map[status] ?? status;
}
