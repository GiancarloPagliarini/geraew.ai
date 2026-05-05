'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Aguardando',
  PROCESSING: 'Enviando',
  COMPLETED: 'Concluído',
  PARTIAL_FAILURE: 'Parcial',
  FAILED: 'Falhou',
  SENT: 'Enviado',
  DELIVERED: 'Entregue',
  OPENED: 'Aberto',
  CLICKED: 'Clicado',
  BOUNCED: 'Bounce',
  COMPLAINED: 'Reclamou',
};

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    PENDING: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
    PROCESSING: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    COMPLETED: 'border-green-500/30 bg-green-500/10 text-green-400',
    PARTIAL_FAILURE: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
    FAILED: 'border-red-500/30 bg-red-500/10 text-red-400',
    SENT: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    DELIVERED: 'border-green-500/30 bg-green-500/10 text-green-400',
    OPENED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    CLICKED: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
    BOUNCED: 'border-red-500/30 bg-red-500/10 text-red-400',
    COMPLAINED: 'border-pink-500/30 bg-pink-500/10 text-pink-400',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        config[status] ?? config.PENDING
      }`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export default function AdminEmailDetailPage() {
  const params = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const id = params.id;

  const query = useQuery({
    queryKey: ['admin', 'emails', 'detail', id],
    queryFn: () => api.adminEmails.detail(accessToken!, id),
    enabled: !!accessToken && !!id,
    refetchInterval: (q) => {
      const data = q.state.data;
      if (!data) return 3_000;
      return data.status === 'PROCESSING' || data.status === 'PENDING' ? 3_000 : false;
    },
  });

  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
      </div>
    );
  }

  if (query.error || !query.data) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-400">
        Não foi possível carregar este broadcast.
      </div>
    );
  }

  const b = query.data;
  const progress = b.totalRecipients
    ? ((b.sentCount + b.failedCount) / b.totalRecipients) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/emails"
          className="rounded-lg p-2 text-[#f3f0ed]/60 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]"
          title="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold text-[#f3f0ed]">{b.subject}</h1>
          <p className="text-sm text-[#f3f0ed]/50">
            Enviado por {b.triggeredBy.name} ·{' '}
            {new Date(b.createdAt).toLocaleString('pt-BR')}
          </p>
        </div>
        <StatusBadge status={b.status} />
      </div>

      {/* ─── Stats ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Destinatários" value={b.totalRecipients} icon={Clock} accent="text-[#f3f0ed]" />
        <StatCard label="Enviados" value={b.sentCount} icon={CheckCircle2} accent="text-green-400" />
        <StatCard label="Falhas" value={b.failedCount} icon={XCircle} accent="text-red-400" />
        <StatCard
          label="Progresso"
          value={`${progress.toFixed(0)}%`}
          icon={AlertCircle}
          accent="text-[#a2dd00]"
        />
      </div>

      {/* ─── Erro do broadcast (se houver) ─────────── */}
      {b.errorMessage && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
          <h3 className="mb-2 text-sm font-semibold text-red-400">Erro do broadcast</h3>
          <pre className="whitespace-pre-wrap text-xs text-red-300/80">
            {b.errorMessage}
          </pre>
        </div>
      )}

      {/* ─── Preview do email ──────────────────────── */}
      <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#141a1c] p-5">
        <h3 className="mb-3 text-sm font-semibold text-[#f3f0ed]">Email enviado</h3>
        <div className="overflow-hidden rounded-lg border border-[#f3f0ed]/6 bg-white">
          <iframe
            srcDoc={b.bodyHtml}
            title="Email enviado"
            className="h-[600px] w-full border-0"
            sandbox=""
          />
        </div>
      </div>

      {/* ─── Lista de destinatários ────────────────── */}
      <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#141a1c]">
        <div className="border-b border-[#f3f0ed]/6 px-5 py-3">
          <h3 className="text-sm font-semibold text-[#f3f0ed]">
            Destinatários (mostrando até 200)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#f3f0ed]/6 text-left text-[11px] uppercase tracking-wider text-[#f3f0ed]/40">
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Erro</th>
              </tr>
            </thead>
            <tbody>
              {b.recipients.map((r) => (
                <tr key={r.id} className="border-b border-[#f3f0ed]/4 text-sm text-[#f3f0ed]/80">
                  <td className="px-5 py-2 font-mono text-xs">{r.email}</td>
                  <td className="px-5 py-2">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-5 py-2 text-xs text-red-400/80">
                    {r.errorMessage ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#141a1c] p-4">
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-[#f3f0ed]/40">
        <Icon className={`h-3.5 w-3.5 ${accent}`} />
        {label}
      </div>
      <div className={`text-2xl font-bold ${accent}`}>
        {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
      </div>
    </div>
  );
}
