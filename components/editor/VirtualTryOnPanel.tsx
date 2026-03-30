'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Coins,
  Download,
  Image,
  Shirt,
  User,
  Wand2,
  X,
} from 'lucide-react';
import { PanelDuplicateButton } from './PanelDuplicateButton';
import { useEffect, useRef, useState } from 'react';
import { idbSave, idbLoad, idbDelete } from '@/lib/panel-idb';
import { useQuery } from '@tanstack/react-query';
import { useEditor } from '@/lib/editor-context';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { listenGeneration } from '@/lib/sse';
import { useGenerationRecovery } from '@/lib/use-generation-recovery';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { GenerationErrorBanner, showGenerationError } from './GenerationError';
import { GenerationPreview } from './GenerationPreview';

// ─── types ────────────────────────────────────────────────────────────────────

type GenState = 'idle' | 'generating' | 'done';

const LOADING_MESSAGES = [
  'ANALISANDO INFLUENCER...',
  'IDENTIFICANDO ROUPA...',
  'AJUSTANDO CAIMENTO...',
  'APLICANDO TEXTURA...',
  'COMBINANDO ILUMINAÇÃO...',
  'RENDERIZANDO RESULTADO...',
  'AQUECENDO OS NEURÔNIOS...',
  'QUASE PRONTO...',
];

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

const RESOLUTION_OPTIONS = [
  { value: 'RES_1K', label: '1K' },
  { value: 'RES_2K', label: '2K' },
  { value: 'RES_4K', label: '4K' },
];

const ASPECT_RATIO_OPTIONS = [
  { value: '1:1', label: '1:1' },
  { value: '3:4', label: '3:4' },
  { value: '4:3', label: '4:3' },
  { value: '4:5', label: '4:5' },
  { value: '9:16', label: '9:16' },
  { value: '16:9', label: '16:9' },
];

// ─── component ────────────────────────────────────────────────────────────────

interface VirtualTryOnPanelProps {
  nodeId: string;
  onClose?: () => void;
  onDuplicate?: () => void;
}

