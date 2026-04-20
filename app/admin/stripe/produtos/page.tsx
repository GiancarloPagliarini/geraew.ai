'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Loader2, Plus, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StripePager } from '@/components/admin/stripe-pager';
import { fmtUnix } from '@/lib/stripe-fmt';

export default function ProdutosPage() {
  const { accessToken } = useAuth();
  const qc = useQueryClient();
  const [cursors, setCursors] = useState<string[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-stripe', 'products', currentCursor],
    queryFn: () => api.adminStripe.listProducts(accessToken!, { limit: 25, starting_after: currentCursor }),
    enabled: !!accessToken,
  });

  const products = data?.data ?? [];

  const createMut = useMutation({
    mutationFn: () => api.adminStripe.createProduct(accessToken!, { name: form.name, description: form.description || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-stripe', 'products'] });
      setShowForm(false);
      setForm({ name: '', description: '' });
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api.adminStripe.updateProduct(accessToken!, id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-stripe', 'products'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.adminStripe.deleteProduct(accessToken!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-stripe', 'products'] }),
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 rounded-xl bg-[#a2dd00]/10 px-3 py-2 text-[12px] font-semibold text-[#a2dd00] hover:bg-[#a2dd00]/15"
        >
          <Plus className="h-3.5 w-3.5" /> Novo produto
        </button>
      </div>

      {showForm && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2 p-4">
          <Input
            placeholder="Nome do produto"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="h-10 border-[#f3f0ed]/8 bg-[#f3f0ed]/3 text-sm text-[#f3f0ed]"
          />
          <Input
            placeholder="Descrição (opcional)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="h-10 border-[#f3f0ed]/8 bg-[#f3f0ed]/3 text-sm text-[#f3f0ed]"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg px-3 py-1.5 text-[12px] text-[#f3f0ed]/50 hover:text-[#f3f0ed]"
            >
              Cancelar
            </button>
            <button
              onClick={() => createMut.mutate()}
              disabled={!form.name || createMut.isPending}
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
          const last = products[products.length - 1]?.id;
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
        count={products.length}
      />

      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
        </div>
      ) : products.length === 0 ? (
        <p className="py-10 text-center text-sm text-[#f3f0ed]/30">Nenhum produto</p>
      ) : (
        <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2">
          <Table>
            <TableHeader>
              <TableRow className="border-[#f3f0ed]/6 hover:bg-transparent">
                <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Nome</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">ID</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Status</TableHead>
                <TableHead className="text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Criado</TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-[0.12em] text-[#f3f0ed]/30">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id} className="border-[#f3f0ed]/6 hover:bg-[#f3f0ed]/3">
                  <TableCell className="text-sm text-[#f3f0ed]">
                    {p.name}
                    {p.description && <span className="ml-2 text-xs text-[#f3f0ed]/40">{p.description}</span>}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-[#f3f0ed]/50">{p.id}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={p.active ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-[#f3f0ed]/10 text-[#f3f0ed]/40'}
                    >
                      {p.active ? 'Ativo' : 'Arquivado'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-[#f3f0ed]/50">{fmtUnix(p.created, false)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => toggleMut.mutate({ id: p.id, active: !p.active })}
                        disabled={toggleMut.isPending}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#f3f0ed]/40 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 disabled:opacity-40"
                        title={p.active ? 'Arquivar' : 'Reativar'}
                      >
                        {p.active ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Deletar produto "${p.name}"? (se tiver prices, será arquivado)`)) {
                            deleteMut.mutate(p.id);
                          }
                        }}
                        disabled={deleteMut.isPending}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400/70 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                        title="Deletar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
