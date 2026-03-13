'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowUpRight,
  Download,
  ImagePlus,
  Info,
  Loader2,
  Sparkles,
  Video,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useEditor } from '@/lib/editor-context';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { listenGeneration } from '@/lib/sse';

// ─── types ────────────────────────────────────────────────────────────────────

type GenState = 'idle' | 'generating' | 'done';

const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const VIDEO_LOADING_MESSAGES = [
  'RENDERIZANDO FRAMES...',
  'PROCESSANDO CENAS...',
  'CALCULANDO MOVIMENTOS...',
  'SINCRONIZANDO ÁUDIO...',
  'APLICANDO FÍSICA AOS PIXELS...',
  'SONHANDO EM 60FPS...',
  'PEDINDO INSPIRAÇÃO AO UNIVERSO...',
  'ANIMANDO CADA DETALHE...',
  'CONVERTENDO TEXTO EM MOVIMENTO...',
  'AQUECENDO OS NEURÔNIOS VISUAIS...',
];

function durationToSeconds(d: string): number {
  return parseInt(d.replace('s', ''), 10);
}

function proportionToAspectRatio(p: string): string {
  const map: Record<string, string> = {
    '16-9': '16:9',
    '9-16': '9:16',
    '1-1': '1:1',
  };
  return map[p] ?? '16:9';
}

// ─── component ────────────────────────────────────────────────────────────────

interface GenerateVideoPanelProps {
  nodeId: string;
  onClose?: () => void;
}

