'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowUpRight, Download, ImagePlus, Loader2, Sparkles, Wand2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useEditor } from '@/lib/editor-context';
import { useAuth } from '@/lib/auth-context';
import { api, AspectRatio } from '@/lib/api';

// ─── types ────────────────────────────────────────────────────────────────────

type GenState = 'idle' | 'generating' | 'done';

// SVG circle metrics
const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// ─── helpers ──────────────────────────────────────────────────────────────────

function qualityToResolution(q: string): 'RES_1K' | 'RES_2K' | 'RES_4K' {
  if (q === '4k') return 'RES_4K';
  if (q === 'hd') return 'RES_2K';
  return 'RES_1K';
}

function proportionToAspectRatio(p: string): AspectRatio {
  const map: Record<string, AspectRatio> = {
    '16-9': '16:9',
    '9-16': '9:16',
    '1-1': '1:1',
    '4-3': '4:3',
  };
  return map[p] ?? 'auto';
}

// ─── component ────────────────────────────────────────────────────────────────

interface GenerateImagePanelProps {
  nodeId: string;
  onClose?: () => void;
}

export function GenerateImagePanel({ nodeId, onClose }: GenerateImagePanelProps) {
  const { setNodeImage, nodeUpscaleStates, setNodeUpscaleState, consumeCredits, refetchCredits } =
    useEditor();
  const { accessToken } = useAuth();
  const upscaleState = nodeUpscaleStates[nodeId] ?? 'idle';

  const [prompt, setPrompt] = useState('');
  const [proportion, setProportion] = useState('16-9');
  const [quality, setQuality] = useState('4k');

  const [genState, setGenState] = useState<GenState>('idle');
  const [progress, setProgress] = useState(0);
  const [imageVisible, setImageVisible] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearProgressTimer() {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }

  function clearPollTimer() {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }

  function startProgressAnimation() {
    let current = 0;
    progressIntervalRef.current = setInterval(() => {
      const remaining = 90 - current;
      const step = Math.max(1, Math.random() * (remaining * 0.12 + 1));
      current = Math.min(90, current + step);
      setProgress(Math.round(current));
    }, 180);
  }

  function finishWithImage(url: string) {
    clearProgressTimer();
    setProgress(100);
    setTimeout(() => {
      setGenState('done');
      setGeneratedImageUrl(url);
      setNodeImage(nodeId, url);
      setTimeout(() => setImageVisible(true), 60);
    }, 380);
  }

  async function handleGenerate() {
    if (!accessToken) return;

    setGenState('generating');
    setProgress(0);
    setImageVisible(false);
    setErrorMsg(null);
    clearProgressTimer();
    clearPollTimer();
    startProgressAnimation();

    try {
      const { id, creditsConsumed } = await api.generations.textToImage(accessToken, {
        prompt,
        resolution: qualityToResolution(quality),
        aspectRatio: proportionToAspectRatio(proportion),
        imageModel: 'gemini-3.1-flash-image-preview',
      });

      consumeCredits(creditsConsumed);

      pollIntervalRef.current = setInterval(async () => {
        try {
          const generation = await api.generations.get(accessToken, id);

          if (generation.status === 'COMPLETED') {
            clearPollTimer();
            finishWithImage(generation.outputUrl!);
            refetchCredits();
          }

          if (generation.status === 'FAILED') {
            clearPollTimer();
            clearProgressTimer();
            setGenState('idle');
            setErrorMsg(generation.errorMessage ?? 'Erro ao gerar imagem.');
            refetchCredits();
          }
        } catch {
          clearPollTimer();
          clearProgressTimer();
          setGenState('idle');
          setErrorMsg('Erro ao verificar status da geração.');
        }
      }, 3000);
    } catch (err) {
      clearProgressTimer();
      setGenState('idle');
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao iniciar geração.');
    }
  }

  function handleDiscard() {
    setGenState('idle');
    setProgress(0);
    setImageVisible(false);
    setGeneratedImageUrl(null);
    setErrorMsg(null);
    setNodeUpscaleState(nodeId, 'idle');
  }

  useEffect(
    () => () => {
      clearProgressTimer();
      clearPollTimer();
    },
    [],
  );

  const dashOffset = CIRCUMFERENCE * (1 - progress / 100);

  return (
    <div className="w-[320px] overflow-hidden rounded-2xl border border-[#f3f0ed]/[0.08] bg-[#1a2123] shadow-2xl shadow-black/50">
      {/* Header — drag handle */}
      <div className="panel-drag-handle flex cursor-grab items-center justify-between border-b border-[#f3f0ed]/[0.07] px-4 py-3 active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#a2dd00]" />
          <span className="text-xs font-bold tracking-[0.15em] text-[#f3f0ed]/90">
            GERAR IMAGEM
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
        {/* Prompt */}
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="Descreva o que deseja gerar..."
          className="w-full resize-none rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 px-3 py-2.5 text-sm text-[#f3f0ed]/90 placeholder-[#f3f0ed]/25 outline-none transition-all focus:border-[#a2dd00]/40 focus:bg-[#1e494b]/30"
        />

        {/* ── Error message ────────────────────────────────────────────── */}
        {errorMsg && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-400">
            {errorMsg}
          </div>
        )}

        {/* ── Generation area ─────────────────────────────────────────── */}
        {genState === 'generating' && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-[#f3f0ed]/[0.06] bg-[#1e494b]/10 py-8">
            {/* Circular SVG progress */}
            <div className="relative flex items-center justify-center">
              <svg width="90" height="90" viewBox="0 0 90 90" className="-rotate-90">
                {/* Track */}
                <circle
                  cx="45"
                  cy="45"
                  r={RADIUS}
                  fill="none"
                  stroke="#f3f0ed"
                  strokeOpacity={0.07}
                  strokeWidth="4"
                />
                {/* Progress arc */}
                <circle
                  cx="45"
                  cy="45"
                  r={RADIUS}
                  fill="none"
                  stroke="#a2dd00"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  style={{ transition: 'stroke-dashoffset 0.18s ease-out' }}
                />
              </svg>
              {/* Percentage label */}
              <span className="absolute text-sm font-bold text-[#f3f0ed]/80">{progress}%</span>
            </div>

            <span className="text-[10px] font-bold tracking-[0.2em] text-[#f3f0ed]/30">
              CRIANDO IMAGEM...
            </span>
          </div>
        )}

        {/* ── Generated image ─────────────────────────────────────────── */}
        {genState === 'done' && generatedImageUrl && (
          <div
            className="group relative overflow-hidden rounded-xl border border-[#f3f0ed]/[0.08]"
            style={{
              opacity: imageVisible ? 1 : 0,
              transform: imageVisible ? 'scale(1)' : 'scale(0.96)',
              transition: 'opacity 0.4s ease, transform 0.4s ease',
            }}
          >
            {/* Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={generatedImageUrl}
              alt="Imagem gerada"
              className="h-auto w-full object-cover"
              draggable={false}
              style={{
                transition: 'filter 0.8s ease',
                filter:
                  upscaleState === 'done'
                    ? 'brightness(1.06) contrast(1.04) saturate(1.12)'
                    : 'none',
              }}
            />

            {/* Upscale done badge */}
            {upscaleState === 'done' && (
              <div className="absolute left-2 top-2 flex items-center justify-center rounded-full bg-[#a2dd00] px-2 py-0.5">
                <span className="text-[8px] font-black tracking-widest text-[#1a2123]">HD+</span>
              </div>
            )}

            {/* Overlay — visible on hover */}
            <div className="absolute inset-0 flex items-start justify-end gap-1.5 bg-gradient-to-b from-black/50 via-transparent to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              {/* Expand */}
              <ActionButton
                title="Expandir"
                onClick={() => window.open(generatedImageUrl, '_blank')}
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
              </ActionButton>

              {/* Download */}
              <ActionButton
                title="Baixar"
                onClick={() => handleDownload(generatedImageUrl)}
              >
                <Download className="h-3.5 w-3.5" />
              </ActionButton>

              {/* Discard */}
              <ActionButton title="Descartar" onClick={handleDiscard}>
                <X className="h-3.5 w-3.5" />
              </ActionButton>
            </div>
          </div>
        )}

        {/* ── Bottom section (proportion + quality + refs) ──────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
              PROPORÇÃO
            </label>
            <PanelSelect
              value={proportion}
              onValueChange={setProportion}
              options={[
                { value: '16-9', label: '16:9 Paisagem' },
                { value: '9-16', label: '9:16 Retrato' },
                { value: '1-1', label: '1:1 Quadrado' },
                { value: '4-3', label: '4:3' },
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
              QUALIDADE
            </label>
            <PanelSelect
              value={quality}
              onValueChange={setQuality}
              options={[
                { value: '4k', label: '4K (4096px)' },
                { value: 'hd', label: 'HD (1920px)' },
                { value: 'sd', label: 'SD (1024px)' },
              ]}
            />
          </div>
        </div>

        {/* References */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
              REFERÊNCIAS (OPCIONAL)
            </label>
            <span className="text-[10px] text-[#f3f0ed]/25">0/4</span>
          </div>
          <button className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-[#f3f0ed]/10 text-[#f3f0ed]/25 transition-all hover:border-[#a2dd00]/40 hover:text-[#a2dd00]/60">
            <ImagePlus className="h-5 w-5" />
          </button>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={genState === 'generating' || !prompt.trim()}
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
              <Wand2 className="h-4 w-4" />
              {genState === 'done' ? 'GERAR NOVAMENTE' : 'GERAR'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function handleDownload(url: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = 'geraew-ai.jpg';
  a.click();
}

function ActionButton({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a2123]/80 text-[#f3f0ed]/70 backdrop-blur-sm transition-all hover:bg-[#1e494b] hover:text-[#a2dd00]"
    >
      {children}
    </button>
  );
}

// ─── Select helper ────────────────────────────────────────────────────────────

function PanelSelect({
  value,
  onValueChange,
  options,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-9 w-full rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 px-3 text-xs text-[#f3f0ed]/80 outline-none transition-all focus:border-[#a2dd00]/40 focus:ring-0 data-[placeholder]:text-[#f3f0ed]/35 [&>svg]:text-[#f3f0ed]/30">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-xl border border-[#f3f0ed]/[0.08] bg-[#1a2123] p-1 shadow-2xl shadow-black/60 backdrop-blur-md">
        {options.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            className="cursor-pointer rounded-lg px-3 py-2 text-xs text-[#f3f0ed]/70 transition-all focus:bg-[#1e494b]/40 focus:text-[#f3f0ed] data-[state=checked]:text-[#a2dd00] [&>span:last-child>svg]:text-[#a2dd00]"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
