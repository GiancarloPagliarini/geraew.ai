'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fmtCurrency, fmtUnix, statusColor, statusLabel } from '@/lib/stripe-fmt';

export default function ClienteDetailPage() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-stripe', 'customer', params.id],
    queryFn: () => api.adminStripe.getCustomer(accessToken!, params.id),
    enabled: !!accessToken && !!params.id,
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
      </div>
    );
  }

  const { customer, subscriptions, charges, invoices, paymentMethods } = data;

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => router.back()}
        className="flex w-fit items-center gap-1.5 text-[13px] text-[#f3f0ed]/50 hover:text-[#f3f0ed]/80"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> voltar
      </button>

      <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2 p-5">
        <h2 className="text-lg font-bold text-[#f3f0ed]">{customer.name ?? customer.email ?? customer.id}</h2>
        <p className="text-sm text-[#f3f0ed]/60">{customer.email}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
          <div>
            <p className="text-[#f3f0ed]/40">ID</p>
            <p className="font-mono text-[#f3f0ed]/70">{customer.id}</p>
          </div>
          <div>
            <p className="text-[#f3f0ed]/40">Criado</p>
            <p className="text-[#f3f0ed]/70">{fmtUnix(customer.created, false)}</p>
          </div>
          <div>
            <p className="text-[#f3f0ed]/40">Saldo</p>
            <p className="text-[#f3f0ed]/70">{fmtCurrency(customer.balance, customer.currency ?? 'brl')}</p>
          </div>
          <div>
            <p className="text-[#f3f0ed]/40">Status</p>
            <p className="text-[#f3f0ed]/70">{customer.delinquent ? 'Inadimplente' : 'OK'}</p>
          </div>
        </div>
      </div>

      <Section title={`Assinaturas (${subscriptions.length})`}>
        {subscriptions.length === 0 ? (
          <Empty />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[#f3f0ed]/6 hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Plano</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Status</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Criada</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Cancela ao fim?</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((s) => {
                const item = s.items.data[0];
                const price = item?.price;
                const product = price && typeof price.product !== 'string' ? price.product : null;
                return (
                  <TableRow key={s.id} className="border-[#f3f0ed]/6">
                    <TableCell className="text-sm text-[#f3f0ed]">
                      {product?.name ?? price?.nickname ?? s.id}
                      {price?.unit_amount != null && (
                        <span className="ml-2 text-xs text-[#f3f0ed]/50">
                          {fmtCurrency(price.unit_amount, price.currency)}/{price.recurring?.interval ?? '—'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColor(s.status)}>
                        {statusLabel(s.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-[#f3f0ed]/50">{fmtUnix(s.created, false)}</TableCell>
                    <TableCell className="text-xs text-[#f3f0ed]/50">{s.cancel_at_period_end ? 'Sim' : 'Não'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section title={`Pagamentos (${charges.length})`}>
        {charges.length === 0 ? (
          <Empty />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[#f3f0ed]/6 hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Data</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Valor</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Status</TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Recibo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {charges.map((c) => (
                <TableRow key={c.id} className="border-[#f3f0ed]/6">
                  <TableCell className="text-xs text-[#f3f0ed]/50">{fmtUnix(c.created)}</TableCell>
                  <TableCell className="text-sm tabular-nums text-[#f3f0ed]">{fmtCurrency(c.amount, c.currency)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColor(c.refunded ? 'refunded' : c.status)}>
                      {statusLabel(c.refunded ? 'refunded' : c.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {c.receipt_url && (
                      <a
                        href={c.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-[#f3f0ed]/40 hover:text-[#f3f0ed]/70"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section title={`Faturas (${invoices.length})`}>
        {invoices.length === 0 ? (
          <Empty />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[#f3f0ed]/6 hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Número</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Valor</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Status</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Data</TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id} className="border-[#f3f0ed]/6">
                  <TableCell className="text-xs font-mono text-[#f3f0ed]/60">{inv.number ?? inv.id}</TableCell>
                  <TableCell className="text-sm tabular-nums text-[#f3f0ed]">{fmtCurrency(inv.amount_paid, inv.currency)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColor(inv.status)}>
                      {statusLabel(inv.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-[#f3f0ed]/50">{fmtUnix(inv.created, false)}</TableCell>
                  <TableCell className="text-right">
                    {inv.invoice_pdf && (
                      <a
                        href={inv.invoice_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-[#f3f0ed]/40 hover:text-[#f3f0ed]/70"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      <Section title={`Métodos de Pagamento (${paymentMethods.length})`}>
        {paymentMethods.length === 0 ? (
          <Empty />
        ) : (
          <ul className="flex flex-col gap-2">
            {paymentMethods.map((pm) => (
              <li key={pm.id} className="flex items-center justify-between rounded-lg border border-[#f3f0ed]/6 bg-[#f3f0ed]/2 px-3 py-2 text-sm">
                <span className="text-[#f3f0ed]">
                  {pm.card ? `${pm.card.brand.toUpperCase()} •••• ${pm.card.last4}` : pm.type}
                </span>
                {pm.card && (
                  <span className="text-xs text-[#f3f0ed]/40">
                    exp {String(pm.card.exp_month).padStart(2, '0')}/{pm.card.exp_year}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/40">{title}</h3>
      <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2">{children}</div>
    </section>
  );
}

function Empty() {
  return <p className="px-4 py-6 text-center text-xs text-[#f3f0ed]/30">Nenhum registro</p>;
}
