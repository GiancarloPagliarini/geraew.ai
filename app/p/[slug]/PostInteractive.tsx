'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Heart,
  Send,
  Bookmark,
  Copy,
  Check,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

interface Slide {
  id: string;
  order: number;
  prompt: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  aspectRatio: string | null;
  generationType: string;
  aiModel: string | null;
  copyCount: number;
  useCount: number;
}

interface PostInteractiveProps {
  slug: string;
  caption: string | null;
  viewCount: number;
  createdAt: string;
  slides: Slide[];
  formattedDate: string;
  formattedViews: string;
}

function aspectClassFor(ratio: string | null) {
  if (ratio === '9:16') return 'aspect-[9/16]';
  if (ratio === '16:9') return 'aspect-[16/9]';
  if (ratio === '4:5') return 'aspect-[4/5]';
  return 'aspect-square';
}

function track(slug: string, event: 'view' | 'copy' | 'use', slideIndex?: number) {
  fetch(`${API_URL}/api/v1/prompt-posts/${slug}/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, slideIndex }),
    keepalive: true,
  }).catch(() => {});
}

export function PostInteractive({
  slug,
  caption,
  slides,
  formattedDate,
  formattedViews,
}: PostInteractiveProps) {
  const [index, setIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const router = useRouter();
  const trackRef = useRef(false);
  const trackRefView = useRef(false);
  const touchStartX = useRef<number | null>(null);
  const trackRefRef = useRef<HTMLDivElement>(null);

  const total = slides.length;
  const activeSlide = slides[index];
  const aspect = useMemo(() => aspectClassFor(activeSlide.aspectRatio), [activeSlide]);

  useEffect(() => {
    if (trackRefView.current) return;
    trackRefView.current = true;
    track(slug, 'view');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset estados visuais ao trocar de slide
  useEffect(() => {
    setCopied(false);
  }, [index]);

  const goPrev = () => {
    if (index > 0) setIndex(index - 1);
  };
  const goNext = () => {
    if (index < total - 1) setIndex(index + 1);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    const threshold = 40;
    if (dx > threshold) goPrev();
    else if (dx < -threshold) goNext();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeSlide.prompt);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = activeSlide.prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    track(slug, 'copy', index);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleUse = () => {
    track(slug, 'use', index);
    const panel =
      activeSlide.generationType.startsWith('TEXT_TO_VIDEO') ||
      activeSlide.generationType.startsWith('IMAGE_TO_VIDEO')
        ? 'generate-video'
        : 'generate-image';
    const params = new URLSearchParams({ prompt: activeSlide.prompt, panel });
    router.push(`/workspace?${params.toString()}`);
  };

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ url, title: 'Prompt — GeraEW' });
        return;
      } catch {
        /* fallback abaixo */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  };

  const promptIsLong = activeSlide.prompt.length > 220;

  return (
    <>
      {/* Carrossel */}
      <div
        ref={trackRefRef}
        className={`relative w-full ${aspect} bg-black overflow-hidden select-none`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex h-full w-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((s) => (
            <div key={s.id} className="relative h-full w-full shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.imageUrl}
                alt={s.prompt.slice(0, 80)}
                className="h-full w-full object-cover"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {/* Setas (desktop / quando há +1 slide) */}
        {total > 1 && index > 0 && (
          <button
            type="button"
            onClick={goPrev}
            aria-label="Anterior"
            className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-black hover:bg-white shadow"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
          </button>
        )}
        {total > 1 && index < total - 1 && (
          <button
            type="button"
            onClick={goNext}
            aria-label="Próximo"
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-black hover:bg-white shadow"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
          </button>
        )}

        {/* Contador (1/5) topo direito */}
        {total > 1 && (
          <div className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
            {index + 1}/{total}
          </div>
        )}
      </div>

      {/* Action bar Instagram-style */}
      <div className="flex items-center justify-between px-2 pt-2 pb-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setLiked((v) => !v)}
            aria-label={liked ? 'Descurtir' : 'Curtir'}
            className="flex h-10 w-10 items-center justify-center text-white active:scale-90 transition-transform"
          >
            <Heart
              className={`h-7 w-7 ${liked ? 'fill-[#ff3040] text-[#ff3040]' : ''}`}
              strokeWidth={1.75}
            />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copiar prompt deste slide"
            title="Copiar prompt deste slide"
            className="relative flex h-10 w-10 items-center justify-center text-white active:scale-90 transition-transform"
          >
            {copied ? (
              <Check className="h-7 w-7 text-[#BFFF00]" strokeWidth={2} />
            ) : (
              <Copy className="h-[26px] w-[26px]" strokeWidth={1.75} />
            )}
          </button>
          <button
            type="button"
            onClick={handleShare}
            aria-label="Compartilhar"
            className="flex h-10 w-10 items-center justify-center text-white active:scale-90 transition-transform"
          >
            <Send className="h-[26px] w-[26px] -rotate-12" strokeWidth={1.75} />
          </button>
        </div>

        {/* Indicadores (centro inferior dos ícones, estilo Instagram) */}
        {total > 1 && (
          <div className="flex items-center gap-1">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ir para slide ${i + 1}`}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === index ? 'bg-[#1da1f2]' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setSaved((v) => !v)}
          aria-label={saved ? 'Remover dos salvos' : 'Salvar'}
          className="flex h-10 w-10 items-center justify-center text-white active:scale-90 transition-transform"
        >
          <Bookmark
            className={`h-[26px] w-[26px] ${saved ? 'fill-white' : ''}`}
            strokeWidth={1.75}
          />
        </button>
      </div>

      {/* CTA Usar prompt */}
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={handleUse}
          className="flex w-full items-center justify-center gap-2 h-10 rounded-lg bg-[#BFFF00] hover:bg-[#a8e600] active:bg-[#94cc00] text-sm font-semibold text-black transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          <span>Usar prompt deste slide</span>
        </button>
      </div>

      {/* Stats / contagem */}
      <div className="px-3">
        <p className="text-sm font-semibold text-white">
          {formattedViews} visualizações
        </p>
      </div>

      {/* Caption — username + caption do post + prompt do slide ativo */}
      <section className="px-3 pt-1.5 pb-2">
        <p className="text-sm leading-snug text-white whitespace-pre-wrap break-words">
          <span className="inline-flex items-center gap-1 mr-1.5 align-baseline">
            <span className="font-semibold">geraew.ai</span>
            <BadgeCheck
              className="h-[12px] w-[12px] text-[#1da1f2] fill-[#1da1f2] [&>path:last-child]:stroke-black"
              strokeWidth={2.5}
              aria-hidden
            />
          </span>
          {caption ? (
            <>
              <span className="font-medium">{caption}</span>{' '}
            </>
          ) : null}
          <span className="text-white/95">
            {showFullCaption || !promptIsLong
              ? activeSlide.prompt
              : `${activeSlide.prompt.slice(0, 220)}… `}
          </span>
          {!showFullCaption && promptIsLong && (
            <button
              type="button"
              onClick={() => setShowFullCaption(true)}
              className="text-white/50 hover:text-white/70"
            >
              mais
            </button>
          )}
        </p>
        {total > 1 && (
          <p className="mt-1 text-[12px] text-white/40">
            Slide {index + 1} de {total} · arraste para o lado
          </p>
        )}
      </section>

      {/* Linha "X copiou o prompt" */}
      <div className="px-3">
        <p className="text-[13px] text-white/50">
          {activeSlide.copyCount > 0
            ? `${activeSlide.copyCount} ${
                activeSlide.copyCount === 1 ? 'pessoa copiou' : 'pessoas copiaram'
              } este prompt`
            : 'Seja o primeiro a usar este prompt'}
        </p>
      </div>

      {/* Data */}
      <p className="px-3 pt-1.5 pb-4 text-[11px] uppercase tracking-wide text-white/40">
        {formattedDate}
      </p>
    </>
  );
}
