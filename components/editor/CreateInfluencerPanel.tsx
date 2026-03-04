'use client';

import { Loader2, Sparkles, User, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useEditor } from '@/lib/editor-context';

// ─── types ────────────────────────────────────────────────────────────────────

type GenState = 'idle' | 'generating' | 'done';

// SVG circle metrics
const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const MOCK_IMAGE = '/mulher_escrevendo_carta.png';

// ─── component ────────────────────────────────────────────────────────────────

interface CreateInfluencerPanelProps {
  nodeId: string;
  onClose?: () => void;
}

export function CreateInfluencerPanel({ nodeId, onClose }: CreateInfluencerPanelProps) {
  const { setNodeImage, consumeCredits } = useEditor();

  const [genState, setGenState] = useState<GenState>('idle');
  const [progress, setProgress] = useState(0);
  const [imageVisible, setImageVisible] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function handleGenerate() {
    consumeCredits(2);
    setGenState('generating');
    setProgress(0);
    setImageVisible(false);
    clearTimer();

    let current = 0;
    intervalRef.current = setInterval(() => {
      const remaining = 94 - current;
      const step = Math.max(1, Math.random() * (remaining * 0.12 + 1));
      current = Math.min(94, current + step);
      setProgress(Math.round(current));

      if (current >= 94) {
        clearTimer();
        setTimeout(() => {
          setProgress(100);
          setTimeout(() => {
            setGenState('done');
            setNodeImage(nodeId, MOCK_IMAGE);
            setTimeout(() => setImageVisible(true), 60);
          }, 380);
        }, 600);
      }
    }, 180);
  }

  useEffect(() => () => clearTimer(), []);

  const dashOffset = CIRCUMFERENCE * (1 - progress / 100);

  return (
    <div className="w-[320px] overflow-hidden rounded-2xl border border-[#f3f0ed]/[0.08] bg-[#1a2123] shadow-2xl shadow-black/50">
      {/* Header — drag handle */}
      <div className="panel-drag-handle flex cursor-grab items-center justify-between border-b border-[#f3f0ed]/[0.07] px-4 py-3 active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-[#a2dd00]" />
          <span className="text-xs font-bold tracking-[0.15em] text-[#f3f0ed]/90">
            AI INFLUENCER
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/[0.08] hover:text-[#f3f0ed]/80"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-4 p-4">
        {/* ── Idle state — empty placeholder ────────────────────────── */}
        {genState === 'idle' && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#f3f0ed]/10 bg-[#1e494b]/10 px-4 py-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3f0ed]/[0.05]">
              <User className="h-6 w-6 text-[#f3f0ed]/25" />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-[#f3f0ed]/60">
                Sua AI influencer mora aqui.
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-[#f3f0ed]/25">
                Desenhe e construa sua AI influencer do zero
              </p>
            </div>
          </div>
        )}

        {/* ── Generating state ──────────────────────────────────────── */}
        {genState === 'generating' && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-[#f3f0ed]/[0.06] bg-[#1e494b]/10 py-8">
            <div className="relative flex items-center justify-center">
              <svg width="90" height="90" viewBox="0 0 90 90" className="-rotate-90">
                <circle
                  cx="45" cy="45" r={RADIUS}
                  fill="none"
                  stroke="#f3f0ed"
                  strokeOpacity={0.07}
                  strokeWidth="4"
                />
                <circle
                  cx="45" cy="45" r={RADIUS}
                  fill="none"
                  stroke="#a2dd00"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  style={{ transition: 'stroke-dashoffset 0.18s ease-out' }}
                />
              </svg>
              <span className="absolute text-sm font-bold text-[#f3f0ed]/80">
                {progress}%
              </span>
            </div>
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#f3f0ed]/30">
              CRIANDO INFLUENCER...
            </span>
          </div>
        )}

        {/* ── Done state — generated preview ────────────────────────── */}
        {genState === 'done' && (
          <div
            className="group relative overflow-hidden rounded-xl border border-[#f3f0ed]/[0.08]"
            style={{
              opacity: imageVisible ? 1 : 0,
              transform: imageVisible ? 'scale(1)' : 'scale(0.96)',
              transition: 'opacity 0.4s ease, transform 0.4s ease',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={MOCK_IMAGE}
              alt="Influencer gerada"
              className="h-auto w-full object-cover"
              draggable={false}
            />
          </div>
        )}

        {/* ── Generate button ───────────────────────────────────────── */}
        <button
          onClick={handleGenerate}
          disabled={genState === 'generating'}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: genState === 'generating' ? 'rgba(162,221,0,0.12)' : '#a2dd00',
            color: genState === 'generating' ? '#a2dd00' : '#1a2123',
            border: genState === 'generating' ? '1px solid rgba(162,221,0,0.2)' : 'none',
          }}
        >
          {genState === 'generating' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              GERANDO...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {genState === 'done' ? 'GERAR NOVAMENTE' : 'GERAR INFLUENCER'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
