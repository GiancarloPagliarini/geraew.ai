'use client';

import { useAuth } from '@/lib/auth-context';
import {
  api,
  type PromptPost,
  type PromptPostSlideInput,
} from '@/lib/api';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Copy,
  Check,
  Eye,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Wand2,
  Image as ImageIcon,
  Link as LinkIcon,
  X,
  ChevronUp,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const GENERATION_TYPES = [
  { value: 'TEXT_TO_IMAGE', label: 'Texto → Imagem' },
  { value: 'IMAGE_TO_IMAGE', label: 'Imagem → Imagem' },
  { value: 'TEXT_TO_VIDEO', label: 'Texto → Vídeo' },
  { value: 'IMAGE_TO_VIDEO', label: 'Imagem → Vídeo' },
];

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 (Quadrado)' },
  { value: '9:16', label: '9:16 (Vertical)' },
  { value: '16:9', label: '16:9 (Horizontal)' },
  { value: '4:5', label: '4:5 (Retrato)' },
];

interface DraftSlide {
  uid: string;
  prompt: string;
  imageUrl: string;
  generationType: string;
  aspectRatio: string;
  aiModel: string;
  uploading: boolean;
}

function newDraftSlide(): DraftSlide {
  return {
    uid: crypto.randomUUID(),
    prompt: '',
    imageUrl: '',
    generationType: 'TEXT_TO_IMAGE',
    aspectRatio: '1:1',
    aiModel: '',
    uploading: false,
  };
}

