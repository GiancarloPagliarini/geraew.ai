'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  XCircle,
  Cog,
  UserCircle,
  RefreshCw,
  Search,
  X,
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
import { FilterSelect, FilterField } from '@/components/admin/filter-controls';
import { useRouter } from 'next/navigation';

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'TEXT_TO_IMAGE', label: 'Texto → Imagem' },
  { value: 'IMAGE_TO_IMAGE', label: 'Imagem → Imagem' },
  { value: 'TEXT_TO_VIDEO', label: 'Texto → Vídeo' },
  { value: 'IMAGE_TO_VIDEO', label: 'Imagem → Vídeo' },
  { value: 'MOTION_CONTROL', label: 'Copiar movimentos' },
  { value: 'REFERENCE_VIDEO', label: 'Referência' },
  { value: 'FACE_SWAP', label: 'Face Swap' },
  { value: 'VIRTUAL_TRY_ON', label: 'Try On' },
  { value: 'SPOKEN_VIDEO', label: 'Vídeo falado' },
  { value: 'VOICE_CLONE', label: 'Clone de voz' },
  { value: 'AVATAR_VIDEO', label: 'Avatar' },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'PROCESSING', label: 'Processando' },
  { value: 'COMPLETED', label: 'Concluída' },
  { value: 'FAILED', label: 'Falha' },
];

function genTypeLabel(type: string) {
  const map: Record<string, string> = {
    TEXT_TO_IMAGE: 'Texto → Imagem',
    IMAGE_TO_IMAGE: 'Imagem → Imagem',
    TEXT_TO_VIDEO: 'Texto → Vídeo',
    IMAGE_TO_VIDEO: 'Imagem → Vídeo',
    MOTION_CONTROL: 'Copiar movimentos',
    REFERENCE_VIDEO: 'Referência',
    FACE_SWAP: 'Face Swap',
    VIRTUAL_TRY_ON: 'Try On',
    SPOKEN_VIDEO: 'Vídeo falado',
    VOICE_CLONE: 'Clone de voz',
    AVATAR_VIDEO: 'Avatar',
    text_to_image: 'Texto → Imagem',
    image_to_image: 'Imagem → Imagem',
    text_to_video: 'Texto → Vídeo',
    image_to_video: 'Imagem → Vídeo',
    motion_control: 'Copiar movimentos',
  };
  return map[type] ?? type;
}