export function VirtualTryOnPanel({ nodeId, onClose, onDuplicate }: VirtualTryOnPanelProps) {
  const { setNodeImage, consumeCredits, refetchCredits, prependToGallery, setNodeGenerating } = useEditor();
  const { accessToken } = useAuth();

  // ── Persistent state ──────────────────────────────────────────────────────
  const storageKey = `geraew-panel-virtual-try-on-${nodeId}`;
  const [stored] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const [resolution, setResolution] = useState<string>(stored?.resolution ?? 'RES_2K');
  const [aspectRatio, setAspectRatio] = useState<string>(stored?.aspectRatio ?? '3:4');
  const [additionalInstructions, setAdditionalInstructions] = useState<string>(stored?.additionalInstructions ?? '');
  const [influencerImage, setInfluencerImage] = useState<{ base64: string; mime_type: string; preview: string } | null>(null);
  const [clothingImage, setClothingImage] = useState<{ base64: string; mime_type: string; preview: string } | null>(null);

  // Load files from IndexedDB on mount
  useEffect(() => {
    idbLoad<{
      influencerImage: { base64: string; mime_type: string; preview: string } | null;
      clothingImage: { base64: string; mime_type: string; preview: string } | null;
    }>(`${storageKey}-images`)
      .then((data) => {
        if (!data) return;
        if (data.influencerImage) setInfluencerImage(data.influencerImage);
        if (data.clothingImage) setClothingImage(data.clothingImage);
      })
      .catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(stored?.generatedImageUrl ?? null);
  const [generationId, setGenerationId] = useState<string | null>(stored?.generationId ?? null);
  const [genState, setGenState] = useState<GenState>(
    stored?.genState === 'generating' && stored?.generationId
      ? 'generating'
      : stored?.generatedImageUrl ? 'done' : 'idle'
  );
  useEffect(() => {
    setNodeGenerating(nodeId, genState === 'generating');
    return () => setNodeGenerating(nodeId, false);
  }, [genState, nodeId, setNodeGenerating]);

  const { data: estimate, isLoading: estimateLoading } = useQuery({
    queryKey: ['credits', 'estimate', 'IMAGE_TO_IMAGE', resolution],
    queryFn: () => api.credits.estimate(accessToken!, {
      type: 'IMAGE_TO_IMAGE',
      resolution,
      hasAudio: false,
    }),
    enabled: !!accessToken && genState !== 'generating',
    staleTime: 60_000,
  });

  const [progress, setProgress] = useState(0);
  const [imageVisible, setImageVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Restore image display on mount
  useEffect(() => {
    if (stored?.generatedImageUrl) {
      setNodeImage(nodeId, stored.generatedImageUrl);
      setTimeout(() => setImageVisible(true), 60);
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
        resolution, aspectRatio, additionalInstructions, generatedImageUrl, generationId, genState,
      }));
    } catch { /* ignore */ }
  }, [storageKey, resolution, aspectRatio, additionalInstructions, generatedImageUrl, generationId, genState]);

  // Save files to IndexedDB
  useEffect(() => {
    idbSave(`${storageKey}-images`, { influencerImage, clothingImage }).catch(() => { });
  }, [storageKey, influencerImage, clothingImage]);

  // Document title
  useEffect(() => {
    if (genState === 'generating') {
      document.title = 'Geraew AI - Provador Virtual';
    } else {
      document.title = 'Geraew AI';
    }
    return () => { document.title = 'Geraew AI'; };
  }, [genState]);

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseControllerRef = useRef<AbortController | null>(null);
  const isFinishedRef = useRef(false);

  // Immediately check generation status when page regains visibility (fixes mobile app-switch)
  useGenerationRecovery(generationId, accessToken, genState === 'generating', {
    onCompleted: (gen) => {
      finishWithImage(gen.outputs[0]?.url);
      refetchCredits();
      prependToGallery(gen);
    },
    onFailed: (gen) => {
      clearProgressTimer();
      clearMsgTimer();
      clearPollTimer();
      clearSSE();
      setGenState('idle');
      setErrorMsg(showGenerationError({ errorMessage: gen.errorMessage, fallback: 'Erro ao gerar imagem.' }));
      refetchCredits();
    },
  });

  const panelRef = useRef<HTMLDivElement | null>(null);
  const influencerInputRef = useRef<HTMLInputElement | null>(null);
  const clothingInputRef = useRef<HTMLInputElement | null>(null);

  function handleImageSelect(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: typeof setInfluencerImage,
    label: string,
  ) {
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
      setter({ base64: dataUrl.split(',')[1], mime_type: mimeType, preview: dataUrl });
      toast.success(`${label} adicionada!`);
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

    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));

    // First dropped image goes to influencer slot if empty, second to clothing
    for (const file of files) {
      if (file.size > MAX_IMAGE_SIZE) {
        toast.error('Imagem deve ter no máximo 10MB.');
        continue;
      }
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const rawDataUrl = ev.target?.result as string;
        const { dataUrl, mimeType } = await compressImage(rawDataUrl, file.type);
        const imgData = { base64: dataUrl.split(',')[1], mime_type: mimeType, preview: dataUrl };
        if (!influencerImage) {
          setInfluencerImage(imgData);
          toast.success('Foto da influencer adicionada!');
        } else if (!clothingImage) {
          setClothingImage(imgData);
          toast.success('Foto da roupa adicionada!');
        }
      };
      reader.readAsDataURL(file);
    }

    // Handle dragged image URL from gallery
    const imageUrl = e.dataTransfer.getData('text/geraew-image-url');
    if (imageUrl) {
      fetch(imageUrl).then((r) => r.blob()).then((blob) => {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const rawDataUrl = ev.target?.result as string;
          const rawMime = blob.type || 'image/jpeg';
          const { dataUrl, mimeType } = await compressImage(rawDataUrl, rawMime);
          const imgData = { base64: dataUrl.split(',')[1], mime_type: mimeType, preview: dataUrl };
          if (!influencerImage) {
            setInfluencerImage(imgData);
            toast.success('Foto da influencer adicionada!');
          } else if (!clothingImage) {
            setClothingImage(imgData);
            toast.success('Foto da roupa adicionada!');
          }
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

  function finishWithImage(url: string) {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    clearProgressTimer();
    clearMsgTimer();
    clearPollTimer();
    clearSSE();
    setProgress(100);
    setTimeout(() => {
      setGenState('done');
      setGeneratedImageUrl(url);
      setNodeImage(nodeId, url);
    }, 380);
  }

  function startPollingFallback(id: string) {
    pollIntervalRef.current = setInterval(async () => {
      try {
        const generation = await api.generations.get(accessToken!, id);
        if (generation.status === 'COMPLETED') {
          clearPollTimer();
          finishWithImage(generation.outputs[0]?.url);
          refetchCredits();
          prependToGallery(generation);
        }
        if (generation.status === 'FAILED') {
          clearPollTimer();
          clearProgressTimer();
          clearMsgTimer();
          setGenState('idle');
          setErrorMsg(showGenerationError({ errorMessage: generation.errorMessage, fallback: 'Erro ao gerar imagem.' }));
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
    if (!accessToken || !influencerImage || !clothingImage) return;

    setGenState('generating');
    setProgress(0);
    setImageVisible(false);
    setErrorMsg(null);
    isFinishedRef.current = false;
    clearProgressTimer();
    clearPollTimer();
    clearSSE();

    startProgressAnimation();

    try {
      const result = await api.generations.virtualTryOn(accessToken, {
        influencer_image: influencerImage.base64,
        influencer_image_mime_type: influencerImage.mime_type as 'image/jpeg' | 'image/png' | 'image/webp',
        clothing_image: clothingImage.base64,
        clothing_image_mime_type: clothingImage.mime_type as 'image/jpeg' | 'image/png' | 'image/webp',
        additional_instructions: additionalInstructions || undefined,
        resolution,
        aspect_ratio: aspectRatio,
      });

      const { id, creditsConsumed } = result;
      consumeCredits(creditsConsumed);
      setGenerationId(id);

      // Polling always runs alongside SSE as a safety net (SSE may silently die on mobile)
      startPollingFallback(id);

      sseControllerRef.current = listenGeneration(id, accessToken, {
        onCompleted: ({ generationId: gId, outputUrls }) => {
          finishWithImage(outputUrls[0]);
          refetchCredits();
          api.generations.get(accessToken!, gId).then(prependToGallery).catch(() => { });
        },
        onFailed: ({ errorMessage, creditsRefunded }) => {
          clearProgressTimer();
          clearMsgTimer();
          clearPollTimer();
          clearSSE();
          setGenState('idle');
          setErrorMsg(showGenerationError({ errorMessage, creditsRefunded, fallback: 'Erro ao gerar imagem.' }));
          refetchCredits();
        },
        onError: () => {
          // Polling already running — nothing extra needed
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
    setImageVisible(false);
    setGeneratedImageUrl(null);
    setGenerationId(null);
    setErrorMsg(null);
    setInfluencerImage(null);
    setClothingImage(null);
    setAdditionalInstructions('');
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

  // Map aspect ratio to proportion key for GenerationPreview
  const proportionMap: Record<string, string> = { '16:9': '16-9', '9:16': '9-16', '1:1': '1-1', '4:3': '4-3', '3:4': '3-4' };
  const proportion = proportionMap[aspectRatio] ?? '3-4';

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
            <Shirt className="h-4 w-4 text-[#a2dd00]" />
            <span className="text-xs font-bold tracking-[0.15em] text-[#f3f0ed]/90">
              PROVADOR VIRTUAL
            </span>
          </div>
          <div className="flex items-center gap-1">
            <PanelDuplicateButton onClick={onDuplicate} />
            <button
              onClick={() => { localStorage.removeItem(storageKey); idbDelete(`${storageKey}-images`).catch(() => { }); onClose?.(); }}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/8 hover:text-[#f3f0ed]/80"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {/* ── Generation preview ───────────────── */}
          <GenerationPreview
            proportion={proportion}
            genState={genState}
            imageVisible={imageVisible}
            progress={progress}
            generatedImageUrl={generatedImageUrl}
            onImageLoad={() => setImageVisible(true)}
          />

          {/* ── Actions (download + discard) ── */}
          {genState === 'done' && generatedImageUrl && imageVisible && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={generatedImageUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-[#f3f0ed]/8 bg-[#1e494b]/20 text-xs font-semibold text-[#f3f0ed]/60 transition-all hover:border-[#a2dd00]/30 hover:text-[#a2dd00]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={4}>Baixar imagem</TooltipContent>
                </Tooltip>
              </div>
              <button
                onClick={handleDiscard}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-[#f3f0ed]/6 text-xs font-semibold text-[#f3f0ed]/40 transition-all hover:border-[#f3f0ed]/15 hover:text-[#f3f0ed]/70"
              >
                Gerar outro
              </button>
            </div>
          )}

          {/* ── IDLE STATE (form) ────────────────────────────── */}
          {genState === 'idle' && (
            <>
              {/* Influencer image upload */}
              <div>
                <label className="mb-1.5 block text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/40">
                  FOTO DA INFLUENCER
                </label>
                {influencerImage ? (
                  <div className="relative overflow-hidden rounded-xl border border-[#f3f0ed]/[0.08]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={influencerImage.preview} alt="Influencer" className="h-32 w-full object-cover" />
                    <button
                      onClick={() => setInfluencerImage(null)}
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-[#f3f0ed]/70 hover:text-[#f3f0ed]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => influencerInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#f3f0ed]/[0.12] bg-[#1e494b]/10 px-3 py-4 text-xs text-[#f3f0ed]/40 transition-all hover:border-[#a2dd00]/30 hover:text-[#a2dd00]/70"
                  >
                    <User className="h-4 w-4" />
                    Clique ou arraste a foto da influencer
                  </button>
                )}
                <input
                  ref={influencerInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleImageSelect(e, setInfluencerImage, 'Foto da influencer')}
                />
              </div>

              {/* Clothing image upload */}
              <div>
                <label className="mb-1.5 block text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/40">
                  FOTO DA ROUPA
                </label>
                {clothingImage ? (
                  <div className="relative overflow-hidden rounded-xl border border-[#f3f0ed]/[0.08]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={clothingImage.preview} alt="Roupa" className="h-32 w-full object-cover" />
                    <button
                      onClick={() => setClothingImage(null)}
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-[#f3f0ed]/70 hover:text-[#f3f0ed]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => clothingInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#f3f0ed]/[0.12] bg-[#1e494b]/10 px-3 py-4 text-xs text-[#f3f0ed]/40 transition-all hover:border-[#a2dd00]/30 hover:text-[#a2dd00]/70"
                  >
                    <Shirt className="h-4 w-4" />
                    Clique ou arraste a foto da roupa
                  </button>
                )}
                <input
                  ref={clothingInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleImageSelect(e, setClothingImage, 'Foto da roupa')}
                />
              </div>

              {/* Additional instructions */}
              <div>
                <label className="mb-1.5 block text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/40">
                  INSTRUÇÕES ADICIONAIS <span className="font-normal text-[#f3f0ed]/25">(opcional)</span>
                </label>
                <textarea
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder="Ex: fundo branco, iluminação natural, foto de corpo inteiro..."
                  className="w-full resize-none rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 px-3 py-2.5 text-xs text-[#f3f0ed]/80 outline-none transition-all placeholder:text-[#f3f0ed]/25 focus:border-[#a2dd00]/40"
                  rows={2}
                />
              </div>

              {/* Resolution + Aspect Ratio */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
                    RESOLUÇÃO
                  </label>
                  <Select value={resolution} onValueChange={setResolution}>
                    <SelectTrigger className="h-9 w-full rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 px-3 text-xs text-[#f3f0ed]/80 outline-none transition-all focus:border-[#a2dd00]/40 focus:ring-0 data-placeholder:text-[#f3f0ed]/35 [&>svg]:text-[#f3f0ed]/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-[#f3f0ed]/8 bg-[#1a2123] p-1 shadow-2xl shadow-black/60 backdrop-blur-md">
                      {RESOLUTION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="cursor-pointer rounded-lg px-3 py-2 text-xs text-[#f3f0ed]/70 transition-all focus:bg-[#1e494b]/40 focus:text-[#f3f0ed] data-[state=checked]:text-[#a2dd00] [&>span:last-child>svg]:text-[#a2dd00]">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
                    PROPORÇÃO
                  </label>
                  <Select value={aspectRatio} onValueChange={setAspectRatio}>
                    <SelectTrigger className="h-9 w-full rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 px-3 text-xs text-[#f3f0ed]/80 outline-none transition-all focus:border-[#a2dd00]/40 focus:ring-0 data-placeholder:text-[#f3f0ed]/35 [&>svg]:text-[#f3f0ed]/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-[#f3f0ed]/8 bg-[#1a2123] p-1 shadow-2xl shadow-black/60 backdrop-blur-md">
                      {ASPECT_RATIO_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="cursor-pointer rounded-lg px-3 py-2 text-xs text-[#f3f0ed]/70 transition-all focus:bg-[#1e494b]/40 focus:text-[#f3f0ed] data-[state=checked]:text-[#a2dd00] [&>span:last-child>svg]:text-[#a2dd00]">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
              </div>

              {/* Generate button */}
              <button
                disabled={!influencerImage || !clothingImage}
                onClick={handleGenerate}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  background: '#a2dd00',
                  color: '#1a2123',
                }}
              >
                <Wand2 className="h-4 w-4" />
                EXPERIMENTAR ROUPA
              </button>

              <p className="text-center text-[10px] text-[#f3f0ed]/25">
                Veste a roupa na sua influencer de IA automaticamente
              </p>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
