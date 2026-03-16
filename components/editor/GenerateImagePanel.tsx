'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowUpRight, Coins, Download, FolderOpen, Image, ImagePlus, Loader2, Sparkles, Wand2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useEditor } from '@/lib/editor-context';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { listenGeneration } from '@/lib/sse';
import { toast } from 'sonner';

// ─── types ────────────────────────────────────────────────────────────────────

type GenState = 'idle' | 'generating' | 'done';

// SVG circle metrics
const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// ─── loading messages ─────────────────────────────────────────────────────────

const LOADING_MESSAGES = [
  'CONSULTANDO OS PIXELS...',
  'ENSINANDO A IA A PINTAR...',
  'MISTURANDO CORES DIGITAIS...',
  'PEDINDO INSPIRAÇÃO AO UNIVERSO...',
  'AQUECENDO OS NEURÔNIOS...',
  'INVOCANDO O ARTISTA INTERIOR...',
  'CALCULANDO CRIATIVIDADE...',
  'SONHANDO EM ALTA RESOLUÇÃO...',
  'TREINANDO O OLHO ARTÍSTICO...',
  'APLICANDO CAMADAS DE GENIALIDADE...',
  'BUSCANDO REFERÊNCIAS NO MUSEU...',
  'CONVERSANDO COM OS PIXELS...',
  'CONVENCENDO A IA A CAPRICHAR...',
  'PROCESSANDO BOAS VIBES...',
  'ADICIONANDO UM TOQUE DE MAGIA...',
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function qualityToResolution(q: string): 'RES_1K' | 'RES_2K' | 'RES_4K' {
  if (q === '4k') return 'RES_4K';
  if (q === 'hd') return 'RES_2K';
  return 'RES_1K';
}

function proportionToAspectRatio(p: string): string {
  const map: Record<string, string> = {
    '16-9': '16:9',
    '9-16': '9:16',
    '1-1': '1:1',
    '4-3': '4:3',
  };
  return map[p] ?? '1:1';
}

// ─── component ────────────────────────────────────────────────────────────────

interface GenerateImagePanelProps {
  nodeId: string;
  onClose?: () => void;
}

export function GenerateImagePanel({ nodeId, onClose }: GenerateImagePanelProps) {
  const { setNodeImage, nodeUpscaleStates, setNodeUpscaleState, consumeCredits, refetchCredits, prependToGallery, openGalleryPicker } =
    useEditor();
  const { accessToken } = useAuth();
  const upscaleState = nodeUpscaleStates[nodeId] ?? 'idle';

  // ── Persistent state (survives page reload) ──────────────────────────────
  const storageKey = `geraew-panel-image-${nodeId}`;
  const [stored] = useState(() => {
    try {
      const raw = localStorage.getItem(`geraew-panel-image-${nodeId}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const [prompt, setPrompt] = useState<string>(stored?.prompt ?? '');
  const [model, setModel] = useState<string>(stored?.model ?? 'gemini-3-pro-image-preview');
  const [proportion, setProportion] = useState<string>(stored?.proportion ?? '9-16');
  const [quality, setQuality] = useState<string>(stored?.quality ?? 'hd');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(stored?.generatedImageUrl ?? null);

  const [genState, setGenState] = useState<GenState>(stored?.generatedImageUrl ? 'done' : 'idle');
  const [progress, setProgress] = useState(0);
  const [imageVisible, setImageVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attachedImages, setAttachedImages] = useState<{ base64: string; mime_type: string; preview: string }[]>(stored?.attachedImages ?? []);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [enhancePrompt, setEnhancePrompt] = useState(stored?.enhancePrompt ?? false);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Restore image display on mount
  useEffect(() => {
    if (stored?.generatedImageUrl) {
      setNodeImage(nodeId, stored.generatedImageUrl);
      setTimeout(() => setImageVisible(true), 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save form + result state whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ prompt, model, proportion, quality, generatedImageUrl, enhancePrompt, attachedImages }));
    } catch {
      // Quota exceeded (large base64 images) — save without attachedImages
      localStorage.setItem(storageKey, JSON.stringify({ prompt, model, proportion, quality, generatedImageUrl, enhancePrompt }));
    }
  }, [storageKey, prompt, model, proportion, quality, generatedImageUrl, enhancePrompt, attachedImages]);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const draggableImgRef = useRef<HTMLImageElement | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseControllerRef = useRef<AbortController | null>(null);

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

  function processFiles(files: File[]) {
    const remaining = 4 - attachedImages.length;
    files.filter((f) => f.type.startsWith('image/')).slice(0, remaining).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const base64 = dataUrl.split(',')[1];
        setAttachedImages((prev) => [...prev, { base64, mime_type: file.type, preview: dataUrl }]);
        toast.success('Imagem adicionada como referência!');
      };
      reader.readAsDataURL(file);
    });
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    processFiles(Array.from(e.target.files ?? []));
    e.target.value = '';
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (attachedImages.length < 4) setIsDraggingOver(true);
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

    // Check if it's a generated image dragged from another panel
    const imageUrl = e.dataTransfer.getData('text/geraew-image-url');
    if (imageUrl) {
      addImageFromUrl(imageUrl);
      return;
    }

    processFiles(Array.from(e.dataTransfer.files));
  }

  function removeAttachedImage(index: number) {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function addImageFromUrl(url: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const mime_type = blob.type || 'image/png';
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        const base64 = dataUrl.split(',')[1];
        setAttachedImages((prev) => {
          if (prev.length >= 4) return prev;
          return [...prev, { base64, mime_type, preview: dataUrl }];
        });
      };
      reader.readAsDataURL(blob);
    } catch {
      // silently fail
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
      const step = Math.max(0.3, Math.random() * (remaining * 0.05 + 0.5));
      current = Math.min(90, current + step);
      setProgress(Math.round(current));
    }, 600);

    // cycle loading messages every 5 s
    let msgIndex = 0;
    setLoadingMsg(LOADING_MESSAGES[0]);
    msgIntervalRef.current = setInterval(() => {
      msgIndex = (msgIndex + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[msgIndex]);
    }, 5000);
  }

  function finishWithImage(url: string) {
    clearProgressTimer();
    clearMsgTimer();
    setProgress(100);
    setTimeout(() => {
      setGenState('done');
      setGeneratedImageUrl(url);
      setNodeImage(nodeId, url);
      setTimeout(() => setImageVisible(true), 60);
    }, 380);
  }

  function startPollingFallback(id: string) {
    pollIntervalRef.current = setInterval(async () => {
      try {
        const generation = await api.generations.get(accessToken!, id);

        if (generation.status === 'COMPLETED') {
          clearPollTimer();
          finishWithImage(generation.outputs[0].url);
          refetchCredits();
          prependToGallery(generation);
        }

        if (generation.status === 'FAILED') {
          clearPollTimer();
          clearProgressTimer();
          clearMsgTimer();
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
  }

  async function handleGenerate() {
    if (!accessToken) return;

    setGenState('generating');
    setProgress(0);
    setImageVisible(false);
    setErrorMsg(null);
    clearProgressTimer();
    clearPollTimer();
    clearSSE();

    let finalPrompt = prompt;

    if (enhancePrompt && prompt.trim()) {
      setIsEnhancing(true);
      try {
        const { enhancedPrompt } = await api.promptEnhancer.enhance(accessToken, prompt);
        finalPrompt = enhancedPrompt;
        setPrompt(enhancedPrompt);
      } catch {
        // If enhancement fails, continue with original prompt
      } finally {
        setIsEnhancing(false);
      }
    }

    startProgressAnimation();

    try {
      const { id, creditsConsumed } = await api.generations.generateImage(accessToken, {
        prompt: finalPrompt,
        model,
        resolution: qualityToResolution(quality),
        aspect_ratio: proportionToAspectRatio(proportion),
        mime_type: 'image/png',
        ...(attachedImages.length > 0 && {
          images: attachedImages.map(({ base64, mime_type }) => ({ base64, mime_type })),
        }),
      });

      consumeCredits(creditsConsumed);

      // Conecta via SSE e faz fallback automático para polling se falhar
      sseControllerRef.current = listenGeneration(id, accessToken, {
        onCompleted: ({ generationId, outputUrls }) => {
          finishWithImage(outputUrls[0]);
          refetchCredits();
          api.generations.get(accessToken!, generationId).then(prependToGallery).catch(() => { });
        },
        onFailed: ({ errorMessage, creditsRefunded }) => {
          clearProgressTimer();
          clearMsgTimer();
          setGenState('idle');
          const msg = errorMessage ?? 'Erro ao gerar imagem.';
          setErrorMsg(creditsRefunded > 0 ? `${msg} (${creditsRefunded} créditos estornados)` : msg);
          refetchCredits();
        },
        onError: () => {
          // SSE falhou → fallback para polling
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
    setImageVisible(false);
    setGeneratedImageUrl(null);
    setErrorMsg(null);
    setAttachedImages([]);
    setNodeUpscaleState(nodeId, 'idle');
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

  // Stop ReactFlow from capturing pointer events on the draggable image (capture phase)
  useEffect(() => {
    const img = draggableImgRef.current;
    if (!img) return;
    const stop = (e: PointerEvent) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
    };
    img.addEventListener('pointerdown', stop, true);
    img.addEventListener('pointermove', stop, true);
    return () => {
      img.removeEventListener('pointerdown', stop, true);
      img.removeEventListener('pointermove', stop, true);
    };
  }, [genState, generatedImageUrl]);

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
      // Check if inside a scrollable container (.sidebar-scroll)
      const scrollable = target.closest('.sidebar-scroll');
      if (scrollable) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };
    panel.addEventListener('wheel', onWheel, { capture: true });
    return () => panel.removeEventListener('wheel', onWheel, { capture: true });
  }, []);

  const imageType = attachedImages.length > 0 ? 'IMAGE_TO_IMAGE' as const : 'TEXT_TO_IMAGE' as const;

  const { data: estimate, isLoading: estimateLoading } = useQuery({
    queryKey: ['credits', 'estimate', imageType, qualityToResolution(quality)],
    queryFn: () => api.credits.estimate(accessToken!, { type: imageType, resolution: qualityToResolution(quality) }),
    enabled: !!accessToken && genState === 'idle',
    staleTime: 30_000,
  });

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
        {/* Header — drag handle */}
        <div className="panel-drag-handle flex cursor-grab items-center justify-between border-b border-[#f3f0ed]/[0.07] px-4 py-3 active:cursor-grabbing">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-[#a2dd00]" />
            <span className="text-xs font-bold tracking-[0.15em] text-[#f3f0ed]/90">
              GERAR IMAGEM
            </span>
          </div>
          <button
            onClick={() => { localStorage.removeItem(storageKey); onClose?.(); }}
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
              <Sparkles className="h-3 w-3" style={{ color: enhancePrompt ? '#a2dd00' : 'rgba(243,240,237,0.3)' }} />
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

              <span className="text-[10px] animate-pulse font-bold tracking-[0.2em] text-[#f3f0ed]/30 transition-all duration-500">
                {loadingMsg}
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
              {/* Image — draggable to video panel */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={draggableImgRef}
                src={generatedImageUrl}
                alt="Imagem gerada"
                className="nopan nodrag h-auto w-full object-cover cursor-grab active:cursor-grabbing"
                draggable="true"
                onDragStart={(e) => {
                  e.stopPropagation();
                  e.dataTransfer.setData('text/geraew-image-url', generatedImageUrl);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
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

          {/* ── Bottom section (model + proportion + quality + refs) ──── */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
              MODELO
            </label>
            <PanelSelect
              value={model}
              onValueChange={setModel}
              options={[
                { value: 'gemini-3.1-flash-image-preview', label: 'Nano Banana 2' },
                { value: 'gemini-3-pro-image-preview', label: 'Nano Banana Pro' },
              ]}
            />
          </div>

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
                  { value: '4k', label: '4K' },
                  { value: 'hd', label: '2K' },
                  { value: 'sd', label: '1K' },
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
              <span className="text-[10px] text-[#f3f0ed]/25">{attachedImages.length}/4</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {attachedImages.map((img, i) => (
                <div key={i} className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#f3f0ed]/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.preview} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => removeAttachedImage(i)}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5 text-white" />
                  </button>
                </div>
              ))}
              {attachedImages.length < 4 && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-[#f3f0ed]/10 text-[#f3f0ed]/25 transition-all hover:border-[#a2dd00]/40 hover:text-[#a2dd00]/60"
                      >
                        <ImagePlus className="h-5 w-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={6}>Enviar do dispositivo</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => openGalleryPicker({ nodeId, remaining: 4 - attachedImages.length, onSelect: (url) => { addImageFromUrl(url); toast.success('Imagem adicionada como referência!'); } })}
                        className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-[#f3f0ed]/10 text-[#f3f0ed]/25 transition-all hover:border-[#a2dd00]/40 hover:text-[#a2dd00]/60"
                      >
                        <FolderOpen className="h-5 w-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={6}>Escolher da galeria</TooltipContent>
                  </Tooltip>
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
    </TooltipProvider>
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
    a.download = 'geraew-ai.jpg';
    a.click();
    URL.revokeObjectURL(objectUrl);
  } catch {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'geraew-ai.jpg';
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
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a2123]/80 text-[#f3f0ed]/70 backdrop-blur-sm transition-all hover:bg-[#1e494b] hover:text-[#a2dd00]"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>{title}</TooltipContent>
    </Tooltip>
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
