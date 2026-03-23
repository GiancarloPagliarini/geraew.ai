'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AudioWaveform,
  Coins,
  Download, Image,
  Video,
  Wand2,
  X
} from 'lucide-react';
import { PanelDuplicateButton } from './PanelDuplicateButton';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useEditor } from '@/lib/editor-context';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { listenGeneration } from '@/lib/sse';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { GenerationErrorBanner, showGenerationError } from './GenerationError';

// ─── types ────────────────────────────────────────────────────────────────────

type GenState = 'idle' | 'generating' | 'done';

const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const LOADING_MESSAGES = [
  'ANALISANDO MOVIMENTO...',
  'SUBSTITUINDO SUJEITO...',
  'RENDERIZANDO FRAMES...',
  'APLICANDO MOTION CONTROL...',
  'SINCRONIZANDO ANIMAÇÃO...',
  'PROCESSANDO VÍDEO...',
  'AQUECENDO OS NEURÔNIOS...',
  'QUASE PRONTO...',
];

const MAX_VIDEO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_DIMENSION = 1920;
const IMAGE_QUALITY = 0.85;

async function compressImage(dataUrl: string, mimeType: string): Promise<{ dataUrl: string; mimeType: string }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(w, h));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const outMime = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
      const compressed = canvas.toDataURL(outMime, IMAGE_QUALITY);
      resolve({ dataUrl: compressed, mimeType: outMime });
    };
    img.onerror = () => resolve({ dataUrl, mimeType });
    img.src = dataUrl;
  });
}

// ─── component ────────────────────────────────────────────────────────────────

interface MotionControlPanelProps {
  nodeId: string;
  onClose?: () => void;
  onDuplicate?: () => void;
}

