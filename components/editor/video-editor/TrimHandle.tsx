'use client';

import { useState } from 'react';
import { GripVertical } from 'lucide-react';
import type { VideoClip } from '@/lib/api';

function formatTrimTime(ms: number): string {
  const totalSec = ms / 1000;
  const min = Math.floor(totalSec / 60);
  const sec = Math.floor(totalSec % 60);
  const centis = Math.floor((ms % 1000) / 10);
  return `${min}:${String(sec).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}

export function TrimHandle({
  side,
  clip,
  durationMs,
  onTrimCommit,
}: {
  side: 'left' | 'right';
  clip: VideoClip;
  durationMs: number;
  onTrimCommit: (ms: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [previewPct, setPreviewPct] = useState<number | null>(null);
  const [previewMs, setPreviewMs] = useState<number | null>(null);

  function snapToGrid(ms: number): number {
    return Math.round(ms / 100) * 100;
  }

  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);

    const parent = (e.currentTarget as HTMLElement).parentElement!;
    const parentRect = parent.getBoundingClientRect();
    let lastMs = side === 'left' ? (clip.startMs ?? 0) : (clip.endMs ?? durationMs);

    const onMove = (me: PointerEvent) => {
      const x = Math.max(0, Math.min(me.clientX - parentRect.left, parentRect.width));
      const ratio = x / parentRect.width;
      const timeMs = snapToGrid(Math.round(ratio * durationMs));

      if (side === 'left') {
        const endMs = clip.endMs ?? durationMs;
        lastMs = Math.max(0, Math.min(timeMs, endMs - 200));
      } else {
        const startMs = clip.startMs ?? 0;
        lastMs = Math.min(durationMs, Math.max(timeMs, startMs + 200));
      }
      setPreviewPct((lastMs / durationMs) * 100);
      setPreviewMs(lastMs);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setDragging(false);
      setPreviewPct(null);
      setPreviewMs(null);
      onTrimCommit(lastMs);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  const defaultPct = side === 'left'
    ? ((clip.startMs ?? 0) / durationMs) * 100
    : ((clip.endMs ?? durationMs) / durationMs) * 100;
  const pct = previewPct ?? defaultPct;

  return (
    <>
      {/* Dimmed region preview during drag */}
      {dragging && side === 'left' && (
        <div
          className="absolute top-0 bottom-0 left-0 bg-black/60 pointer-events-none z-[6] transition-[width] duration-75"
          style={{ width: `${pct}%` }}
        />
      )}
      {dragging && side === 'right' && (
        <div
          className="absolute top-0 bottom-0 right-0 bg-black/60 pointer-events-none z-[6] transition-[width] duration-75"
          style={{ width: `${100 - pct}%` }}
        />
      )}

      {/* Time tooltip during drag */}
      {dragging && previewMs !== null && (
        <div
          className="absolute -top-7 z-30 pointer-events-none transform -translate-x-1/2"
          style={{ left: `${pct}%` }}
        >
          <div className="rounded-md bg-[#a2dd00] px-1.5 py-0.5 text-[9px] font-bold text-[#1a2123] whitespace-nowrap shadow-lg">
            {formatTrimTime(previewMs)}
          </div>
        </div>
      )}

      {/* Handle bar */}
      <div
        data-clip-action
        className={`absolute top-0 bottom-0 w-8 cursor-col-resize flex items-center justify-center z-10 group ${
          side === 'left' ? '-left-1' : '-right-1'
        }`}
        style={
          previewPct != null
            ? {
                left: side === 'left' ? `calc(${pct}% - 16px)` : undefined,
                right: side === 'right' ? `calc(${100 - pct}% - 16px)` : undefined,
              }
            : undefined
        }
        onPointerDown={handlePointerDown}
      >
        <div
          className={`flex items-center justify-center rounded-md transition-all ${
            dragging
              ? 'w-2.5 h-full bg-[#a2dd00] shadow-[0_0_12px_rgba(162,221,0,0.7)]'
              : 'w-2 h-10 bg-[#a2dd00] shadow-[0_0_8px_rgba(162,221,0,0.5)] group-hover:h-12 group-hover:w-2.5 group-hover:shadow-[0_0_12px_rgba(162,221,0,0.7)]'
          }`}
        >
          <GripVertical className={`text-[#1a2123]/60 transition-opacity ${dragging ? 'h-3 w-3 opacity-100' : 'h-2.5 w-2.5 opacity-0 group-hover:opacity-100'}`} />
        </div>
      </div>
    </>
  );
}