export function GenerateVideoPanel({ nodeId, onClose }: GenerateVideoPanelProps) {
  const { setNodeImage, consumeCredits, refetchCredits } = useEditor();
  const { accessToken } = useAuth();

  const [prompt, setPrompt] = useState('');
  const [audio, setAudio] = useState(true);
  const [model, setModel] = useState('veo-3.1-generate-preview');
  const [duration, setDuration] = useState('6s');
  const [proportion, setProportion] = useState('16-9');
  const [resolution, setResolution] = useState('RES_1080P');
  const [refImages, setRefImages] = useState<{ base64: string; mime_type: string; preview: string }[]>([]);

  const [sampleCount, setSampleCount] = useState(1);

  // With references + 1080P/4K → only 8s allowed
  const forceEightSeconds =
    refImages.length > 0 && (resolution === 'RES_1080P' || resolution === 'RES_4K');
  const effectiveDuration = forceEightSeconds ? '8s' : duration;
  const videoType = refImages.length > 0 ? 'REFERENCE_VIDEO' as const : 'TEXT_TO_VIDEO' as const;

  const [genState, setGenState] = useState<GenState>('idle');

  const { data: estimate, isLoading: estimateLoading } = useQuery({
    queryKey: ['credits', 'estimate', videoType, resolution, effectiveDuration, audio],
    queryFn: () => api.credits.estimate(accessToken!, {
      type: videoType,
      resolution,
      durationSeconds: durationToSeconds(effectiveDuration),
      hasAudio: audio,
    }),
    enabled: !!accessToken && genState === 'idle',
    staleTime: 30_000,
  });
  const [progress, setProgress] = useState(0);
  const [videosVisible, setVideosVisible] = useState(false);
  const [generatedVideoUrls, setGeneratedVideoUrls] = useState<string[]>([]);
  const [selectedVideoIdx, setSelectedVideoIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState(VIDEO_LOADING_MESSAGES[0]);

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = 3 - refImages.length;
    files.slice(0, remaining).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setRefImages((prev) => [
          ...prev,
          { base64: dataUrl.split(',')[1], mime_type: file.type, preview: dataUrl },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  function clearProgressTimer() {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }

  function clearMsgTimer() {
    if (msgIntervalRef.current) {
      clearInterval(msgIntervalRef.current);
      msgIntervalRef.current = null;
    }
  }

  function clearPollTimer() {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }

  function clearSSE() {
    if (sseControllerRef.current) {
      sseControllerRef.current.abort();
      sseControllerRef.current = null;
    }
  }

  function startProgressAnimation() {
    let current = 0;
    progressIntervalRef.current = setInterval(() => {
      const remaining = 90 - current;
      const step = Math.max(0.2, Math.random() * (remaining * 0.03 + 0.3));
      current = Math.min(90, current + step);
      setProgress(Math.round(current));
    }, 800);

    let msgIndex = 0;
    setLoadingMsg(VIDEO_LOADING_MESSAGES[0]);
    msgIntervalRef.current = setInterval(() => {
      msgIndex = (msgIndex + 1) % VIDEO_LOADING_MESSAGES.length;
      setLoadingMsg(VIDEO_LOADING_MESSAGES[msgIndex]);
    }, 5000);
  }

  function finishWithVideos(urls: string[]) {
    clearProgressTimer();
    clearMsgTimer();
    setProgress(100);
    setTimeout(() => {
      setGenState('done');
      setGeneratedVideoUrls(urls);
      setSelectedVideoIdx(0);
      setNodeImage(nodeId, urls[0]);
      setTimeout(() => setVideosVisible(true), 60);
    }, 380);
  }

  function startPollingFallback(id: string) {
    pollIntervalRef.current = setInterval(async () => {
      try {
        const generation = await api.generations.get(accessToken!, id);

        if (generation.status === 'COMPLETED') {
          clearPollTimer();
          finishWithVideos(generation.outputs.map((o) => o.url));
          refetchCredits();
        }

        if (generation.status === 'FAILED') {
          clearPollTimer();
          clearProgressTimer();
          clearMsgTimer();
          setGenState('idle');
          setErrorMsg(generation.errorMessage ?? 'Erro ao gerar vídeo.');
          refetchCredits();
        }
      } catch {
        clearPollTimer();
        clearProgressTimer();
        setGenState('idle');
        setErrorMsg('Erro ao verificar status da geração.');
      }
    }, 3000);
  }

  async function handleGenerate() {
    if (!accessToken || !prompt.trim()) return;

    setGenState('generating');
    setProgress(0);
    setVideosVisible(false);
    setErrorMsg(null);
    clearProgressTimer();
    clearPollTimer();
    clearSSE();
    startProgressAnimation();

    const basePayload = {
      prompt,
      model,
      resolution,
      duration_seconds: durationToSeconds(effectiveDuration),
      aspect_ratio: proportionToAspectRatio(proportion),
      generate_audio: audio,
      sample_count: sampleCount,
      negative_prompt: 'blurry, low quality',
    };

    try {
      const { id, creditsConsumed } = refImages.length > 0
        ? await api.generations.videoWithReferences(accessToken, {
          ...basePayload,
          reference_images: refImages.map(({ base64, mime_type }) => ({
            base64,
            mime_type,
            reference_type: 'asset' as const,
          })),
        })
        : await api.generations.textToVideo(accessToken, basePayload);

      consumeCredits(creditsConsumed);

      sseControllerRef.current = listenGeneration(id, accessToken, {
        onCompleted: ({ outputUrls }) => {
          finishWithVideos(outputUrls);
          refetchCredits();
        },
        onFailed: ({ errorMessage, creditsRefunded }) => {
          clearProgressTimer();
          clearMsgTimer();
          setGenState('idle');
          const msg = errorMessage ?? 'Erro ao gerar vídeo.';
          setErrorMsg(creditsRefunded > 0 ? `${msg} (${creditsRefunded} créditos estornados)` : msg);
          refetchCredits();
        },
        onError: () => {
          startPollingFallback(id);
        },
      });
    } catch (err) {
      clearProgressTimer();
      clearMsgTimer();
      setGenState('idle');
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao iniciar geração.');
    }
  }

  function handleDiscard() {
    setGenState('idle');
    setProgress(0);
    setVideosVisible(false);
    setGeneratedVideoUrls([]);
    setSelectedVideoIdx(0);
    setErrorMsg(null);
    setRefImages([]);
  }

  useEffect(
    () => () => {
      clearProgressTimer();
      clearMsgTimer();
      clearPollTimer();
      clearSSE();
    },
    [],
  );

  const dashOffset = CIRCUMFERENCE * (1 - progress / 100);

  return (
    <div className="w-[320px] overflow-hidden rounded-2xl border border-[#f3f0ed]/8 bg-[#1a2123] shadow-2xl shadow-black/50">
      {/* Header — drag handle */}
      <div className="panel-drag-handle flex cursor-grab items-center justify-between border-b border-[#f3f0ed]/[0.07] px-4 py-3 active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-[#a2dd00]" />
          <span className="text-xs font-bold tracking-[0.15em] text-[#f3f0ed]/90">
            GERAR VÍDEO
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/8 hover:text-[#f3f0ed]/80"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-4 p-4">
        {/* Prompt */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
            PROMPT
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Descreva a cena que você imagina, com detalhes."
            className="w-full resize-none rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 px-3 py-2.5 text-sm text-[#f3f0ed]/90 placeholder-[#f3f0ed]/25 outline-none transition-all focus:border-[#a2dd00]/40 focus:bg-[#1e494b]/30"
          />
        </div>

        {/* Reference images */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
              IMAGENS DE REFERÊNCIA (opcional)
            </label>
            <span className="text-[10px] text-[#f3f0ed]/25">{refImages.length}/3</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {refImages.map((img, i) => (
              <div key={i} className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#f3f0ed]/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.preview} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => setRefImages((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            ))}
            {refImages.length < 3 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-[#f3f0ed]/10 text-[#f3f0ed]/25 transition-all hover:border-[#a2dd00]/40 hover:text-[#a2dd00]/60"
              >
                <ImagePlus className="h-5 w-5" />
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-400">
            {errorMsg}
          </div>
        )}

        {/* Generating state */}
        {genState === 'generating' && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-[#f3f0ed]/6 bg-[#1e494b]/10 py-8">
            <div className="relative flex items-center justify-center">
              <svg width="90" height="90" viewBox="0 0 90 90" className="-rotate-90">
                <circle
                  cx="45" cy="45" r={RADIUS}
                  fill="none" stroke="#f3f0ed" strokeOpacity={0.07} strokeWidth="4"
                />
                <circle
                  cx="45" cy="45" r={RADIUS}
                  fill="none" stroke="#a2dd00" strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  style={{ transition: 'stroke-dashoffset 0.18s ease-out' }}
                />
              </svg>
              <span className="absolute text-sm font-bold text-[#f3f0ed]/80">{progress}%</span>
            </div>
            <span className="text-[10px] animate-pulse font-bold tracking-[0.2em] text-[#f3f0ed]/30 transition-all duration-500">
              {loadingMsg}
            </span>
          </div>
        )}

        {/* Generated videos */}
        {genState === 'done' && generatedVideoUrls.length > 0 && (
          <div
            className="flex flex-col gap-2"
            style={{
              opacity: videosVisible ? 1 : 0,
              transform: videosVisible ? 'scale(1)' : 'scale(0.96)',
              transition: 'opacity 0.4s ease, transform 0.4s ease',
            }}
          >
            {/* Main player */}
            <div className="group relative overflow-hidden rounded-xl border border-[#f3f0ed]/8">
              <video
                key={generatedVideoUrls[selectedVideoIdx]}
                src={generatedVideoUrls[selectedVideoIdx]}
                controls
                preload="metadata"
                className="w-full rounded-xl bg-black"
              />
              <div className="pointer-events-none absolute inset-0 flex items-start justify-end gap-1.5 bg-linear-to-b from-black/50 via-transparent to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <div className="pointer-events-auto flex gap-1.5">
                  <ActionButton title="Abrir" onClick={() => window.open(generatedVideoUrls[selectedVideoIdx], '_blank')}>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </ActionButton>
                  <ActionButton title="Baixar" onClick={() => handleDownload(generatedVideoUrls[selectedVideoIdx])}>
                    <Download className="h-3.5 w-3.5" />
                  </ActionButton>
                  <ActionButton title="Descartar" onClick={handleDiscard}>
                    <X className="h-3.5 w-3.5" />
                  </ActionButton>
                </div>
              </div>
            </div>

            {/* Thumbnail strip — only when multiple videos */}
            {generatedVideoUrls.length > 1 && (
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${generatedVideoUrls.length}, 1fr)` }}>
                {generatedVideoUrls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedVideoIdx(i)}
                    className="group/thumb relative overflow-hidden rounded-lg aspect-video bg-black transition-all"
                    style={{
                      outline: i === selectedVideoIdx ? '2px solid #a2dd00' : '2px solid transparent',
                      outlineOffset: '1px',
                    }}
                  >
                    <video src={url} preload="metadata" muted className="h-full w-full object-cover" />
                    <div className="absolute bottom-1 right-1 rounded-md bg-black/70 px-1 py-0.5 text-[8px] font-bold text-white">
                      {i + 1}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Audio toggle */}
        <div className="flex items-center justify-between rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/10 px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-[#f3f0ed]/60">Áudio</span>
            <Info className="h-3 w-3 text-[#f3f0ed]/20" />
          </div>
          <ToggleSwitch checked={audio} onChange={setAudio} />
        </div>

        {/* Model + Resolution */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
              MODELO
            </label>
            <PanelSelect
              value={model}
              onValueChange={setModel}
              options={[
                { value: 'veo-3.1-fast-generate-preview', label: 'Veo 3.1' },
                // { value: 'veo-2.0-generate-001', label: 'Veo 2.0' },
                // { value: 'kling-2.6', label: 'Kling 2.6' },
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
              RESOLUÇÃO
            </label>
            <PanelSelect
              value={resolution}
              onValueChange={setResolution}
              options={[
                { value: 'RES_720P', label: '720p' },
                { value: 'RES_1080P', label: '1080p' },
                { value: 'RES_4K', label: '4K' },
              ]}
            />
          </div>
        </div>

        {/* Duration + Proportion */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
              DURAÇÃO
            </label>
            <div className="flex gap-1.5">
              {['4s', '6s', '8s'].map((d) => {
                const active = effectiveDuration === d;
                const disabled = forceEightSeconds && d !== '8s';
                return (
                  <button
                    key={d}
                    onClick={() => !disabled && setDuration(d)}
                    disabled={disabled}
                    title={disabled ? 'Apenas 8s disponível com referências em 1080p/4K' : undefined}
                    className="flex-1 rounded-xl py-2 text-[11px] font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                    style={{
                      background: active ? 'rgba(162,221,0,0.1)' : 'rgba(30,73,75,0.15)',
                      color: active ? '#a2dd00' : 'rgba(243,240,237,0.3)',
                      border: `1px solid ${active ? 'rgba(162,221,0,0.28)' : 'rgba(243,240,237,0.06)'}`,
                      boxShadow: active ? '0 0 12px rgba(162,221,0,0.08)' : 'none',
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
              PROPORÇÃO
            </label>
            <div className="flex gap-1.5">
              {['16:9', '9:16', '1:1'].map((p) => {
                const val = p.replace(':', '-');
                const active = proportion === val;
                return (
                  <button
                    key={p}
                    onClick={() => setProportion(val)}
                    className="flex-1 rounded-xl py-2 text-[11px] font-bold transition-all active:scale-95"
                    style={{
                      background: active ? 'rgba(162,221,0,0.1)' : 'rgba(30,73,75,0.15)',
                      color: active ? '#a2dd00' : 'rgba(243,240,237,0.3)',
                      border: `1px solid ${active ? 'rgba(162,221,0,0.28)' : 'rgba(243,240,237,0.06)'}`,
                      boxShadow: active ? '0 0 12px rgba(162,221,0,0.08)' : 'none',
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sample count */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
            QUANTIDADE
          </label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((n) => {
              const active = sampleCount === n;
              return (
                <button
                  key={n}
                  onClick={() => setSampleCount(n)}
                  className="flex-1 rounded-xl py-2 text-[11px] font-bold transition-all active:scale-95"
                  style={{
                    background: active ? 'rgba(162,221,0,0.1)' : 'rgba(30,73,75,0.15)',
                    color: active ? '#a2dd00' : 'rgba(243,240,237,0.3)',
                    border: `1px solid ${active ? 'rgba(162,221,0,0.28)' : 'rgba(243,240,237,0.06)'}`,
                    boxShadow: active ? '0 0 12px rgba(162,221,0,0.08)' : 'none',
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>

        {/* Credit estimate */}
        {genState !== 'generating' && (
          <div className="flex items-center justify-between rounded-xl border border-[#f3f0ed]/7 bg-[#f3f0ed]/3 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-[#a2dd00]" />
              <span className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/40 uppercase">Estimativa</span>
            </div>
            {estimateLoading ? (
              <div className="h-3.5 w-16 animate-pulse rounded bg-[#f3f0ed]/8" />
            ) : estimate ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#f3f0ed]/70">{estimate.creditsRequired} créditos</span>
                <div className={`h-1.5 w-1.5 rounded-full ${estimate.hasSufficientBalance ? 'bg-[#a2dd00]' : 'bg-red-400'}`} />
              </div>
            ) : null}
          </div>
        )}

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
              <Sparkles className="h-4 w-4" />
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
  a.download = 'geraew-video.mp4';
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

// ─── Toggle switch ────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative h-5 w-9 rounded-full transition-colors"
      style={{
        background: checked ? '#a2dd00' : 'rgba(243,240,237,0.12)',
      }}
    >
      <div
        className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform"
        style={{
          transform: checked ? 'translateX(17px)' : 'translateX(2px)',
        }}
      />
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
      <SelectTrigger className="h-9 w-full rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 px-3 text-xs text-[#f3f0ed]/80 outline-none transition-all focus:border-[#a2dd00]/40 focus:ring-0 data-placeholder:text-[#f3f0ed]/35 [&>svg]:text-[#f3f0ed]/30">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-xl border border-[#f3f0ed]/8 bg-[#1a2123] p-1 shadow-2xl shadow-black/60 backdrop-blur-md">
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
