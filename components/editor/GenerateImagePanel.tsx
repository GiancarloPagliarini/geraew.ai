'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowBigUp, ArrowUpRight, ChevronDown, Coins, Download, FolderOpen, FolderPlus, Image, ImagePlus, Loader2, Plus, Settings, Wand2, X } from 'lucide-react';
import { EnhancePromptToggle } from './EnhancePromptToggle';
import { PanelDuplicateButton } from './PanelDuplicateButton';
import { useEffect, useRef, useState } from 'react';
import { idbSave, idbLoad, idbDelete } from '@/lib/panel-idb';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEditor } from '@/lib/editor-context';
import { useAuth } from '@/lib/auth-context';
import { api, Folder } from '@/lib/api';
import { listenGeneration } from '@/lib/sse';
import { toast } from 'sonner';
import { GenerationErrorBanner, showGenerationError } from './GenerationError';
import { GenerationPreview } from './GenerationPreview';

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

const MAX_REFERENCE_SIZE = 1920;
const REFERENCE_QUALITY = 0.85;

async function compressImage(dataUrl: string, mimeType: string): Promise<{ dataUrl: string; mimeType: string }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(1, MAX_REFERENCE_SIZE / Math.max(w, h));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const outMime = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
      const compressed = canvas.toDataURL(outMime, REFERENCE_QUALITY);
      resolve({ dataUrl: compressed, mimeType: outMime });
    };
    img.onerror = () => resolve({ dataUrl, mimeType });
    img.src = dataUrl;
  });
}

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
  onDuplicate?: () => void;
}

