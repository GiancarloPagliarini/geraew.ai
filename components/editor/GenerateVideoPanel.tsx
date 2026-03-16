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
  Coins,
  Download,
  ImagePlus,
  Images,
  Info,
  Loader2,
  Sparkles,
  Video,
  Wand2,
  X
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
  const { setNodeImage, consumeCredits, refetchCredits, prependToGallery, openGalleryPicker } = useEditor();
  const { accessToken } = useAuth();

  // ── Persistent state (survives page reload) ──────────────────────────────
  const storageKey = `geraew-panel-video-${nodeId}`;
  const [stored] = useState(() => {
    try {
      const raw = localStorage.getItem(`geraew-panel-video-${nodeId}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const [prompt, setPrompt] = useState<string>(stored?.prompt ?? '');
  const [audio, setAudio] = useState<boolean>(stored?.audio ?? true);
  const [model, setModel] = useState<string>(stored?.model ?? 'veo-3.1-generate-preview');
  const [duration, setDuration] = useState<string>(stored?.duration ?? '8s');
  const [proportion, setProportion] = useState<string>(stored?.proportion ?? '9-16');
  const [resolution, setResolution] = useState<string>(stored?.resolution ?? 'RES_1080P');
  const [sampleCount, setSampleCount] = useState<number>(stored?.sampleCount ?? 1);
  const [generatedVideoUrls, setGeneratedVideoUrls] = useState<string[]>(stored?.generatedVideoUrls ?? []);

  const [videoMode, setVideoMode] = useState<'text' | 'image'>(stored?.videoMode ?? 'text');
  const [refImages, setRefImages] = useState<{ base64: string; mime_type: string; preview: string }[]>([]);
  const [firstFrame, setFirstFrame] = useState<{ base64: string; mime_type: string; preview: string } | null>(null);
  const [lastFrame, setLastFrame] = useState<{ base64: string; mime_type: string; preview: string } | null>(null);
  const [enhancePrompt, setEnhancePrompt] = useState(stored?.enhancePrompt ?? false);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // With references + 1080P/4K → only 8s allowed
  const forceEightSeconds =
    refImages.length > 0 && (resolution === 'RES_1080P' || resolution === 'RES_4K');
  const effectiveDuration = forceEightSeconds ? '8s' : duration;
  const videoType = videoMode === 'image'
    ? 'IMAGE_TO_VIDEO' as const
    : refImages.length > 0
      ? 'REFERENCE_VIDEO' as const
      : 'TEXT_TO_VIDEO' as const;

  const [genState, setGenState] = useState<GenState>(stored?.generatedVideoUrls?.length > 0 ? 'done' : 'idle');

  const { data: estimate, isLoading: estimateLoading } = useQuery({
    queryKey: ['credits', 'estimate', videoType, resolution, effectiveDuration, audio, sampleCount],
    queryFn: () => api.credits.estimate(accessToken!, {
      type: videoType,
      resolution,
      durationSeconds: durationToSeconds(effectiveDuration),
      hasAudio: audio,
      sampleCount,
    }),
    enabled: !!accessToken && genState === 'idle',
    staleTime: 30_000,
  });
  const [progress, setProgress] = useState(0);
  const [videosVisible, setVideosVisible] = useState(false);
  const [selectedVideoIdx, setSelectedVideoIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState(VIDEO_LOADING_MESSAGES[0]);

  // Restore video display on mount
  useEffect(() => {
    if (stored?.generatedVideoUrls?.length > 0) {
      setNodeImage(nodeId, stored.generatedVideoUrls[0]);
      setTimeout(() => setVideosVisible(true), 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save form + result state whenever they change
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({
      prompt, audio, model, duration, proportion, resolution, sampleCount, generatedVideoUrls, enhancePrompt, videoMode,
    }));
  }, [storageKey, prompt, audio, model, duration, proportion, resolution, sampleCount, generatedVideoUrls, enhancePrompt, videoMode]);

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseControllerRef = useRef<AbortController | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const firstFrameInputRef = useRef<HTMLInputElement | null>(null);
  const lastFrameInputRef = useRef<HTMLInputElement | null>(null);

  function processFiles(files: File[]) {
    const remaining = 3 - refImages.length;
    files.filter((f) => f.type.startsWith('image/')).slice(0, remaining).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setRefImages((prev) => [...prev, { base64: dataUrl.split(',')[1], mime_type: file.type, preview: dataUrl }]);
      };
      reader.readAsDataURL(file);
    });
  }

  function processFrameFile(file: File, setter: (frame: { base64: string; mime_type: string; preview: string }) => void) {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setter({ base64: dataUrl.split(',')[1], mime_type: file.type, preview: dataUrl });
    };
    reader.readAsDataURL(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    processFiles(Array.from(e.target.files ?? []));
    e.target.value = '';
  }

  const [isDraggingOver, setIsDraggingOver] = useState(false);

  async function addImageFromUrl(url: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const mime_type = blob.type || 'image/png';
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const base64 = dataUrl.split(',')[1];
        setRefImages((prev) => {
          if (prev.length >= 3) return prev;
          return [...prev, { base64, mime_type, preview: dataUrl }];
        });
      };
      reader.readAsDataURL(blob);
    } catch {
      // silently fail
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (videoMode === 'image') {
      if (!firstFrame || !lastFrame) setIsDraggingOver(true);
    } else {
      if (refImages.length < 3) setIsDraggingOver(true);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (videoMode === 'image') {
      const targetSetter = !firstFrame ? setFirstFrame : !lastFrame ? setLastFrame : null;
      if (!targetSetter) return;

      const imageUrl = e.dataTransfer.getData('text/geraew-image-url');
      if (imageUrl) {
        fetch(imageUrl).then((r) => r.blob()).then((blob) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            targetSetter({ base64: dataUrl.split(',')[1], mime_type: blob.type || 'image/jpeg', preview: dataUrl });
          };
          reader.readAsDataURL(blob);
        }).catch(() => {});
        return;
      }

      const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
      if (file) processFrameFile(file, targetSetter);
      return;
    }

    // Text mode — existing behavior
    const imageUrl = e.dataTransfer.getData('text/geraew-image-url');
    if (imageUrl) {
      addImageFromUrl(imageUrl);
      return;
    }

    processFiles(Array.from(e.dataTransfer.files));
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
          prependToGallery(generation);
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
    if (videoMode === 'image' && !firstFrame) return;

    setGenState('generating');
    setProgress(0);
    setVideosVisible(false);
    setErrorMsg(null);
    clearProgressTimer();
    clearPollTimer();
    clearSSE();

    let finalPrompt = prompt;

    if (enhancePrompt && prompt.trim()) {
      setIsEnhancing(true);
      try {
        const { enhancedPrompt: enhanced } = await api.promptEnhancer.enhance(accessToken, prompt);
        finalPrompt = enhanced;
        setPrompt(enhanced);
      } catch {
        // If enhancement fails, continue with original prompt
      } finally {
        setIsEnhancing(false);
      }
    }

    startProgressAnimation();

    const basePayload = {
      prompt: finalPrompt,
      model,
      resolution,
      duration_seconds: durationToSeconds(effectiveDuration),
      aspect_ratio: proportionToAspectRatio(proportion),
      generate_audio: audio,
      sample_count: sampleCount,
      negative_prompt: 'blurry, low quality',
    };

    try {
      let result: { id: string; creditsConsumed: number };

      if (videoMode === 'image' && firstFrame) {
        result = await api.generations.imageToVideo(accessToken, {
          ...basePayload,
          first_frame: firstFrame.base64,
          first_frame_mime_type: firstFrame.mime_type,
          ...(lastFrame ? {
            last_frame: lastFrame.base64,
            last_frame_mime_type: lastFrame.mime_type,
          } : {}),
        });
      } else if (refImages.length > 0) {
        result = await api.generations.videoWithReferences(accessToken, {
          ...basePayload,
          reference_images: refImages.map(({ base64, mime_type }) => ({
            base64,
            mime_type,
            reference_type: 'asset' as const,
          })),
        });
      } else {
        result = await api.generations.textToVideo(accessToken, basePayload);
      }

      const { id, creditsConsumed } = result;

      consumeCredits(creditsConsumed);

      sseControllerRef.current = listenGeneration(id, accessToken, {
        onCompleted: ({ generationId, outputUrls }) => {
          finishWithVideos(outputUrls);
          refetchCredits();
          api.generations.get(accessToken!, generationId).then(prependToGallery).catch(() => { });
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
    setFirstFrame(null);
    setLastFrame(null);
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

  // Block wheel events from reaching ReactFlow when scrolling inside form fields or scrollable areas
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const onWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') {
        e.stopPropagation();
        return;
      }
      const scrollable = target.closest('.sidebar-scroll');
      if (scrollable) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };
    panel.addEventListener('wheel', onWheel, { capture: true });
    return () => panel.removeEventListener('wheel', onWheel, { capture: true });
  }, []);

  const dashOffset = CIRCUMFERENCE * (1 - progress / 100);

  return (
    <div
      ref={panelRef}
      className={`w-[320px] overflow-hidden rounded-2xl border bg-[#1a2123] shadow-2xl shadow-black/50 transition-colors ${isDraggingOver ? 'border-[#a2dd00]/50 ring-2 ring-[#a2dd00]/30' : 'border-[#f3f0ed]/8'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header — drag handle */}
      <div className="panel-drag-handle flex cursor-grab items-center justify-between border-b border-[#f3f0ed]/[0.07] px-4 py-3 active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-[#a2dd00]" />
          <span className="text-xs font-bold tracking-[0.15em] text-[#f3f0ed]/90">
            GERAR VÍDEO
          </span>
        </div>
        <button
          onClick={() => { localStorage.removeItem(storageKey); onClose?.(); }}
          className="flex h-6 w-6 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/8 hover:text-[#f3f0ed]/80"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-4 p-4">
        {/* Mode selector */}
        <div className="flex gap-1.5">
          {([['text', 'Texto → Vídeo'], ['image', 'Imagem → Vídeo']] as const).map(([mode, label]) => {
            const active = videoMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setVideoMode(mode)}
                className="flex-1 rounded-xl py-2 text-[11px] font-bold transition-all active:scale-95"
                style={{
                  background: active ? 'rgba(162,221,0,0.1)' : 'rgba(30,73,75,0.15)',
                  color: active ? '#a2dd00' : 'rgba(243,240,237,0.3)',
                  border: `1px solid ${active ? 'rgba(162,221,0,0.28)' : 'rgba(243,240,237,0.06)'}`,
                  boxShadow: active ? '0 0 12px rgba(162,221,0,0.08)' : 'none',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

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

          {/* Enhance prompt toggle */}
          <button
            onClick={() => setEnhancePrompt(!enhancePrompt)}
            className="flex w-full items-center justify-between rounded-xl border px-3 py-2 transition-all"
            style={{
              background: enhancePrompt ? 'rgba(162,221,0,0.06)' : 'transparent',
              borderColor: enhancePrompt ? 'rgba(162,221,0,0.2)' : 'rgba(243,240,237,0.07)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <Wand2 className="h-3 w-3" style={{ color: enhancePrompt ? '#a2dd00' : 'rgba(243,240,237,0.3)' }} />
              <span className="text-[10px] font-bold tracking-[0.12em]" style={{ color: enhancePrompt ? '#a2dd00' : 'rgba(243,240,237,0.4)' }}>
                {isEnhancing ? 'MELHORANDO...' : 'MELHORAR PROMPT'}
              </span>
              {isEnhancing && <Loader2 className="h-3 w-3 animate-spin text-[#a2dd00]" />}
            </div>
            <div
              className="relative h-4 w-7 rounded-full transition-colors"
              style={{ background: enhancePrompt ? '#a2dd00' : 'rgba(243,240,237,0.12)' }}
            >
              <div
                className="absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform"
                style={{ transform: enhancePrompt ? 'translateX(13px)' : 'translateX(2px)' }}
              />
            </div>
          </button>
        </div>

        {/* Reference images (text mode) */}
        {videoMode === 'text' && (
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
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    title="Enviar do dispositivo"
                    className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-[#f3f0ed]/10 text-[#f3f0ed]/25 transition-all hover:border-[#a2dd00]/40 hover:text-[#a2dd00]/60"
                  >
                    <ImagePlus className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => openGalleryPicker({ nodeId, remaining: 3 - refImages.length, onSelect: (url) => addImageFromUrl(url) })}
                    title="Escolher da galeria"
                    className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-[#f3f0ed]/10 text-[#f3f0ed]/25 transition-all hover:border-[#a2dd00]/40 hover:text-[#a2dd00]/60"
                  >
                    <Images className="h-5 w-5" />
                  </button>
                </>
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
        )}

        {/* First / Last frame (image mode) */}
        {videoMode === 'image' && (
          <div className="space-y-3">
            {/* First frame — required */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
                PRIMEIRO FRAME <span className="text-red-400/60">*</span>
              </label>
              {firstFrame ? (
                <div className="group relative h-20 w-full overflow-hidden rounded-xl border border-[#f3f0ed]/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={firstFrame.preview} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => setFirstFrame(null)}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => firstFrameInputRef.current?.click()}
                    className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-[#f3f0ed]/10 text-[#f3f0ed]/25 transition-all hover:border-[#a2dd00]/40 hover:text-[#a2dd00]/60"
                  >
                    <ImagePlus className="h-4 w-4" />
                    <span className="text-[10px] font-bold tracking-wider">ENVIAR</span>
                  </button>
                  <button
                    onClick={() => {
                      const targetSetter = !firstFrame ? setFirstFrame : setLastFrame;
                      openGalleryPicker({
                        nodeId,
                        remaining: 1,
                        onSelect: (url) => {
                          fetch(url).then((r) => r.blob()).then((blob) => {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const dataUrl = ev.target?.result as string;
                              targetSetter({ base64: dataUrl.split(',')[1], mime_type: blob.type || 'image/jpeg', preview: dataUrl });
                            };
                            reader.readAsDataURL(blob);
                          }).catch(() => {});
                        },
                      });
                    }}
                    className="flex h-14 items-center justify-center gap-2 rounded-xl border border-dashed border-[#f3f0ed]/10 px-4 text-[#f3f0ed]/25 transition-all hover:border-[#a2dd00]/40 hover:text-[#a2dd00]/60"
                  >
                    <Images className="h-4 w-4" />
                  </button>
                </div>
              )}
              <input
                ref={firstFrameInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processFrameFile(file, setFirstFrame);
                  e.target.value = '';
                }}
              />
            </div>

            {/* Last frame — optional */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
                ÚLTIMO FRAME <span className="text-[#f3f0ed]/20">(opcional)</span>
              </label>
              {lastFrame ? (
                <div className="group relative h-20 w-full overflow-hidden rounded-xl border border-[#f3f0ed]/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={lastFrame.preview} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => setLastFrame(null)}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => lastFrameInputRef.current?.click()}
                    className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-[#f3f0ed]/10 text-[#f3f0ed]/25 transition-all hover:border-[#a2dd00]/40 hover:text-[#a2dd00]/60"
                  >
                    <ImagePlus className="h-4 w-4" />
                    <span className="text-[10px] font-bold tracking-wider">ENVIAR</span>
                  </button>
                  <button
                    onClick={() => {
                      openGalleryPicker({
                        nodeId,
                        remaining: 1,
                        onSelect: (url) => {
                          fetch(url).then((r) => r.blob()).then((blob) => {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const dataUrl = ev.target?.result as string;
                              setLastFrame({ base64: dataUrl.split(',')[1], mime_type: blob.type || 'image/jpeg', preview: dataUrl });
                            };
                            reader.readAsDataURL(blob);
                          }).catch(() => {});
                        },
                      });
                    }}
                    className="flex h-14 items-center justify-center gap-2 rounded-xl border border-dashed border-[#f3f0ed]/10 px-4 text-[#f3f0ed]/25 transition-all hover:border-[#a2dd00]/40 hover:text-[#a2dd00]/60"
                  >
                    <Images className="h-4 w-4" />
                  </button>
                </div>
              )}
              <input
                ref={lastFrameInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processFrameFile(file, setLastFrame);
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        )}

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
                { value: 'veo-3.1-generate-preview', label: 'Veo 3.1' },
                { value: 'veo-3.1-fast-generate-preview', label: 'Veo 3.1 Fast' },
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
              <Coins className="h-3 w-3 text-[#a2dd00]" />
              <span className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/40 uppercase">Custo</span>
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
          disabled={genState === 'generating' || !prompt.trim() || (videoMode === 'image' && !firstFrame)}
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

async function handleDownload(url: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = 'geraew-video.mp4';
    a.click();
    URL.revokeObjectURL(objectUrl);
  } catch {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'geraew-video.mp4';
    a.click();
  }
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
