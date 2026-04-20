'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StripePager } from '@/components/admin/stripe-pager';
import { fmtUnix } from '@/lib/stripe-fmt';

export default function ClientesPage() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [debounced, setDebounced] = useState('');
  const [cursors, setCursors] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(email.trim()), 300);
    return () => clearTimeout(t);
  }, [email]);

  useEffect(() => {
    setCursors([]);
    setCurrentCursor(undefined);
  }, [debounced]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-stripe', 'customers', currentCursor, debounced],
    queryFn: () =>
      api.adminStripe.listCustomers(accessToken!, {
        limit: 25,
        starting_after: currentCursor,
        ...(debounced && debounced.includes(':') ? { search: debounced } : debounced ? { email: debounced } : {}),
      }),
    enabled: !!accessToken,
  });

  const customers = data?.data ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-full md:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#f3f0ed]/30" />
        <Input
          placeholder="Buscar por email... (ou 'email:a@b.com name:x' para Stripe search)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-10 w-full border-[#f3f0ed]/8 bg-[#f3f0ed]/3 pl-9 text-sm text-[#f3f0ed] placeholder:text-[#f3f0ed]/25 focus-visible:border-[#a2dd00]/30"
        />
      </div>

      <StripePager
        hasMore={!!data?.has_more}
        hasPrev={cursors.length > 0}
        onNext={() => {
          const last = customers[customers.length - 1]?.id;
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
        count={customers.length}
      />

      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
        </div>
      ) : customers.length === 0 ? (
        <p className="py-10 text-center text-sm text-[#f3f0ed]/30">Nenhum cliente</p>
      ) : (
        <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2">
          <Table>
            <TableHeader>
              <TableRow className="border-[#f3f0ed]/6 hover:bg-transparent">
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Email</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Nome</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Criado</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow
                  key={c.id}
                  onClick={() => router.push(`/admin/stripe/clientes/${c.id}`)}
                  className="cursor-pointer border-[#f3f0ed]/6 hover:bg-[#f3f0ed]/3"
                >
                  <TableCell className="text-sm text-[#f3f0ed]">{c.email ?? '—'}</TableCell>
                  <TableCell className="text-sm text-[#f3f0ed]/70">{c.name ?? '—'}</TableCell>
                  <TableCell className="text-xs text-[#f3f0ed]/50">{fmtUnix(c.created, false)}</TableCell>
                  <TableCell>
                    {c.delinquent ? (
                      <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-400">
                        Inadimplente
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-[#f3f0ed]/10 text-[#f3f0ed]/40">OK</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