export function GenerateImagePanel({ nodeId, onClose, onDuplicate }: GenerateImagePanelProps) {
  const { setNodeImage, nodeUpscaleStates, setNodeUpscaleState, consumeCredits, refetchCredits, prependToGallery, openGalleryPicker, pendingPromptRef, consumePendingPrompt } =
    useEditor();
  const [initialPendingPrompt] = useState(() => {
    if (pendingPromptRef.current?.panelType === 'generate-image') {
      return consumePendingPrompt()!.prompt;
    }
    return null;
  });
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const upscaleState = nodeUpscaleStates[nodeId] ?? 'idle';

  // ── Persistent state (survives page reload) ──────────────────────────────
  const storageKey = `geraew-panel-image-${nodeId}`;
  const [stored] = useState(() => {
    try {
      const raw = localStorage.getItem(`geraew-panel-image-${nodeId}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const [prompt, setPrompt] = useState<string>(initialPendingPrompt ?? stored?.prompt ?? '');
  const [model, setModel] = useState<string>(stored?.model ?? 'gemini-3.1-flash-image-preview');
  const [proportion, setProportion] = useState<string>(stored?.proportion ?? '9-16');
  const [quality, setQuality] = useState<string>(stored?.quality ?? 'hd');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(stored?.generatedImageUrl ?? null);

  const [genState, setGenState] = useState<GenState>(
    stored?.genState === 'generating' && stored?.generationId
      ? 'generating'
      : stored?.generatedImageUrl ? 'done' : 'idle'
  );
  const [progress, setProgress] = useState(0);
  const [imageVisible, setImageVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(stored?.generationId ?? null);
  const [attachedImages, setAttachedImages] = useState<{ base64: string; mime_type: string; preview: string }[]>([]);

  // Load attached images from IndexedDB on mount (they're too large for localStorage)
  useEffect(() => {
    idbLoad<{ base64: string; mime_type: string; preview: string }[]>(`${storageKey}-images`)
      .then((imgs) => { if (imgs?.length) setAttachedImages(imgs); })
      .catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [enhancePrompt, setEnhancePrompt] = useState(stored?.enhancePrompt ?? false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(true);


  // Restore image display on mount
  useEffect(() => {
    if (stored?.generatedImageUrl) {
      setNodeImage(nodeId, stored.generatedImageUrl);
      setTimeout(() => setImageVisible(true), 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resume in-progress generation on mount (e.g. after page reload)
  useEffect(() => {
    if (stored?.genState === 'generating' && stored?.generationId && accessToken) {
      startProgressAnimation(70);
      startPollingFallback(stored.generationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save form + result state whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ prompt, model, proportion, quality, generatedImageUrl, generationId, genState, enhancePrompt }));
    } catch { /* ignore */ }
  }, [storageKey, prompt, model, proportion, quality, generatedImageUrl, generationId, genState, enhancePrompt]);

  // Save attached images to IndexedDB (too large for localStorage)
  useEffect(() => {
    idbSave(`${storageKey}-images`, attachedImages).catch(() => { });
  }, [storageKey, attachedImages]);

  // Update document title while generating
  useEffect(() => {
    if (genState === 'generating') {
      document.title = 'Geraew AI - Gerando imagem';
    } else {
      document.title = 'Geraew AI';
    }
    return () => { document.title = 'Geraew AI'; };
  }, [genState]);

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
      reader.onload = async (ev) => {
        const rawDataUrl = ev.target?.result as string;
        const { dataUrl, mimeType } = await compressImage(rawDataUrl, file.type);
        const base64 = dataUrl.split(',')[1];
        setAttachedImages((prev) => [...prev, { base64, mime_type: mimeType, preview: dataUrl }]);
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
      const rawMime = blob.type || 'image/png';
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const rawDataUrl = ev.target?.result as string;
        const { dataUrl, mimeType } = await compressImage(rawDataUrl, rawMime);
        const base64 = dataUrl.split(',')[1];
        setAttachedImages((prev) => {
          if (prev.length >= 4) return prev;
          return [...prev, { base64, mime_type: mimeType, preview: dataUrl }];
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

  function startProgressAnimation(from = 0) {
    let current = from;
    setProgress(from);
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

  function finishWithImage(url: string, genId?: string) {
    clearProgressTimer();
    clearMsgTimer();
    setProgress(100);
    setTimeout(() => {
      setGenState('done');
      setEnhancePrompt(false);
      setGeneratedImageUrl(url);
      if (genId) setGenerationId(genId);
      setNodeImage(nodeId, url);
      // imageVisible is set via onLoad on the <img> element
    }, 380);
  }

  function startPollingFallback(id: string) {
    pollIntervalRef.current = setInterval(async () => {
      try {
        const generation = await api.generations.get(accessToken!, id);

        if (generation.status === 'COMPLETED') {
          clearPollTimer();
          finishWithImage(generation.outputs[0].url, id);
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
    if (!accessToken) return;

    setOptionsOpen(false);
    await new Promise<void>((resolve) => setTimeout(resolve, 320));

    // If there's already an image, blur it out first then start the loading aurora
    if (genState === 'done') {
      setImageVisible(false);
      await new Promise<void>((resolve) => setTimeout(resolve, 650));
    }

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
        const { enhancedPrompt } = await api.promptEnhancer.enhance(accessToken, prompt, {
          type: 'image',
          model,
          resolution: qualityToResolution(quality),
          aspectRatio: proportionToAspectRatio(proportion),
          quality,
          hasReferenceImages: attachedImages.length > 0,
        }, attachedImages.length > 0 ? attachedImages.map(img => ({ base64: img.base64, mime_type: img.mime_type })) : undefined);
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
      setGenerationId(id);

      // Conecta via SSE e faz fallback automático para polling se falhar
      sseControllerRef.current = listenGeneration(id, accessToken, {
        onCompleted: ({ generationId: genId, outputUrls }) => {
          finishWithImage(outputUrls[0], genId);
          refetchCredits();
          api.generations.get(accessToken!, genId).then(prependToGallery).catch(() => { });
        },
        onFailed: ({ errorMessage, creditsRefunded }) => {
          clearProgressTimer();
          clearMsgTimer();
          setGenState('idle');
          setErrorMsg(showGenerationError({ errorMessage, creditsRefunded, fallback: 'Erro ao gerar imagem.' }));
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
  const imageModelVariant = model === 'gemini-3-pro-image-preview' ? 'NBP' : 'NB2';

  const { data: estimate, isLoading: estimateLoading } = useQuery({
    queryKey: ['credits', 'estimate', imageType, qualityToResolution(quality), imageModelVariant],
    queryFn: () => api.credits.estimate(accessToken!, { type: imageType, resolution: qualityToResolution(quality), modelVariant: imageModelVariant }),
    enabled: !!accessToken && genState !== 'generating',
    staleTime: 30_000,
  });

  // ── Folder state ──────────────────────────────────────────────────────────
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);

  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => api.folders.list(accessToken!),
    enabled: !!accessToken,
    staleTime: 30_000,
  });

  const { data: generationFolders = [] } = useQuery<Folder[]>({
    queryKey: ['generation-folders', generationId],
    queryFn: () => api.generations.getFolders(accessToken!, generationId!),
    enabled: !!accessToken && !!generationId,
    staleTime: 60_000,
  });

  const addToFolderMutation = useMutation({
    mutationFn: ({ folderId }: { folderId: string }) =>
      api.folders.addGenerations(accessToken!, folderId, [generationId!]),
    onSuccess: (_data, { folderId }) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      queryClient.invalidateQueries({ queryKey: ['generation-folders', generationId] });
      const folder = folders.find((f) => f.id === folderId);
      toast.success('Adicionada à pasta', { description: folder ? `"${folder.name}"` : undefined });
    },
    onError: () => toast.error('Erro ao adicionar à pasta', { description: 'Tente novamente.' }),
  });

  const createFolderAndAddMutation = useMutation({
    mutationFn: async (name: string) => {
      const folder = await api.folders.create(accessToken!, name);
      await api.folders.addGenerations(accessToken!, folder.id, [generationId!]);
      return folder;
    },
    onSuccess: (folder) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      queryClient.invalidateQueries({ queryKey: ['generation-folders', generationId] });
      toast.success('Pasta criada e imagem adicionada', { description: `"${folder.name}"` });
    },
    onError: () => toast.error('Erro ao criar pasta', { description: 'Tente novamente.' }),
  });

  const isGenerating = genState === 'generating';
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

        <div className="space-y-2.5 p-4">
          {/* Prompt */}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Descreva o que deseja gerar..."
            className="w-full resize-none rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 px-3 py-2.5 text-sm text-[#f3f0ed]/90 placeholder-[#f3f0ed]/25 outline-none transition-all focus:border-[#a2dd00]/40 focus:bg-[#1e494b]/30"
          />

          {/* Enhance prompt toggle */}
          <EnhancePromptToggle
            enabled={enhancePrompt}
            onToggle={setEnhancePrompt}
            isEnhancing={isEnhancing}
            disabled={isGenerating}
          />

          {/* ── Error message ────────────────────────────────────────────── */}
          <GenerationErrorBanner msg={errorMsg} />

          {/* ── Generation area + Generated image (crossfade) ───────────── */}
          <GenerationPreview
            proportion={proportion}
            genState={genState}
            imageVisible={imageVisible}
            onImageLoad={() => setImageVisible(true)}
            progress={progress}
            generatedImageUrl={generatedImageUrl}
            imageRef={draggableImgRef}
            onImageClick={() => window.open(generatedImageUrl!, '_blank')}
            onImageDragStart={(e) => {
              e.stopPropagation();
              e.dataTransfer.setData('text/geraew-image-url', generatedImageUrl!);
              e.dataTransfer.effectAllowed = 'copy';
            }}
            imageFilter={upscaleState === 'done' ? 'blur(0px) brightness(1.06) contrast(1.04) saturate(1.12)' : undefined}
          >
            {/* Upscale done badge */}
            {upscaleState === 'done' && (
              <div className="absolute left-2 top-2 flex items-center justify-center rounded-full bg-[#a2dd00] px-2 py-0.5">
                <span className="text-[8px] font-black tracking-widest text-[#1a2123]">HD+</span>
              </div>
            )}
            <ActionButton title="Expandir" onClick={() => window.open(generatedImageUrl!, '_blank')}>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </ActionButton>
            <ActionButton title="Baixar" onClick={() => handleDownload(generatedImageUrl!)}>
              <Download className="h-3.5 w-3.5" />
            </ActionButton>
            {generationId && (
              <ActionButton title="Adicionar à pasta" onClick={() => setFolderDialogOpen(true)}>
                <FolderPlus className="h-3.5 w-3.5" />
              </ActionButton>
            )}
            <ActionButton title="Descartar" onClick={handleDiscard}>
              <X className="h-3.5 w-3.5" />
            </ActionButton>
          </GenerationPreview>

          {/* ── Folder dialog ───────────────────────────────────────── */}
          {generationId && (
            <FolderAddDialog
              open={folderDialogOpen}
              onOpenChange={setFolderDialogOpen}
              folders={folders}
              activeFolderIds={generationFolders.map((f) => f.id)}
              onAddToFolder={(folderId) => addToFolderMutation.mutate({ folderId })}
              onCreateAndAdd={(name) => createFolderAndAddMutation.mutate(name)}
            />
          )}


          {/* ── Bottom section (model + proportion + quality + refs) ──── */}
          <div className="flex justify-end m-0">
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setOptionsOpen((o) => !o)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[#a2dd00]/60 transition-all hover:bg-[#a2dd00]/10 hover:text-[#a2dd00]"
                >
                  <Settings
                    className="h-5 w-5 transition-transform duration-500"
                    style={{ transform: optionsOpen ? 'rotate(0deg)' : 'rotate(-180deg)' }}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" sideOffset={6}>
                {optionsOpen ? 'Ocultar opções' : 'Mostrar opções'}
              </TooltipContent>
            </Tooltip>
          </div>

          <div
            style={{
              maxHeight: optionsOpen ? '800px' : '0px',
              overflow: 'hidden',
              transition: optionsOpen ? 'max-height 400ms ease' : 'max-height 300ms ease',
            }}
          >
            <div className="space-y-4 pt-0.5">
              <div className="space-y-1.5" style={{ opacity: isGenerating ? 0.4 : 1, pointerEvents: isGenerating ? 'none' : undefined }}>
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

              <div className="grid grid-cols-2 gap-3" style={{ opacity: isGenerating ? 0.4 : 1, pointerEvents: isGenerating ? 'none' : undefined }}>
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
              <div className="space-y-2" style={{ opacity: isGenerating ? 0.4 : 1, pointerEvents: isGenerating ? 'none' : undefined }}>
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

// ─── Folder add dialog ────────────────────────────────────────────────────────

function FolderAddDialog({
  open,
  onOpenChange,
  folders,
  activeFolderIds,
  onAddToFolder,
  onCreateAndAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Folder[];
  activeFolderIds: string[];
  onAddToFolder: (folderId: string) => void;
  onCreateAndAdd: (name: string) => void;
}) {
  const [newName, setNewName] = useState('');

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    onCreateAndAdd(name);
    setNewName('');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setNewName(''); }}>
      <DialogContent className="max-w-xs rounded-2xl border border-[#f3f0ed]/10 bg-[#1a2123] p-5 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-[#f3f0ed]">Adicionar à pasta</DialogTitle>
          <DialogDescription className="text-xs text-[#f3f0ed]/40">
            Escolha uma pasta existente ou crie uma nova.
          </DialogDescription>
        </DialogHeader>

        {folders.length > 0 && (
          <div className="max-h-44 overflow-y-auto sidebar-scroll -mx-1 mt-1">
            {folders.map((f) => {
              const isActive = activeFolderIds.includes(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => { onAddToFolder(f.id); onOpenChange(false); }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition-all hover:bg-[#f3f0ed]/5"
                >
                  <div className="flex items-center gap-2">
                    <FolderPlus className="h-3.5 w-3.5 text-[#a2dd00]/60" />
                    <span className="text-[#f3f0ed]/80">{f.name}</span>
                  </div>
                  {isActive && <span className="text-[10px] text-[#a2dd00]">✓</span>}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 mt-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            placeholder="Nova pasta..."
            className="flex-1 rounded-lg border border-[#f3f0ed]/10 bg-[#f3f0ed]/5 px-3 py-2 text-xs text-[#f3f0ed]/80 placeholder-[#f3f0ed]/25 outline-none focus:border-[#a2dd00]/40"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="flex items-center justify-center rounded-lg bg-[#a2dd00] px-3 py-2 transition-all hover:bg-[#b5f000] disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5 text-[#1a2123]" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
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