export function MotionControlPanel({ nodeId, onClose, onDuplicate }: MotionControlPanelProps) {
  const { setNodeImage, consumeCredits, refetchCredits, prependToGallery } = useEditor();
  const { accessToken } = useAuth();

  // ── Persistent state ──────────────────────────────────────────────────────
  const storageKey = `geraew-panel-motion-control-${nodeId}`;
  const [stored] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const [resolution, setResolution] = useState<string>(stored?.resolution ?? '720p');
  const [videoDuration, setVideoDuration] = useState<number>(stored?.videoDuration ?? 5);
  const [videoFile, setVideoFile] = useState<{ base64: string; mime_type: string; name: string } | null>(stored?.videoFile ?? null);
  const [imageFile, setImageFile] = useState<{ base64: string; mime_type: string; preview: string } | null>(stored?.imageFile ?? null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(stored?.generatedVideoUrl ?? null);

  const [generationId, setGenerationId] = useState<string | null>(stored?.generationId ?? null);
  const [genState, setGenState] = useState<GenState>(
    stored?.genState === 'generating' && stored?.generationId
      ? 'generating'
      : stored?.generatedVideoUrl ? 'done' : 'idle'
  );

  const dbResolution = resolution === '1080p' ? 'RES_1080P' : 'RES_720P';
  const { data: estimate, isLoading: estimateLoading } = useQuery({
    queryKey: ['credits', 'estimate', 'MOTION_CONTROL', dbResolution, videoDuration],
    queryFn: () => api.credits.estimate(accessToken!, {
      type: 'MOTION_CONTROL',
      resolution: dbResolution,
      hasAudio: false,
      durationSeconds: videoDuration,
    }),
    enabled: !!accessToken && genState === 'idle',
    staleTime: 60_000,
  });

  const [progress, setProgress] = useState(0);
  const [videoVisible, setVideoVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Restore video display on mount
  useEffect(() => {
    if (stored?.generatedVideoUrl) {
      setNodeImage(nodeId, stored.generatedVideoUrl);
      setTimeout(() => setVideoVisible(true), 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resume in-progress generation on mount
  useEffect(() => {
    if (stored?.genState === 'generating' && stored?.generationId && accessToken) {
      startProgressAnimation(70);
      startPollingFallback(stored.generationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save state
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        resolution, videoDuration, generatedVideoUrl, generationId, genState, videoFile, imageFile,
      }));
    } catch {
      // Quota exceeded (large base64 data) — save without files
      localStorage.setItem(storageKey, JSON.stringify({
        resolution, videoDuration, generatedVideoUrl, generationId, genState,
      }));
    }
  }, [storageKey, resolution, videoDuration, generatedVideoUrl, generationId, genState, videoFile, imageFile]);

  // Document title
  useEffect(() => {
    if (genState === 'generating') {
      document.title = 'Geraew AI - Copiando movimentos';
    } else {
      document.title = 'Geraew AI';
    }
    return () => { document.title = 'Geraew AI'; };
  }, [genState]);

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseControllerRef = useRef<AbortController | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  function readVideoDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const vid = document.createElement('video');
      vid.preload = 'metadata';
      vid.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(Math.ceil(vid.duration) || 5);
      };
      vid.onerror = () => { URL.revokeObjectURL(url); resolve(5); };
      vid.src = url;
    });
  }

  function handleVideoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > MAX_VIDEO_SIZE) {
      toast.error('Vídeo deve ter no máximo 10MB.');
      return;
    }

    if (!file.type.startsWith('video/')) {
      toast.error('Formato de vídeo inválido.');
      return;
    }

    readVideoDuration(file).then(setVideoDuration);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      setVideoFile({ base64, mime_type: file.type, name: file.name });
      toast.success('Vídeo adicionado!');
    };
    reader.readAsDataURL(file);
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('Imagem deve ter no máximo 10MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Formato de imagem inválido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const rawDataUrl = ev.target?.result as string;
      const { dataUrl, mimeType } = await compressImage(rawDataUrl, file.type);
      setImageFile({ base64: dataUrl.split(',')[1], mime_type: mimeType, preview: dataUrl });
      toast.success('Imagem adicionada!');
    };
    reader.readAsDataURL(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
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

    const files = Array.from(e.dataTransfer.files);
    const videoF = files.find((f) => f.type.startsWith('video/'));
    const imageF = files.find((f) => f.type.startsWith('image/'));

    if (videoF && !videoFile) {
      if (videoF.size > MAX_VIDEO_SIZE) {
        toast.error('Vídeo deve ter no máximo 10MB.');
      } else {
        readVideoDuration(videoF).then(setVideoDuration);
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          setVideoFile({ base64: dataUrl.split(',')[1], mime_type: videoF.type, name: videoF.name });
          toast.success('Vídeo adicionado!');
        };
        reader.readAsDataURL(videoF);
      }
    }

    if (imageF && !imageFile) {
      if (imageF.size > MAX_IMAGE_SIZE) {
        toast.error('Imagem deve ter no máximo 10MB.');
      } else {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const rawDataUrl = ev.target?.result as string;
          const { dataUrl, mimeType } = await compressImage(rawDataUrl, imageF.type);
          setImageFile({ base64: dataUrl.split(',')[1], mime_type: mimeType, preview: dataUrl });
          toast.success('Imagem adicionada!');
        };
        reader.readAsDataURL(imageF);
      }
    }

    // Handle dragged image URL from gallery
    const imageUrl = e.dataTransfer.getData('text/geraew-image-url');
    if (imageUrl && !imageFile) {
      fetch(imageUrl).then((r) => r.blob()).then((blob) => {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const rawDataUrl = ev.target?.result as string;
          const rawMime = blob.type || 'image/jpeg';
          const { dataUrl, mimeType } = await compressImage(rawDataUrl, rawMime);
          setImageFile({ base64: dataUrl.split(',')[1], mime_type: mimeType, preview: dataUrl });
          toast.success('Imagem adicionada!');
        };
        reader.readAsDataURL(blob);
      }).catch(() => { });
    }
  }

  function clearProgressTimer() {
    if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null; }
  }
  function clearMsgTimer() {
    if (msgIntervalRef.current) { clearInterval(msgIntervalRef.current); msgIntervalRef.current = null; }
  }
  function clearPollTimer() {
    if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; }
  }
  function clearSSE() {
    if (sseControllerRef.current) { sseControllerRef.current.abort(); sseControllerRef.current = null; }
  }

  function startProgressAnimation(from = 0) {
    let current = from;
    setProgress(from);
    progressIntervalRef.current = setInterval(() => {
      const remaining = 90 - current;
      const step = Math.max(0.2, Math.random() * (remaining * 0.03 + 0.3));
      current = Math.min(90, current + step);
      setProgress(Math.round(current));
    }, 800);

    let msgIndex = 0;
    setLoadingMsg(LOADING_MESSAGES[0]);
    msgIntervalRef.current = setInterval(() => {
      msgIndex = (msgIndex + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[msgIndex]);
    }, 5000);
  }

  function finishWithVideo(url: string) {
    clearProgressTimer();
    clearMsgTimer();
    setProgress(100);
    setTimeout(() => {
      setGenState('done');
      setGeneratedVideoUrl(url);
      setNodeImage(nodeId, url);
      setTimeout(() => setVideoVisible(true), 60);
    }, 380);
  }

  function startPollingFallback(id: string) {
    pollIntervalRef.current = setInterval(async () => {
      try {
        const generation = await api.generations.get(accessToken!, id);
        if (generation.status === 'COMPLETED') {
          clearPollTimer();
          finishWithVideo(generation.outputs[0]?.url);
          refetchCredits();
          prependToGallery(generation);
        }
        if (generation.status === 'FAILED') {
          clearPollTimer();
          clearProgressTimer();
          clearMsgTimer();
          setGenState('idle');
          setErrorMsg(showGenerationError({ errorMessage: generation.errorMessage, fallback: 'Erro ao gerar vídeo.' }));
          refetchCredits();
        }
      } catch {
        clearPollTimer();
        clearProgressTimer();
        setGenState('idle');
        setErrorMsg(showGenerationError({ fallback: 'Erro ao verificar status da geração.' }));
      }
    }, 3000);
  }

  async function handleGenerate() {
    if (!accessToken || !videoFile || !imageFile) return;

    setGenState('generating');
    setProgress(0);
    setVideoVisible(false);
    setErrorMsg(null);
    clearProgressTimer();
    clearPollTimer();
    clearSSE();

    startProgressAnimation();

    try {
      const result = await api.generations.motionControl(accessToken, {
        video: videoFile.base64,
        video_mime_type: videoFile.mime_type as 'video/mp4',
        image: imageFile.base64,
        image_mime_type: imageFile.mime_type as 'image/jpeg',
        resolution: resolution as '720p' | '1080p',
      });

      const { id, creditsConsumed } = result;
      consumeCredits(creditsConsumed);
      setGenerationId(id);

      sseControllerRef.current = listenGeneration(id, accessToken, {
        onCompleted: ({ generationId: gId, outputUrls }) => {
          finishWithVideo(outputUrls[0]);
          refetchCredits();
          api.generations.get(accessToken!, gId).then(prependToGallery).catch(() => { });
        },
        onFailed: ({ errorMessage, creditsRefunded }) => {
          clearProgressTimer();
          clearMsgTimer();
          setGenState('idle');
          setErrorMsg(showGenerationError({ errorMessage, creditsRefunded, fallback: 'Erro ao gerar vídeo.' }));
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
      setErrorMsg(showGenerationError({ errorMessage: err instanceof Error ? err.message : null, fallback: 'Erro ao iniciar geração.' }));
    }
  }

  function handleDiscard() {
    setGenState('idle');
    setProgress(0);
    setVideoVisible(false);
    setGeneratedVideoUrl(null);
    setGenerationId(null);
    setErrorMsg(null);
    setVideoFile(null);
    setImageFile(null);
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

  // Block wheel events from reaching ReactFlow
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const onWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') { e.stopPropagation(); return; }
      const scrollable = target.closest('.sidebar-scroll');
      if (scrollable) { e.stopPropagation(); e.stopImmediatePropagation(); }
    };
    panel.addEventListener('wheel', onWheel, { capture: true });
    return () => panel.removeEventListener('wheel', onWheel, { capture: true });
  }, []);

  const dashOffset = CIRCUMFERENCE * (1 - progress / 100);

  return (
    <TooltipProvider>
      <div
        ref={panelRef}
        className={`w-[320px] overflow-hidden rounded-2xl border bg-[#1a2123] shadow-2xl shadow-black/50 transition-colors ${isDraggingOver ? 'border-[#a2dd00]/50 ring-2 ring-[#a2dd00]/30' : 'border-[#f3f0ed]/8'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="panel-drag-handle flex cursor-grab items-center justify-between border-b border-[#f3f0ed]/[0.07] px-4 py-3 active:cursor-grabbing">
          <div className="flex items-center gap-2">
            <AudioWaveform className="h-4 w-4 text-[#a2dd00]" />
            <span className="text-xs font-bold tracking-[0.15em] text-[#f3f0ed]/90">
              COPIAR MOVIMENTOS
            </span>
          </div>
          <div className="flex items-center gap-1">
            <PanelDuplicateButton onClick={onDuplicate} />
            <button
              onClick={() => { localStorage.removeItem(storageKey); onClose?.(); }}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/8 hover:text-[#f3f0ed]/80"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {/* ── GENERATING STATE ──────────────────────────────── */}
          {genState === 'generating' && (
            <div className="flex flex-col items-center gap-5 py-8">
              <div className="relative flex h-24 w-24 items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r={RADIUS} fill="none" stroke="rgba(162,221,0,0.10)" strokeWidth="5" />
                  <circle
                    cx="40" cy="40" r={RADIUS} fill="none" stroke="#a2dd00" strokeWidth="5"
                    strokeDasharray={CIRCUMFERENCE} strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    className="transition-[stroke-dashoffset] duration-700 ease-out"
                  />
                </svg>
                <span className="text-lg font-bold text-[#a2dd00]">{progress}%</span>
              </div>
              <p className="animate-pulse text-[10px] font-bold tracking-[0.2em] text-[#f3f0ed]/30">{loadingMsg}</p>
            </div>
          )}

          {/* ── DONE STATE ───────────────────────────────────── */}
          {genState === 'done' && generatedVideoUrl && (
            <div className="space-y-3">
              <div
                className="overflow-hidden rounded-xl border border-[#f3f0ed]/[0.08] transition-all duration-500"
                style={{ opacity: videoVisible ? 1 : 0, transform: videoVisible ? 'scale(1)' : 'scale(0.95)' }}
              >
                <video
                  src={generatedVideoUrl}
                  className="w-full"
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              </div>

              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={generatedVideoUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-[#f3f0ed]/[0.08] bg-[#1e494b]/20 text-xs font-semibold text-[#f3f0ed]/60 transition-all hover:border-[#a2dd00]/30 hover:text-[#a2dd00]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={4}>Baixar vídeo</TooltipContent>
                </Tooltip>
              </div>

              <button
                onClick={handleDiscard}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-[#f3f0ed]/[0.06] text-xs font-semibold text-[#f3f0ed]/40 transition-all hover:border-[#f3f0ed]/15 hover:text-[#f3f0ed]/70"
              >
                Gerar outro
              </button>
            </div>
          )}

          {/* ── IDLE STATE (form) ────────────────────────────── */}
          {genState === 'idle' && (
            <>
              {/* Video upload */}
              <div>
                <label className="mb-1.5 block text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/40">
                  VÍDEO DE REFERÊNCIA
                </label>
                {videoFile ? (
                  <div className="flex items-center gap-2 rounded-xl border border-[#f3f0ed]/[0.08] bg-[#1e494b]/15 px-3 py-2.5">
                    <Video className="h-4 w-4 shrink-0 text-[#a2dd00]" />
                    <span className="flex-1 truncate text-xs text-[#f3f0ed]/70">{videoFile.name}</span>
                    <button
                      onClick={() => setVideoFile(null)}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#f3f0ed]/30 hover:bg-[#f3f0ed]/10 hover:text-[#f3f0ed]/70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => videoInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#f3f0ed]/[0.12] bg-[#1e494b]/10 px-3 py-4 text-xs text-[#f3f0ed]/40 transition-all hover:border-[#a2dd00]/30 hover:text-[#a2dd00]/70"
                  >
                    <Video className="h-4 w-4" />
                    Clique ou arraste um vídeo (max 10MB)
                  </button>
                )}
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-matroska"
                  className="hidden"
                  onChange={handleVideoSelect}
                />
              </div>

              {/* Image upload */}
              <div>
                <label className="mb-1.5 block text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/40">
                  IMAGEM DE SUBSTITUIÇÃO
                </label>
                {imageFile ? (
                  <div className="relative overflow-hidden rounded-xl border border-[#f3f0ed]/[0.08]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageFile.preview} alt="Preview" className="h-32 w-full object-cover" />
                    <button
                      onClick={() => setImageFile(null)}
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-[#f3f0ed]/70 hover:text-[#f3f0ed]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#f3f0ed]/[0.12] bg-[#1e494b]/10 px-3 py-4 text-xs text-[#f3f0ed]/40 transition-all hover:border-[#a2dd00]/30 hover:text-[#a2dd00]/70"
                  >
                    <Image className="h-4 w-4" />
                    Clique ou arraste uma imagem (max 10MB)
                  </button>
                )}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageSelect}
                />
              </div>

              {/* Resolution */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
                  RESOLUÇÃO
                </label>
                <Select value={resolution} onValueChange={setResolution}>
                  <SelectTrigger className="h-9 w-full rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 px-3 text-xs text-[#f3f0ed]/80 outline-none transition-all focus:border-[#a2dd00]/40 focus:ring-0 data-placeholder:text-[#f3f0ed]/35 [&>svg]:text-[#f3f0ed]/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-[#f3f0ed]/8 bg-[#1a2123] p-1 shadow-2xl shadow-black/60 backdrop-blur-md">
                    <SelectItem value="720p" className="cursor-pointer rounded-lg px-3 py-2 text-xs text-[#f3f0ed]/70 transition-all focus:bg-[#1e494b]/40 focus:text-[#f3f0ed] data-[state=checked]:text-[#a2dd00] [&>span:last-child>svg]:text-[#a2dd00]">720p</SelectItem>
                    <SelectItem value="1080p" className="cursor-pointer rounded-lg px-3 py-2 text-xs text-[#f3f0ed]/70 transition-all focus:bg-[#1e494b]/40 focus:text-[#f3f0ed] data-[state=checked]:text-[#a2dd00] [&>span:last-child>svg]:text-[#a2dd00]">1080p</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Error message */}
              <GenerationErrorBanner msg={errorMsg} />

              {/* Credit estimate */}
              <div className="flex flex-col gap-1.5 rounded-xl border border-[#f3f0ed]/7 bg-[#f3f0ed]/3 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Coins className="h-3 w-3 text-[#a2dd00]" />
                    <span className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/40 uppercase">
                      Custo estimado
                    </span>
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
                {videoFile && (
                  <p className="text-[10px] text-[#f3f0ed]/30">
                    {videoDuration}s × {resolution === '1080p' ? '10' : '7'} créditos/s
                  </p>
                )}
              </div>

              {/* Generate button */}
              <button
                disabled={!videoFile || !imageFile}
                onClick={handleGenerate}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background: '#a2dd00',
                  color: '#1a2123',
                }}
              >
                <Wand2 className="h-4 w-4" />
                GERAR
              </button>

              <p className="text-center text-[10px] text-[#f3f0ed]/25">
                Copia os movimentos do vídeo para a imagem fornecida
              </p>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