export default function AdminPromptPostsPage() {
  const { accessToken } = useAuth();
  const [posts, setPosts] = useState<PromptPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await api.admin.promptPosts.list(accessToken, { limit: 100 });
      setPosts(res.data);
    } catch {
      toast.error('Erro ao carregar posts');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    if (!confirm('Tem certeza? O link público vai parar de funcionar.')) return;
    try {
      await api.admin.promptPosts.remove(accessToken, id);
      toast.success('Post removido');
      fetchPosts();
    } catch {
      toast.error('Erro ao remover');
    }
  };

  const handleTogglePublished = async (post: PromptPost) => {
    if (!accessToken) return;
    try {
      await api.admin.promptPosts.update(accessToken, post.id, {
        isPublished: !post.isPublished,
      });
      fetchPosts();
    } catch {
      toast.error('Erro ao atualizar');
    }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/p/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    toast.success('Link copiado!');
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#f3f0ed]">Posts Públicos</h1>
          <p className="mt-1 text-sm text-[#f3f0ed]/40">
            Páginas estilo Instagram com prompts copiáveis. Cada post pode ter
            várias imagens em carrossel — uma legenda por imagem.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-[#a2dd00] px-4 py-2 text-sm font-semibold text-black hover:bg-[#8ec000]"
        >
          <Plus className="h-4 w-4" />
          Novo post
        </button>
      </div>

      {showForm && (
        <NewPostModal
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            fetchPosts();
          }}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#f3f0ed]/10 bg-[#f3f0ed]/[0.02] py-16 text-center">
          <p className="text-sm text-[#f3f0ed]/40">
            Nenhum post ainda. Crie o primeiro pra compartilhar no Instagram.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {posts.map((post) => {
            const cover = post.slides[0];
            return (
              <article
                key={post.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/[0.02]"
              >
                <div className="relative aspect-square bg-black/30">
                  {cover ? (
                    <img
                      src={cover.thumbnailUrl ?? cover.imageUrl}
                      alt={post.slug}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-[#f3f0ed]/40">
                      Sem imagem
                    </div>
                  )}
                  {!post.isPublished && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-medium text-white/80">
                      Despublicado
                    </div>
                  )}
                  {post.slides.length > 1 && (
                    <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                      <Layers className="h-3 w-3" />
                      {post.slides.length}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 p-3">
                  <div className="flex items-center gap-1.5 truncate text-[11px] text-[#f3f0ed]/30">
                    <LinkIcon className="h-3 w-3 shrink-0" />
                    <span className="truncate">/p/{post.slug}</span>
                  </div>
                  <p className="line-clamp-2 text-xs text-[#f3f0ed]/70">
                    {cover?.prompt ?? '—'}
                  </p>
                  <div className="grid grid-cols-3 gap-1 text-center text-[10px] text-[#f3f0ed]/50">
                    <div className="rounded bg-[#f3f0ed]/[0.04] px-1 py-1">
                      <div className="font-semibold text-[#f3f0ed]/80">
                        {post.viewCount}
                      </div>
                      <div>views</div>
                    </div>
                    <div className="rounded bg-[#f3f0ed]/[0.04] px-1 py-1">
                      <div className="font-semibold text-[#f3f0ed]/80">
                        {post.copyCount}
                      </div>
                      <div>copies</div>
                    </div>
                    <div className="rounded bg-[#a2dd00]/10 px-1 py-1">
                      <div className="font-semibold text-[#a2dd00]">
                        {post.useCount}
                      </div>
                      <div>uses</div>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => copyLink(post.slug)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-md bg-[#f3f0ed]/[0.04] px-2 py-1.5 text-[11px] font-medium text-[#f3f0ed]/70 hover:bg-[#f3f0ed]/[0.08]"
                    >
                      {copiedSlug === post.slug ? (
                        <Check className="h-3 w-3 text-[#a2dd00]" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      Copiar link
                    </button>
                    <Link
                      href={`/p/${post.slug}`}
                      target="_blank"
                      title="Ver"
                      className="flex h-7 w-7 items-center justify-center rounded-md bg-[#f3f0ed]/[0.04] text-[#f3f0ed]/60 hover:bg-[#f3f0ed]/[0.08]"
                    >
                      <Eye className="h-3 w-3" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleTogglePublished(post)}
                      title={post.isPublished ? 'Despublicar' : 'Publicar'}
                      className={`flex h-7 w-7 items-center justify-center rounded-md ${
                        post.isPublished
                          ? 'bg-[#a2dd00]/15 text-[#a2dd00]'
                          : 'bg-[#f3f0ed]/[0.04] text-[#f3f0ed]/40'
                      }`}
                    >
                      <ImageIcon className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(post.id)}
                      title="Remover"
                      className="flex h-7 w-7 items-center justify-center rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NewPostModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { accessToken } = useAuth();
  const [caption, setCaption] = useState('');
  const [slug, setSlug] = useState('');
  const [slides, setSlides] = useState<DraftSlide[]>([newDraftSlide()]);
  const [submitting, setSubmitting] = useState(false);

  const updateSlide = (uid: string, patch: Partial<DraftSlide>) => {
    setSlides((prev) => prev.map((s) => (s.uid === uid ? { ...s, ...patch } : s)));
  };

  const removeSlide = (uid: string) => {
    setSlides((prev) => (prev.length > 1 ? prev.filter((s) => s.uid !== uid) : prev));
  };

  const moveSlide = (uid: string, direction: -1 | 1) => {
    setSlides((prev) => {
      const idx = prev.findIndex((s) => s.uid === uid);
      const targetIdx = idx + direction;
      if (idx === -1 || targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return next;
    });
  };

  const handleUpload = async (uid: string, file: File) => {
    if (!accessToken) return;
    updateSlide(uid, { uploading: true });
    try {
      const { uploadUrl, publicUrl } = await api.admin.upload(
        accessToken,
        file.name,
        file.type,
        'prompt-posts',
      );
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!putRes.ok) throw new Error('Upload falhou');
      updateSlide(uid, { imageUrl: publicUrl });
      toast.success('Imagem enviada');
    } catch {
      toast.error('Falha no upload');
    } finally {
      updateSlide(uid, { uploading: false });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    const invalid = slides.find((s) => !s.imageUrl || !s.prompt.trim());
    if (invalid) {
      toast.error('Cada slide precisa de imagem e prompt');
      return;
    }

    setSubmitting(true);
    try {
      const payload: PromptPostSlideInput[] = slides.map((s) => ({
        prompt: s.prompt.trim(),
        imageUrl: s.imageUrl,
        generationType: s.generationType,
        aspectRatio: s.aspectRatio,
        aiModel: s.aiModel.trim() || undefined,
      }));
      const res = await api.admin.promptPosts.create(accessToken, {
        slides: payload,
        caption: caption.trim() || undefined,
        slug: slug.trim() || undefined,
      });
      toast.success(`Post criado: /p/${res.slug}`);
      onCreated();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#f3f0ed]/8 bg-[#141a1c]">
        <header className="flex items-center justify-between border-b border-[#f3f0ed]/6 px-5 py-4">
          <h2 className="text-lg font-semibold text-[#f3f0ed]">Novo Post Público</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#f3f0ed]/40 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/80"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 overflow-y-auto px-5 py-4">
          {/* Caption + slug do post */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#f3f0ed]/60">
                Legenda (opcional, mostrada acima do prompt do slide)
              </label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={500}
                placeholder="Ex: não é edição. não é montagem."
                className="w-full rounded-lg border border-[#f3f0ed]/10 bg-[#f3f0ed]/[0.03] px-3 py-2 text-sm text-[#f3f0ed] placeholder:text-[#f3f0ed]/30 focus:border-[#a2dd00]/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#f3f0ed]/60">
                Slug (opcional)
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) =>
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                }
                placeholder="gerado-automaticamente"
                className="w-full rounded-lg border border-[#f3f0ed]/10 bg-[#f3f0ed]/[0.03] px-3 py-2 text-sm text-[#f3f0ed] placeholder:text-[#f3f0ed]/30 focus:border-[#a2dd00]/40 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-[#f3f0ed]/30">
                URL: /p/{slug || '<gerado>'}
              </p>
            </div>
          </div>

          {/* Lista de slides */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#f3f0ed]">
                Slides do carrossel ({slides.length})
              </h3>
              <button
                type="button"
                onClick={() => setSlides((prev) => [...prev, newDraftSlide()])}
                className="flex items-center gap-1.5 rounded-lg bg-[#f3f0ed]/[0.04] px-3 py-1.5 text-xs font-medium text-[#f3f0ed]/80 hover:bg-[#f3f0ed]/[0.08]"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar slide
              </button>
            </div>

            {slides.map((slide, i) => (
              <SlideEditor
                key={slide.uid}
                index={i}
                total={slides.length}
                slide={slide}
                onChange={(patch) => updateSlide(slide.uid, patch)}
                onUpload={(file) => handleUpload(slide.uid, file)}
                onRemove={() => removeSlide(slide.uid)}
                onMoveUp={() => moveSlide(slide.uid, -1)}
                onMoveDown={() => moveSlide(slide.uid, 1)}
              />
            ))}
          </div>
        </form>

        <footer className="flex items-center justify-end gap-2 border-t border-[#f3f0ed]/6 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-[#f3f0ed]/60 hover:bg-[#f3f0ed]/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || slides.some((s) => s.uploading)}
            className="flex items-center gap-2 rounded-lg bg-[#a2dd00] px-4 py-2 text-sm font-semibold text-black hover:bg-[#8ec000] disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            Criar post
          </button>
        </footer>
      </div>
    </div>
  );
}

function SlideEditor({
  index,
  total,
  slide,
  onChange,
  onUpload,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  index: number;
  total: number;
  slide: DraftSlide;
  onChange: (patch: Partial<DraftSlide>) => void;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-xl border border-[#f3f0ed]/8 bg-[#f3f0ed]/[0.02] p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-md bg-[#f3f0ed]/[0.06] px-2 py-0.5 text-[11px] font-semibold text-[#f3f0ed]/70">
          Slide #{index + 1}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            title="Mover para cima"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#f3f0ed]/50 hover:bg-[#f3f0ed]/5 disabled:opacity-30"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            title="Mover para baixo"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#f3f0ed]/50 hover:bg-[#f3f0ed]/5 disabled:opacity-30"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={total === 1}
            title="Remover slide"
            className="flex h-7 w-7 items-center justify-center rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-30"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[150px_1fr]">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          />
          {slide.imageUrl ? (
            <div className="relative">
              <img
                src={slide.imageUrl}
                alt=""
                className="aspect-square w-full rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => onChange({ imageUrl: '' })}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={slide.uploading}
              className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-[#f3f0ed]/10 bg-[#f3f0ed]/[0.02] text-xs text-[#f3f0ed]/50 hover:border-[#a2dd00]/40 hover:bg-[#a2dd00]/5"
            >
              {slide.uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#a2dd00]" />
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  <span>Enviar</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <textarea
            value={slide.prompt}
            onChange={(e) => onChange({ prompt: e.target.value })}
            rows={3}
            placeholder="Prompt usado para gerar essa imagem..."
            className="w-full resize-none rounded-lg border border-[#f3f0ed]/10 bg-[#f3f0ed]/[0.03] px-3 py-2 text-sm text-[#f3f0ed] placeholder:text-[#f3f0ed]/30 focus:border-[#a2dd00]/40 focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={slide.generationType}
              onChange={(e) => onChange({ generationType: e.target.value })}
              className="rounded-lg border border-[#f3f0ed]/10 bg-[#141a1c] px-2 py-1.5 text-xs text-[#f3f0ed] focus:border-[#a2dd00]/40 focus:outline-none"
            >
              {GENERATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              value={slide.aspectRatio}
              onChange={(e) => onChange({ aspectRatio: e.target.value })}
              className="rounded-lg border border-[#f3f0ed]/10 bg-[#141a1c] px-2 py-1.5 text-xs text-[#f3f0ed] focus:border-[#a2dd00]/40 focus:outline-none"
            >
              {ASPECT_RATIOS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={slide.aiModel}
            onChange={(e) => onChange({ aiModel: e.target.value })}
            placeholder="Modelo de IA (opcional, ex: nano-banana-2)"
            className="w-full rounded-lg border border-[#f3f0ed]/10 bg-[#f3f0ed]/[0.03] px-3 py-1.5 text-xs text-[#f3f0ed] placeholder:text-[#f3f0ed]/30 focus:border-[#a2dd00]/40 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
