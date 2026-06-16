'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Heart, ImagePlus, Loader2, Plus, Rss, SquarePlay, Trash2, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api, type AdminCommunityPost, type CommunityPostStatus } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

/** Modal: o admin envia uma imagem/vídeo e publica direto (auto-aprovado). */
function CreatePostModal({
  accessToken,
  onClose,
  onCreated,
}: {
  accessToken: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isVideoFile = file?.type.startsWith('video/');

  const pickFile = (f: File) => {
    if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) {
      toast.error('Envie uma imagem ou vídeo.');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!file) return;
    setSubmitting(true);
    try {
      const { uploadUrl, publicUrl } = await api.admin.upload(
        accessToken,
        file.name,
        file.type,
        'community',
      );
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      await api.admin.community.create(accessToken, {
        kind: file.type.startsWith('video/') ? 'video' : 'image',
        mediaUrl: publicUrl,
        prompt: prompt.trim() || undefined,
      });
      toast.success('Publicação criada e já está no feed.');
      onCreated();
      onClose();
    } catch (e) {
      toast.error((e as Error).message || 'Não foi possível publicar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="mt-[6vh] w-[min(560px,100%)] overflow-hidden rounded-2xl border border-[#f3f0ed]/10 bg-[#1a2123] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#f3f0ed]/10 px-5 py-4">
          <h2 className="text-base font-bold text-[#f3f0ed]">Nova publicação</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-[#f3f0ed]/50 transition-colors hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]"
          >
            <X className="size-[18px]" />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {/* upload / preview */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && pickFile(e.target.files[0])}
          />
          {previewUrl ? (
            <div className="relative overflow-hidden rounded-xl border border-[#f3f0ed]/10 bg-black/30">
              {isVideoFile ? (
                <video src={previewUrl} controls className="max-h-[320px] w-full object-contain" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="preview" className="max-h-[320px] w-full object-contain" />
              )}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="absolute bottom-3 right-3 rounded-lg bg-black/70 px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-black/90"
              >
                Trocar mídia
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#f3f0ed]/15 text-[#f3f0ed]/50 transition-colors hover:border-[#a2dd00]/40 hover:text-[#f3f0ed]"
            >
              <ImagePlus className="size-7" strokeWidth={1.6} />
              <span className="text-sm font-medium">Selecionar imagem ou vídeo</span>
            </button>
          )}

          {/* prompt/legenda */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-[#f3f0ed]/70">Prompt / legenda (opcional)</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Descreva ou cole o prompt usado..."
              className="resize-none rounded-lg border border-[#f3f0ed]/10 bg-[#141a1c] px-3 py-2 text-[13px] text-[#f3f0ed] outline-none placeholder:text-[#f3f0ed]/30 focus:border-[#a2dd00]/40"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#f3f0ed]/10 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-[#f3f0ed]/15 px-4 text-[13px] font-semibold text-[#f3f0ed]/70 transition-colors hover:bg-[#f3f0ed]/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!file || submitting}
            onClick={submit}
            className="flex h-10 items-center gap-2 rounded-lg bg-[#a2dd00] px-5 text-[13px] font-semibold text-[#11181a] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Publicar
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUS_TABS: { value: CommunityPostStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'APPROVED', label: 'Aprovados' },
  { value: 'REJECTED', label: 'Rejeitados' },
];

const STATUS_BADGE: Record<CommunityPostStatus, { label: string; className: string }> = {
  PENDING: { label: 'Em análise', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  APPROVED: { label: 'Aprovado', className: 'bg-[#a2dd00]/15 text-[#a2dd00] border-[#a2dd00]/30' },
  REJECTED: { label: 'Rejeitado', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

function PostCard({
  post,
  onApprove,
  onReject,
  onDelete,
  busy,
}: {
  post: AdminCommunityPost;
  onApprove: (id: string) => void;
  onReject: (id: string, reason?: string) => void;
  onDelete: (id: string) => void;
  busy: boolean;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [deleteArmed, setDeleteArmed] = useState(false);
  const thumb = post.thumbnailUrl || (post.kind === 'image' ? post.mediaUrl : null);
  const badge = STATUS_BADGE[post.status];

  return (
    <div className="overflow-hidden rounded-xl border border-[#f3f0ed]/10 bg-[#1e2829]">
      {/* mídia */}
      <a href={post.mediaUrl} target="_blank" rel="noopener noreferrer" className="block">
        <div className="relative aspect-square bg-black/30">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
          ) : (
            <video src={post.mediaUrl} muted playsInline preload="metadata" className="absolute inset-0 size-full object-cover" />
          )}
          {post.kind === 'video' && (
            <SquarePlay className="absolute left-2 top-2 size-5 text-white drop-shadow" strokeWidth={2} />
          )}
          <Badge variant="outline" className={`absolute right-2 top-2 ${badge.className}`}>
            {badge.label}
          </Badge>
        </div>
      </a>

      <div className="flex flex-col gap-2.5 p-3.5">
        <div className="flex items-center justify-between gap-2 text-xs text-[#f3f0ed]/50">
          <span className="truncate">{post.user.name} · {post.user.email}</span>
          <span className="flex shrink-0 items-center gap-1">
            <Heart className="size-3" /> {post.likesCount}
          </span>
        </div>
        <p className="line-clamp-3 text-[13px] leading-relaxed text-[#f3f0ed]/80">
          {post.prompt || <span className="italic text-[#f3f0ed]/35">sem prompt</span>}
        </p>
        {post.status === 'REJECTED' && post.rejectionReason && (
          <p className="text-xs text-red-400/80">Motivo: {post.rejectionReason}</p>
        )}

        {/* ações */}
        {!rejecting && (
          <div className="mt-1 flex gap-2">
            {post.status !== 'APPROVED' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onApprove(post.id)}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#a2dd00] text-[13px] font-semibold text-[#11181a] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Check className="size-4" strokeWidth={2.2} /> Aprovar
              </button>
            )}
            {post.status === 'PENDING' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setRejecting(true)}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-500/40 text-[13px] font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
              >
                <X className="size-4" strokeWidth={2.2} /> Rejeitar
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              title={deleteArmed ? 'Clique para confirmar' : 'Excluir post'}
              onClick={() => {
                if (!deleteArmed) {
                  setDeleteArmed(true);
                  setTimeout(() => setDeleteArmed(false), 3000);
                  return;
                }
                onDelete(post.id);
              }}
              className={`flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold transition-colors disabled:opacity-50 ${
                deleteArmed
                  ? 'border-red-500 bg-red-500/90 text-white'
                  : 'border-[#f3f0ed]/15 text-[#f3f0ed]/60 hover:border-red-500/40 hover:text-red-400'
              } ${post.status === 'APPROVED' ? 'flex-1' : ''}`}
            >
              <Trash2 className="size-4" strokeWidth={2} />
              {deleteArmed ? 'Confirmar' : post.status === 'APPROVED' ? 'Excluir' : ''}
            </button>
          </div>
        )}

        {rejecting && (
          <div className="mt-1 flex flex-col gap-2">
            <input
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              placeholder="Motivo (opcional, visível ao autor)"
              className="h-9 rounded-lg border border-[#f3f0ed]/10 bg-[#141a1c] px-3 text-[13px] text-[#f3f0ed] outline-none placeholder:text-[#f3f0ed]/30 focus:border-red-500/40"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => onReject(post.id, reason.trim() || undefined)}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-500/90 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Confirmar rejeição
              </button>
              <button
                type="button"
                onClick={() => {
                  setRejecting(false);
                  setReason('');
                }}
                className="h-9 rounded-lg border border-[#f3f0ed]/15 px-3 text-[13px] text-[#f3f0ed]/70 transition-colors hover:bg-[#f3f0ed]/5"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminComunidadePage() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<CommunityPostStatus>('PENDING');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: ['admin', 'community', status],
    queryFn: () => api.admin.community.list(accessToken!, status, 1, 60),
    enabled: !!accessToken,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'community'] });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.admin.community.approve(accessToken!, id),
    onSuccess: () => {
      toast.success('Post aprovado — o autor foi notificado.');
      invalidate();
    },
    onError: () => toast.error('Não foi possível aprovar.'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.admin.community.reject(accessToken!, id, reason),
    onSuccess: () => {
      toast.success('Post rejeitado — o autor foi notificado.');
      invalidate();
    },
    onError: () => toast.error('Não foi possível rejeitar.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.admin.community.delete(accessToken!, id),
    onSuccess: () => {
      toast.success('Post excluído.');
      invalidate();
    },
    onError: () => toast.error('Não foi possível excluir.'),
  });

  const busy = approveMutation.isPending || rejectMutation.isPending || deleteMutation.isPending;
  const posts = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-[#f3f0ed]">
            <Rss className="size-6 text-[#a2dd00]" /> Comunidade
          </h1>
          <p className="mt-1 text-sm text-[#f3f0ed]/50">
            Modere as publicações enviadas pelos usuários. Aprovar ou rejeitar notifica o autor.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[#a2dd00] px-4 text-[13px] font-semibold text-[#11181a] transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" strokeWidth={2.5} /> Nova publicação
        </button>
      </div>

      {createOpen && accessToken && (
        <CreatePostModal
          accessToken={accessToken}
          onClose={() => setCreateOpen(false)}
          onCreated={invalidate}
        />
      )}

      {/* abas de status */}
      <div className="flex gap-1 rounded-xl border border-[#f3f0ed]/10 bg-[#1a2123] p-1 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatus(tab.value)}
            className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors ${
              status === tab.value
                ? 'bg-[#1e2829] text-[#f3f0ed]'
                : 'text-[#f3f0ed]/50 hover:text-[#f3f0ed]/80'
            }`}
          >
            {tab.label}
            {tab.value === 'PENDING' && status === 'PENDING' && data?.meta.total ? (
              <span className="ml-2 rounded-full bg-[#a2dd00] px-1.5 py-0.5 text-[10px] font-bold text-[#11181a]">
                {data.meta.total}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {isPending ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-[#a2dd00]" />
        </div>
      ) : posts.length === 0 ? (
        <p className="py-16 text-center text-sm text-[#f3f0ed]/40">
          Nenhum post {STATUS_BADGE[status].label.toLowerCase()} no momento.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              busy={busy}
              onApprove={(id) => approveMutation.mutate(id)}
              onReject={(id, reason) => rejectMutation.mutate({ id, reason })}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
