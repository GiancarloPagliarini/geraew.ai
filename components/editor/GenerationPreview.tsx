'use client';

import React from 'react';

// ─── Proportion → CSS aspect-ratio ────────────────────────────────────────────
export const PROPORTION_ASPECT: Record<string, string> = {
  '16-9': '16 / 9',
  '9-16': '9 / 16',
  '1-1':  '1 / 1',
  '4-3':  '4 / 3',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type GenState = 'idle' | 'generating' | 'done';

interface GenerationPreviewProps {
  genState: GenState;
  /** Whether the media is fully loaded and should be shown */
  imageVisible: boolean;
  /** Progress 0–100 shown inside the aurora overlay */
  progress: number;

  // ── Image mode (default) ──────────────────────────────────────────────────
  generatedImageUrl?: string | null;
  /** Called when the <img> onLoad fires — set imageVisible(true) here */
  onImageLoad?: () => void;
  imageRef?: React.Ref<HTMLImageElement>;
  onImageClick?: () => void;
  onImageDragStart?: (e: React.DragEvent<HTMLImageElement>) => void;
  /** Extra CSS filter applied to the image when fully visible (e.g. upscale) */
  imageFilter?: string;

  // ── Custom media mode (video, etc.) ───────────────────────────────────────
  /**
   * When provided, renders this instead of the default <img>.
   * The outer container already handles opacity/fade — no need to repeat it.
   * Receives `mediaVisible` so the render prop can apply blur or other effects.
   */
  renderMedia?: (mediaVisible: boolean) => React.ReactNode;

  // ── Layout ────────────────────────────────────────────────────────────────
  /** e.g. '16-9' | '9-16' | '1-1' | '4-3'. Omit for natural/auto height. */
  proportion?: string;

  /** Hover overlay content (action buttons, badges, etc.) */
  children?: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GenerationPreview({
  genState,
  imageVisible,
  onImageLoad,
  progress,
  generatedImageUrl,
  imageRef,
  onImageClick,
  onImageDragStart,
  imageFilter,
  renderMedia,
  proportion,
  children,
}: GenerationPreviewProps) {
  const hasMedia = !!(generatedImageUrl || renderMedia);

  // Only render something when actively generating or media exists
  if (genState === 'idle' && !hasMedia) return null;

  const aspectRatio = proportion ? (PROPORTION_ASPECT[proportion] ?? proportion) : undefined;

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{ aspectRatio, transition: aspectRatio ? 'aspect-ratio 0.4s ease' : undefined }}
    >
      {/* ── Fluid aurora overlay — visible while loading, fades out on reveal ── */}
      {genState !== 'idle' && (
        <div
          className="absolute inset-0 overflow-hidden rounded-xl border border-[#f3f0ed]/6"
          style={{
            background: '#0d1a1b',
            opacity: !imageVisible ? 1 : 0,
            transition: 'opacity 1.2s ease',
            pointerEvents: genState === 'done' ? 'none' : 'auto',
            zIndex: 1,
          }}
        >
          {/* Blobs */}
          <div className="absolute inset-0" style={{ filter: 'blur(52px)', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', top: '-30%', left: '-20%',
              width: '80%', height: '80%',
              background: 'radial-gradient(ellipse, rgba(162,221,0,0.28) 0%, transparent 70%)',
              animation: 'fluid-blob-1 5s ease-in-out infinite',
            }} />
            <div style={{
              position: 'absolute', bottom: '-25%', right: '-20%',
              width: '75%', height: '75%',
              background: 'radial-gradient(ellipse, rgba(30,73,75,0.9) 0%, rgba(162,221,0,0.18) 50%, transparent 70%)',
              animation: 'fluid-blob-2 5s ease-in-out infinite',
            }} />
            <div style={{
              position: 'absolute', top: '15%', right: '-15%',
              width: '65%', height: '65%',
              background: 'radial-gradient(ellipse, rgba(20,40,42,0.95) 0%, rgba(162,221,0,0.12) 60%, transparent 80%)',
              animation: 'fluid-blob-3 7s ease-in-out infinite',
            }} />
            <div style={{
              position: 'absolute', bottom: '-10%', left: '10%',
              width: '60%', height: '60%',
              background: 'radial-gradient(ellipse, rgba(162,221,0,0.2) 0%, rgba(30,73,75,0.5) 45%, transparent 70%)',
              animation: 'fluid-blob-4 9s ease-in-out infinite',
            }} />
          </div>

          {/* Progress % */}
          <span className="absolute top-3 right-3 z-10 text-xs font-bold text-[#f3f0ed]/60">
            {progress}%
          </span>
        </div>
      )}

      {/* ── Media layer — fades in on top of the aurora ── */}
      {hasMedia && (
        <div
          className="group absolute inset-0 overflow-hidden rounded-xl border border-[#f3f0ed]/8"
          style={{
            opacity: imageVisible ? 1 : 0,
            transition: 'opacity 0.6s ease',
            zIndex: 2,
          }}
        >
          {renderMedia ? (
            renderMedia(imageVisible)
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              ref={imageRef}
              src={generatedImageUrl ?? undefined}
              alt="Imagem gerada"
              className="nopan nodrag h-full w-full object-cover cursor-pointer"
              draggable="true"
              onClick={onImageClick}
              onDragStart={onImageDragStart}
              onLoad={onImageLoad}
              style={{
                transition: 'filter 0.8s ease, opacity 1.2s ease',
                opacity: imageVisible ? 1 : 0,
                filter: !imageVisible ? 'blur(20px)' : (imageFilter ?? 'blur(0px)'),
              }}
            />
          )}

          {/* Hover overlay — callers pass action buttons as children */}
          {children && (
            <div className="pointer-events-none absolute inset-0 flex items-start justify-end gap-1.5 bg-linear-to-b from-black/50 via-transparent to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <div className="pointer-events-auto flex gap-1.5">
                {children}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
