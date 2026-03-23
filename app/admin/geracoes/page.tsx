'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Image,
  CheckCircle2,
  Clock,
  XCircle,
  Cog,
  UserCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRouter } from 'next/navigation';

function genTypeLabel(type: string) {
  const map: Record<string, string> = {
    TEXT_TO_IMAGE: 'Texto → Imagem',
    IMAGE_TO_IMAGE: 'Imagem → Imagem',
    TEXT_TO_VIDEO: 'Texto → Vídeo',
    IMAGE_TO_VIDEO: 'Imagem → Vídeo',
    MOTION_CONTROL: 'Copiar movimentos',
    REFERENCE_VIDEO: 'Referência',
    text_to_image: 'Texto → Imagem',
    image_to_image: 'Imagem → Imagem',
    text_to_video: 'Texto → Vídeo',
    image_to_video: 'Imagem → Vídeo',
    motion_control: 'Copiar movimentos',
  };
  return map[type] ?? type;
}

function statusBadge(status: string) {
  const upper = status.toUpperCase();
  const config: Record<string, { color: string; icon: React.ElementType; label: string }> = {
    COMPLETED: { color: 'border-green-500/30 bg-green-500/10 text-green-400', icon: CheckCircle2, label: 'Concluída' },
    PROCESSING: { color: 'border-blue-500/30 bg-blue-500/10 text-blue-400', icon: Cog, label: 'Processando' },
    PENDING: { color: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400', icon: Clock, label: 'Pendente' },
    FAILED: { color: 'border-red-500/30 bg-red-500/10 text-red-400', icon: XCircle, label: 'Falha' },
  };
  const c = config[upper] ?? config.PENDING;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${c.color}`}>
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  );
}

function formatDuration(ms: number | null) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function AdminGenerationsPage() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'generations', page],
    queryFn: () => api.admin.generations(accessToken!, page, limit),
    enabled: !!accessToken,
    refetchInterval: 15_000,
  });

  const generations = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#f3f0ed]">Gerações</h1>
        <p className="mt-1 text-sm text-[#f3f0ed]/40">
          Monitoramento em tempo real · {total.toLocaleString('pt-BR')} gerações
        </p>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
        </div>
      ) : (
        <div className="rounded-2xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02]">
          <Table>
            <TableHeader>
              <TableRow className="border-[#f3f0ed]/6 hover:bg-transparent">
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Usuário</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Tipo</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Status</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Prompt</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Resolução</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Créditos</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Tempo</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {generations.map((gen) => (
                <TableRow key={gen.id} className="border-[#f3f0ed]/4">
                  <TableCell>
                    <button
                      onClick={() => router.push(`/admin/usuarios/${gen.user.id}`)}
                      className="flex items-center gap-2 text-left transition-colors hover:text-[#a2dd00]"
                    >
                      <UserCircle className="h-4 w-4 text-[#f3f0ed]/30" />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-[#f3f0ed]/70">{gen.user.name || '—'}</span>
                        <span className="text-[10px] text-[#f3f0ed]/30">{gen.user.email}</span>
                      </div>
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Image className="h-3.5 w-3.5 text-[#f3f0ed]/30" />
                      <span className="text-xs text-[#f3f0ed]/60">{genTypeLabel(gen.type)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{statusBadge(gen.status)}</TableCell>
                  <TableCell>
                    <span className="line-clamp-1 max-w-[180px] text-xs text-[#f3f0ed]/50">
                      {gen.prompt || '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs tabular-nums text-[#f3f0ed]/40">
                      {gen.resolution || '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs tabular-nums text-[#a2dd00]">{gen.creditsConsumed}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs tabular-nums text-[#f3f0ed]/40">
                      {formatDuration(gen.processingTimeMs)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="whitespace-nowrap text-xs tabular-nums text-[#f3f0ed]/40">
                      {new Date(gen.createdAt).toLocaleDateString('pt-BR')}{' '}
                      {new Date(gen.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {generations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-sm text-[#f3f0ed]/30">
                    Nenhuma geração encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#f3f0ed]/30">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f3f0ed]/8 text-[#f3f0ed]/50 transition-colors hover:bg-[#f3f0ed]/5 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f3f0ed]/8 text-[#f3f0ed]/50 transition-colors hover:bg-[#f3f0ed]/5 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
