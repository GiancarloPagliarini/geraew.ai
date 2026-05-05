'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Loader2, Plus, Mail, CheckCircle2, AlertCircle, Clock, XCircle } from 'lucide-react';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Aguardando',
  PROCESSING: 'Enviando',
  COMPLETED: 'Concluído',
  PARTIAL_FAILURE: 'Parcial',
  FAILED: 'Falhou',
};

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ElementType }> = {
    PENDING: { color: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400', icon: Clock },
    PROCESSING: { color: 'border-blue-500/30 bg-blue-500/10 text-blue-400', icon: Loader2 },
    COMPLETED: { color: 'border-green-500/30 bg-green-500/10 text-green-400', icon: CheckCircle2 },
    PARTIAL_FAILURE: { color: 'border-orange-500/30 bg-orange-500/10 text-orange-400', icon: AlertCircle },
    FAILED: { color: 'border-red-500/30 bg-red-500/10 text-red-400', icon: XCircle },
  };
  const c = config[status] ?? config.PENDING;
  const Icon = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${c.color}`}
    >
      <Icon className={`h-3 w-3 ${status === 'PROCESSING' ? 'animate-spin' : ''}`} />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

const RECIPIENT_TYPE_LABEL: Record<string, string> = {
  ALL: 'Todos',
  ALL_PAID: 'Pagantes',
  BY_PLAN: 'Por plano',
  CUSTOM_LIST: 'Lista',
  SINGLE: 'Único',
};

export default function AdminEmailsListPage() {
  const { accessToken } = useAuth();

  const query = useQuery({
    queryKey: ['admin', 'emails', 'list'],
    queryFn: () => api.adminEmails.list(accessToken!, 1, 50),
    enabled: !!accessToken,
    refetchInterval: 5_000, // polling pra acompanhar broadcast em PROCESSING
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-[#a2dd00]" />
            <h1 className="text-xl font-semibold text-[#f3f0ed]">Emails</h1>
          </div>
          <p className="mt-1 text-sm text-[#f3f0ed]/50">
            Disparos de email pra usuários e histórico de envios.
          </p>
        </div>
        <Link
          href="/admin/emails/novo"
          className="inline-flex items-center gap-2 rounded-lg bg-[#a2dd00] px-4 py-2 text-sm font-semibold text-[#111618] transition-colors hover:bg-[#a2dd00]/90"
        >
          <Plus className="h-4 w-4" />
          Novo email
        </Link>
      </div>

      <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#141a1c]">
        {query.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
          </div>
        ) : query.error ? (
          <div className="px-6 py-12 text-center text-sm text-red-400">
            Erro ao carregar histórico.
          </div>
        ) : !query.data?.items.length ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-[#f3f0ed]/50">
              Nenhum email enviado ainda. Clique em &ldquo;Novo email&rdquo; pra começar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#f3f0ed]/6 text-left text-[11px] uppercase tracking-wider text-[#f3f0ed]/40">
                  <th className="px-5 py-3 font-medium">Assunto</th>
                  <th className="px-5 py-3 font-medium">Destinatários</th>
                  <th className="px-5 py-3 font-medium">Enviados</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Por</th>
                  <th className="px-5 py-3 font-medium">Quando</th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-[#f3f0ed]/4 text-sm text-[#f3f0ed]/80 transition-colors hover:bg-[#f3f0ed]/2"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/admin/emails/${b.id}`}
                        className="block max-w-md truncate font-medium hover:text-[#a2dd00]"
                      >
                        {b.subject}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#f3f0ed]">{b.totalRecipients.toLocaleString('pt-BR')}</span>
                        <span className="text-xs text-[#f3f0ed]/40">
                          {RECIPIENT_TYPE_LABEL[b.recipientType] ?? b.recipientType}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-green-400">{b.sentCount}</span>
                      {b.failedCount > 0 && (
                        <>
                          <span className="text-[#f3f0ed]/30"> / </span>
                          <span className="text-red-400">{b.failedCount} falhas</span>
                        </>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-5 py-3 text-xs text-[#f3f0ed]/60">
                      {b.triggeredBy.name}
                    </td>
                    <td className="px-5 py-3 text-xs text-[#f3f0ed]/60">
                      {new Date(b.createdAt).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