function modelLabel(model: string | null) {
  if (!model) return '—';
  const map: Record<string, string> = {
    'nano-banana-2': 'Nano Banana 2',
    'nano-banana-pro': 'Nano Banana Pro',
    nbpro: 'Nano Banana Pro',
    'kling-2.6': 'Kling 2.6',
    'veo-3.1': 'Veo 3.1',
    'veo-fast': 'Veo Fast',
    'veo-max': 'Veo Max',
  };
  return map[model] ?? model;
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

type OutputKind = 'image' | 'video' | 'audio';

function outputKind(url: string, type: string): OutputKind {
  const u = url.split('?')[0].toLowerCase();
  if (/\.(mp4|webm|mov|m4v)$/.test(u)) return 'video';
  if (/\.(mp3|wav|m4a|ogg|aac)$/.test(u)) return 'audio';
  if (/\.(png|jpe?g|webp|gif|avif)$/.test(u)) return 'image';
  // fallback pelo tipo da geração quando a URL não tem extensão clara
  const t = type.toUpperCase();
  if (['TEXT_TO_VIDEO', 'IMAGE_TO_VIDEO', 'MOTION_CONTROL', 'REFERENCE_VIDEO', 'SPOKEN_VIDEO', 'AVATAR_VIDEO'].includes(t))
    return 'video';
  if (t === 'VOICE_CLONE') return 'audio';
  return 'image';
}

interface HoverPreview {
  url: string;
  kind: OutputKind;
  anchorTop: number;
  anchorLeft: number;
  anchorRight: number;
}

function GenerationHoverPreview({ url, kind, anchorTop, anchorLeft, anchorRight }: HoverPreview) {
  const W = 300;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;
  const left = vw - anchorRight > W + 24 ? anchorRight + 16 : Math.max(12, anchorLeft - W - 16);
  const top = Math.min(Math.max(anchorTop - 8, 12), vh - 340);

  return (
    <div
      className="pointer-events-none fixed z-[100] overflow-hidden rounded-2xl border border-[#f3f0ed]/12 bg-[#0c1012] p-1.5 shadow-2xl shadow-black/60"
      style={{ left, top, width: W }}
    >
      {kind === 'video' ? (
        <video src={url} autoPlay muted loop playsInline className="h-auto max-h-[300px] w-full rounded-xl object-contain" />
      ) : kind === 'audio' ? (
        <div className="flex flex-col gap-2 p-3">
          <span className="text-xs text-[#f3f0ed]/50">Áudio gerado</span>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio src={url} controls autoPlay className="w-full" />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Geração" className="h-auto max-h-[300px] w-full rounded-xl object-contain" />
      )}
    </div>
  );
}

export default function AdminGenerationsPage() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const limit = 20;

  // Filtros
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [modelFilter, setModelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Preview flutuante ao passar o mouse sobre a linha
  const [preview, setPreview] = useState<HoverPreview | null>(null);

  function showPreview(gen: { outputUrls?: string[]; type: string }, el: HTMLElement) {
    const url = gen.outputUrls?.[0];
    if (!url) {
      setPreview(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setPreview({
      url,
      kind: outputKind(url, gen.type),
      anchorTop: rect.top,
      anchorLeft: rect.left,
      anchorRight: rect.right,
    });
  }

  // Debounce da busca
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filters = useMemo(
    () => ({
      search: search || undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      model: modelFilter !== 'all' ? modelFilter : undefined,
    }),
    [search, typeFilter, statusFilter, modelFilter],
  );

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'generations', page, filters],
    queryFn: () => api.admin.generations(accessToken!, page, limit, filters),
    enabled: !!accessToken,
    refetchInterval: 15_000,
    placeholderData: keepPreviousData,
  });

  const { data: modelsData } = useQuery({
    queryKey: ['admin', 'generation-models'],
    queryFn: () => api.admin.generationModels(accessToken!),
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
  });

  const modelOptions = useMemo(
    () => [
      { value: 'all', label: 'Todos' },
      ...(modelsData ?? []).map((m) => ({ value: m, label: modelLabel(m) })),
    ],
    [modelsData],
  );

  const generations = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 1;

  const hasFilters =
    search !== '' || typeFilter !== 'all' || modelFilter !== 'all' || statusFilter !== 'all';

  function resetFilters() {
    setSearchInput('');
    setSearch('');
    setTypeFilter('all');
    setModelFilter('all');
    setStatusFilter('all');
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f3f0ed]">Gerações</h1>
          <p className="mt-1 text-sm text-[#f3f0ed]/40">
            Monitoramento em tempo real · {total.toLocaleString('pt-BR')}{' '}
            {hasFilters ? 'resultado(s)' : 'gerações'}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#f3f0ed]/8 text-[#f3f0ed]/40 transition-colors hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 disabled:opacity-40"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-[#f3f0ed]/8 bg-gradient-to-b from-[#f3f0ed]/[0.04] to-[#f3f0ed]/[0.01] p-3 md:p-4">
        <div className="flex flex-wrap items-end gap-3">
          <FilterField label="Buscar" className="min-w-[180px] flex-1 sm:max-w-[280px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#f3f0ed]/30" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Nome ou email…"
                className="h-9 w-full rounded-lg border border-[#f3f0ed]/10 bg-[#141a1c] pl-9 pr-3 text-sm text-[#f3f0ed] placeholder:text-[#f3f0ed]/30 outline-none transition-colors focus:border-[#a2dd00]/50"
              />
            </div>
          </FilterField>

          <FilterField label="Tipo" className="min-w-[150px] flex-1">
            <FilterSelect
              value={typeFilter}
              onChange={(v) => { setTypeFilter(v); setPage(1); }}
              options={TYPE_OPTIONS}
            />
          </FilterField>

          <FilterField label="Modelo" className="min-w-[150px] flex-1">
            <FilterSelect
              value={modelFilter}
              onChange={(v) => { setModelFilter(v); setPage(1); }}
              options={modelOptions}
            />
          </FilterField>

          <FilterField label="Status" className="min-w-[140px] flex-1">
            <FilterSelect
              value={statusFilter}
              onChange={(v) => { setStatusFilter(v); setPage(1); }}
              options={STATUS_OPTIONS}
            />
          </FilterField>

          {hasFilters && (
            <button
              onClick={resetFilters}
              className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[#f3f0ed]/50 transition-colors hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/80"
            >
              <X className="h-3.5 w-3.5" />
              Limpar
            </button>
          )}
        </div>
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
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#f3f0ed]/30">Modelo</TableHead>
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
                <TableRow
                  key={gen.id}
                  className="border-[#f3f0ed]/4 transition-colors hover:bg-[#f3f0ed]/[0.03]"
                  onMouseEnter={(e) => showPreview(gen, e.currentTarget)}
                  onMouseLeave={() => setPreview(null)}
                >
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
                      <ImageIcon className="h-3.5 w-3.5 text-[#f3f0ed]/30" />
                      <span className="text-xs text-[#f3f0ed]/60">{genTypeLabel(gen.type)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-[#f3f0ed]/50">{modelLabel(gen.modelUsed)}</span>
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
                  <TableCell colSpan={9} className="h-32 text-center text-sm text-[#f3f0ed]/30">
                    {hasFilters ? (
                      <div className="flex flex-col items-center gap-2">
                        <span>Nenhuma geração corresponde aos filtros.</span>
                        <button
                          onClick={resetFilters}
                          className="text-xs font-medium text-[#a2dd00]/80 transition-colors hover:text-[#a2dd00]"
                        >
                          Limpar filtros
                        </button>
                      </div>
                    ) : (
                      'Nenhuma geração encontrada'
                    )}
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

      {/* Preview flutuante da geração */}
      {preview && <GenerationHoverPreview {...preview} />}
    </div>
  );
}
