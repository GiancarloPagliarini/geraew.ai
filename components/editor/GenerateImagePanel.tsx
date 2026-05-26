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
import { ArrowBigUp, ArrowUpRight, ChevronDown, Coins, Download, FolderOpen, FolderPlus, Image, ImagePlus, Infinity as InfinityIcon, Loader2, Maximize2, Plus, Settings, Sparkles, TriangleAlert, Wand2, X } from 'lucide-react';
import { EnhancePromptToggle } from './EnhancePromptToggle';
import { UnlimitedToggle } from './UnlimitedToggle';
import {
  useUnlimitedStatus,
  isModelSlugInUnlimitedPlan,
  getFirstUnlimitedSlugForType,
  getFirstUnlimitedResolutionForVariant,
  getModelVariantFromSlug,
  isUnlimitedModelAllowed,
} from '@/hooks/use-unlimited-status';
import { PanelDuplicateButton } from './PanelDuplicateButton';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createPortal } from 'react-dom';
import { idbSave, idbLoad, idbDelete } from '@/lib/panel-idb';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEditor } from '@/lib/editor-context';
import { useAuth } from '@/lib/auth-context';
import { useLoginModal } from '@/lib/login-modal-context';
import { api, ApiError, Folder } from '@/lib/api';
import { PlansModal } from './PlansModal';
import { UnlimitedUpgradeModal } from './UnlimitedUpgradeModal';
import { listenGeneration } from '@/lib/sse';
import { useGenerationRecovery } from '@/lib/use-generation-recovery';
import { toast } from 'sonner';
import { GenerationErrorBanner, showGenerationError } from './GenerationError';
import { GenerationPreview } from './GenerationPreview';
import { containsNsfwContent } from '@/lib/nsfw-blocklist';
import { StudioSelectPill } from './studio/StudioControls';
import { StudioImageInputHandle, StudioImageOutputHandle, StudioTextInputHandle } from './studio/StudioHandles';
import { useIncomingImage, urlToImagePayload } from '@/lib/use-incoming-image';
import { useIncomingText } from '@/lib/use-incoming-text';

// ─── types ────────────────────────────────────────────────────────────────────

type GenState = 'idle' | 'generating' | 'done';

// SVG circle metrics
const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// ─── loading messages ─────────────────────────────────────────────────────────

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

function qualityToResolution(q: string): 'RES_1K' | 'RES_2K' | 'RES_3K' | 'RES_4K' {
  if (q === '4k') return 'RES_4K';
  if (q === '3k') return 'RES_3K';
  if (q === 'hd') return 'RES_2K';
  return 'RES_1K';
}

function resolutionToQuality(res: string): string {
  if (res === 'RES_4K') return '4k';
  if (res === 'RES_3K') return '3k';
  if (res === 'RES_2K') return 'hd';
  return 'sd'; // RES_1K
}

function proportionToAspectRatio(p: string): string {
  const map: Record<string, string> = {
    '16-9': '16:9',
    '9-16': '9:16',
    '1-1': '1:1',
    '4-3': '4:3',
    '3-4': '3:4',
    '2-3': '2:3',
    '3-2': '3:2',
    '21-9': '21:9',
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
  const t = useTranslations('editorPanels.image');
  const tCommon = useTranslations('editorPanels.common');
  const tUnlimited = useTranslations('editorPanels.unlimited');
  const LOADING_MESSAGES = t.raw('loadingMessages') as string[];
  const { setNodeImage, nodeUpscaleStates, setNodeUpscaleState, consumeCredits, refetchCredits, prependToGallery, openGalleryPicker, pendingPromptRef, consumePendingPrompt, pendingPanelImageRef, consumePendingPanelImage, setNodeGenerating, studioMode } =
    useEditor();
  const [initialPendingPrompt] = useState(() => {
    if (pendingPromptRef.current?.panelType === 'generate-image') {
      return consumePendingPrompt()!.prompt;
    }
    return null;
  });
  const [initialPendingImage] = useState(() => {
    if (pendingPanelImageRef.current?.panelType === 'generate-image') {
      return consumePendingPanelImage();
    }
    return null;
  });
  const { accessToken } = useAuth();
  const { openLoginModal } = useLoginModal();
  const queryClient = useQueryClient();
  const upscaleState = nodeUpscaleStates[nodeId] ?? 'idle';
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [unlimitedModalOpen, setUnlimitedModalOpen] = useState(false);

  // ── Persistent state (survives page reload) ──────────────────────────────
  const storageKey = `geraew-panel-image-${nodeId}`;
  const [stored] = useState(() => {
    try {
      const raw = localStorage.getItem(`geraew-panel-image-${nodeId}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const [prompt, setPrompt] = useState<string>(initialPendingPrompt ?? stored?.prompt ?? '');
  const [model, setModel] = useState<string>(stored?.model ?? 'gpt-image-2');
  const [proportion, setProportion] = useState<string>(stored?.proportion ?? '9-16');
  const [quality, setQuality] = useState<string>(stored?.quality ?? 'hd');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(stored?.generatedImageUrl ?? null);

  const [genState, setGenState] = useState<GenState>(
    stored?.genState === 'generating' && stored?.generationId
      ? 'generating'
      : stored?.generatedImageUrl ? 'done' : 'idle'
  );
  useEffect(() => {
    setNodeGenerating(nodeId, genState === 'generating');
    return () => setNodeGenerating(nodeId, false);
  }, [genState, nodeId, setNodeGenerating]);
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

  // ── Pending image from Trending Products: fetch + compress + attach ──────
  useEffect(() => {
    if (!initialPendingImage?.imageUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const payload = await urlToImagePayload(initialPendingImage.imageUrl);
        if (cancelled) return;
        const compressed = await compressImage(payload.preview, payload.mime_type);
        if (cancelled) return;
        const base64 = compressed.dataUrl.split(',')[1];
        setAttachedImages((prev) => {
          if (prev.length >= 4) return prev;
          return [...prev, { base64, mime_type: compressed.mimeType, preview: compressed.dataUrl }];
        });
      } catch (err) {
        console.error('[image-panel] failed to fetch product image', err);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [enhancePrompt, setEnhancePrompt] = useState(stored?.enhancePrompt ?? false);
  const [unlimited, setUnlimited] = useState(false);
  const { data: unlimitedStatus, isLoading: isLoadingUnlimited } = useUnlimitedStatus();
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(true);

  // ─── Image models (DB-backed with fallback for hardcoded models) ──────────
  const imageModelsQuery = useQuery({
    queryKey: ['models', 'image'],
    queryFn: () => api.models.listImages(),
    staleTime: 60_000,
  });

  const imageModelOptions = useMemo(() => {
    const dbBySlug = new Map(
      (imageModelsQuery.data ?? []).map((m) => [m.slug, m]),
    );
    const base: { value: string; label: string; disabled?: boolean; badge?: string; unlimited?: boolean }[] = [
      { value: 'seedream-5-lite', label: 'Seedream Lite', badge: tCommon('newBadge') },
      { value: 'gpt-image-2', label: 'GPT Image 2', badge: tCommon('newBadge') },
      { value: 'gemini-3.1-flash-image-preview', label: 'Nano Banana 2' },
      { value: 'gemini-3-pro-image-preview', label: 'Nano Banana Pro' },
      { value: 'sem-censura', label: 'Geraew Unlocked' },
    ];
    return base.map((opt) => {
      const dbModel = dbBySlug.get(opt.value);
      const merged = dbModel ? { ...opt, label: dbModel.label, disabled: !dbModel.isActive } : opt;
      return {
        ...merged,
        unlimited: unlimited && isModelSlugInUnlimitedPlan(unlimitedStatus, opt.value),
      };
    });
  }, [imageModelsQuery.data, unlimited, unlimitedStatus]);

  // Auto-desliga o toggle ilimitado quando o usuário troca para um modelo fora
  // do plano. Evita que ele tente gerar e tome 403 do backend.
  // Importante: NÃO depender de `unlimited` para não desligar imediatamente
  // após uma ativação onde a troca de modelo é feita no mesmo tick.
  useEffect(() => {
    if (!unlimited) return;
    if (!isModelSlugInUnlimitedPlan(unlimitedStatus, model)) {
      setUnlimited(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, unlimitedStatus]);

  // Ao ativar o toggle: garante que modelo + qualidade estão no plano,
  // trocando automaticamente caso o atual esteja fora.
  const handleToggleUnlimited = (next: boolean) => {
    if (!next) {
      setUnlimited(false);
      return;
    }

    // 1. Decidir modelo final (o atual ou um fallback)
    let targetModel = model;
    if (!isModelSlugInUnlimitedPlan(unlimitedStatus, model)) {
      const fallbackSlug = getFirstUnlimitedSlugForType(unlimitedStatus, 'image');
      if (!fallbackSlug) {
        toast.info(tUnlimited('errors.noImagePlan'));
        setUnlimitedModalOpen(true);
        return;
      }
      targetModel = fallbackSlug;
      setModel(targetModel);
    }

    // 2. Ajustar qualidade se a atual não estiver liberada nesse modelo
    const targetVariant = getModelVariantFromSlug(targetModel);
    const currentResolution = qualityToResolution(quality);
    if (!isUnlimitedModelAllowed(unlimitedStatus, targetVariant, currentResolution)) {
      const fallbackResolution = getFirstUnlimitedResolutionForVariant(
        unlimitedStatus,
        targetVariant,
      );
      if (fallbackResolution) {
        setQuality(resolutionToQuality(fallbackResolution));
      }
    }

    setUnlimited(true);
  };

  // Se o modelo selecionado ficou indisponível, troca automaticamente pro primeiro ativo
  useEffect(() => {
    if (!imageModelsQuery.data) return;
    const current = imageModelsQuery.data.find((m) => m.slug === model);
    if (current && !current.isActive) {
      const firstActive = imageModelOptions.find((o) => !o.disabled);
      if (firstActive) setModel(firstActive.value);
    }
  }, [imageModelsQuery.data, model, imageModelOptions]);


  // Restore image display on mount
  useEffect(() => {
    if (stored?.generatedImageUrl) {
      setNodeImage(nodeId, stored.generatedImageUrl);
      setTimeout(() => setImageVisible(true), 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resume in-progress generation on mount or when accessToken becomes available
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current) return;
    if (stored?.genState === 'generating' && stored?.generationId && accessToken) {
      resumedRef.current = true;
      startProgressAnimation(70);
      startPollingFallback(stored.generationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

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
      document.title = t('docTitleGenerating');
    } else {
      document.title = 'Geraew AI';
    }
    return () => { document.title = 'Geraew AI'; };
  }, [genState, t]);

  // Immediately check generation status when page regains visibility (fixes mobile app-switch)
  useGenerationRecovery(generationId, accessToken, genState === 'generating', {
    onCompleted: (gen) => {
      finishWithImage(gen.outputs[0].url, gen.id);
      refetchCredits();
      prependToGallery(gen);
    },
    onFailed: (gen) => {
      clearProgressTimer();
      clearMsgTimer();
      clearPollTimer();
      clearSSE();
      setGenState('idle');
      setErrorMsg(showGenerationError({ errorMessage: gen.errorMessage, fallback: tCommon('errors.generateImage') }));
      refetchCredits();
    },
  });

  const panelRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const draggableImgRef = useRef<HTMLImageElement | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseControllerRef = useRef<AbortController | null>(null);
  const isFinishedRef = useRef(false);
  const imgRetryCountRef = useRef(0);

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
        toast.success(tCommon('imageAddedAsReference'));
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
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    imgRetryCountRef.current = 0;
    clearProgressTimer();
    clearMsgTimer();
    clearPollTimer();
    clearSSE();
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

  function handleImageError() {
    if (genState !== 'done' || !generatedImageUrl) return;
    const attempt = imgRetryCountRef.current;
    if (attempt < 3) {
      imgRetryCountRef.current = attempt + 1;
      const delay = 1000 * (attempt + 1);
      setTimeout(() => {
        // Force <img> to retry by appending a cache-buster
        setGeneratedImageUrl((prev) => {
          if (!prev) return prev;
          const url = new URL(prev);
          url.searchParams.set('_r', String(Date.now()));
          return url.toString();
        });
      }, delay);
    } else {
      // After 3 retries, force-show the image area so the aurora disappears
      setImageVisible(true);
    }
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
          setErrorMsg(showGenerationError({ errorMessage: generation.errorMessage, fallback: tCommon('errors.generateImage') }));
          refetchCredits();
        }
      } catch {
        clearPollTimer();
        clearProgressTimer();
        setGenState('idle');
        setErrorMsg(showGenerationError({ fallback: tCommon('errors.checkStatus') }));
      }
    }, 3000);
  }

  async function handleGenerate() {
    if (!accessToken) { openLoginModal(); return; }


    if (model === 'sem-censura' && containsNsfwContent(prompt)) {
      setErrorMsg('Seu prompt contém termos não permitidos neste modelo. Remova-os e tente novamente.');
      return;
    }

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
    isFinishedRef.current = false;
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

    const MAX_QUEUE_RETRIES = 10;
    const QUEUE_RETRY_DELAY = 4000;

    for (let attempt = 0; attempt <= MAX_QUEUE_RETRIES; attempt++) {
      try {
        const { id, creditsConsumed } = await api.generations.generateImage(accessToken, {
          prompt: finalPrompt,
          model,
          resolution: qualityToResolution(quality),
          aspect_ratio: proportionToAspectRatio(proportion),
          mime_type: 'image/png',
          ...(unlimited && { unlimited: true }),
          ...(attachedImages.length > 0 && {
            images: attachedImages.map(({ base64, mime_type }) => ({ base64, mime_type })),
          }),
        });

        consumeCredits(creditsConsumed);
        setGenerationId(id);

        // Polling always runs alongside SSE as a safety net (SSE may silently die on mobile)
        startPollingFallback(id);

        sseControllerRef.current = listenGeneration(id, accessToken, {
          onCompleted: ({ generationId: genId, outputUrls }) => {
            finishWithImage(outputUrls[0], genId);
            refetchCredits();
            api.generations.get(accessToken!, genId).then(prependToGallery).catch(() => { });
          },
          onFailed: ({ errorMessage, creditsRefunded }) => {
            clearProgressTimer();
            clearMsgTimer();
            clearPollTimer();
            clearSSE();
            setGenState('idle');
            setErrorMsg(showGenerationError({ errorMessage, creditsRefunded, fallback: tCommon('errors.generateImage') }));
            refetchCredits();
          },
          onError: () => {
            // Polling already running — nothing extra needed
          },
        });
        return; // Success — exit the retry loop
      } catch (err) {
        // Unlimited-mode specific errors — não retry, mostra mensagem clara
        if (err instanceof ApiError) {
          if (err.code === 'UNLIMITED_PLAN_REQUIRED' || err.code === 'UNLIMITED_MODEL_NOT_ALLOWED') {
            clearProgressTimer();
            clearMsgTimer();
            setGenState('idle');
            setUnlimited(false);
            setUnlimitedModalOpen(true);
            return;
          }
          if (err.code === 'UNLIMITED_DAILY_CAP_REACHED') {
            clearProgressTimer();
            clearMsgTimer();
            setGenState('idle');
            toast.error(tUnlimited('errors.serverBusy'));
            return;
          }
          if (err.code === 'UNLIMITED_LOCK_HELD') {
            clearProgressTimer();
            clearMsgTimer();
            setGenState('idle');
            toast.error(tUnlimited('errors.lockHeld'));
            return;
          }
        }

        // 429 MAX_CONCURRENT_REACHED — wait for a slot and retry automatically
        if (err instanceof ApiError && err.status === 429 && attempt < MAX_QUEUE_RETRIES) {
          setLoadingMsg(t('queueWaiting'));
          await new Promise<void>((resolve) => setTimeout(resolve, QUEUE_RETRY_DELAY));
          continue;
        }

        clearProgressTimer();
        clearMsgTimer();
        setGenState('idle');
        if (err instanceof ApiError && [400, 402, 403].includes(err.status)) {
          setPlansModalOpen(true);
          return;
        }
        if (err instanceof ApiError && err.status === 429) {
          setErrorMsg(showGenerationError({ errorMessage: t('concurrentLimit'), fallback: tCommon('errors.startGeneration') }));
          return;
        }
        setErrorMsg(showGenerationError({ errorMessage: err instanceof Error ? err.message : null, fallback: tCommon('errors.startGeneration') }));
        return;
      }
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

  const isSeedreamLite = model === 'seedream-5-lite';
  const imageType = attachedImages.length > 0 ? 'IMAGE_TO_IMAGE' as const : 'TEXT_TO_IMAGE' as const;
  const imageModelVariant =
    model === 'gemini-3-pro-image-preview'
      ? 'NBP'
      : model === 'sem-censura'
        ? 'SEM_CENSURA'
        : model === 'gpt-image-2'
          ? 'GPT_IMAGE_2'
          : isSeedreamLite
            ? 'SEEDREAM_LITE'
            : 'NB2';

  useEffect(() => {
    if (model === 'sem-censura' && quality === 'sd') {
      setQuality('hd');
    }
  }, [model, quality]);

  // Seedream Lite suporta apenas 2K (basic) e 3K (high) — coerce sd→hd e 4k→3k.
  // Para outros modelos, 3k não existe — coerce 3k→4k.
  useEffect(() => {
    if (isSeedreamLite) {
      if (quality === 'sd') setQuality('hd');
      else if (quality === '4k') setQuality('3k');
    } else if (quality === '3k') {
      setQuality('4k');
    }
  }, [isSeedreamLite, quality]);

  // Proportions extras do seedream (3-4, 2-3, 3-2, 21-9) não existem em outros
  // modelos — coerce para 1-1 quando o usuário troca de modelo.
  useEffect(() => {
    const extras = new Set(['3-4', '2-3', '3-2', '21-9']);
    if (!isSeedreamLite && extras.has(proportion)) {
      setProportion('1-1');
    }
  }, [isSeedreamLite, proportion]);

  // GPT Image 2 não suporta 4K com proporção 1:1 — força 2K nesse caso
  useEffect(() => {
    if (model === 'gpt-image-2' && proportion === '1-1' && quality === '4k') {
      setQuality('hd');
    }
  }, [model, proportion, quality]);

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
      toast.success(t('actions.addedToFolder'), { description: folder ? `"${folder.name}"` : undefined });
    },
    onError: () => toast.error(t('actions.errorAddToFolder'), { description: t('actions.tryAgain') }),
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
      toast.success(t('actions.folderCreatedAndAdded'), { description: `"${folder.name}"` });
    },
    onError: () => toast.error(t('actions.errorCreateFolder'), { description: t('actions.tryAgain') }),
  });

  const isGenerating = genState === 'generating';
  const dashOffset = CIRCUMFERENCE * (1 - progress / 100);

  const incomingImageUrl = useIncomingImage(nodeId);
  const lastIncomingRef = useRef<string | null>(null);
  const lastAttachedPreviewRef = useRef<string | null>(null);
  useEffect(() => {
    if (!incomingImageUrl) {
      if (lastIncomingRef.current) {
        lastIncomingRef.current = null;
        const toRemove = lastAttachedPreviewRef.current;
        lastAttachedPreviewRef.current = null;
        if (toRemove) {
          setAttachedImages((prev) => prev.filter((img) => img.preview !== toRemove));
        }
      }
      return;
    }
    if (incomingImageUrl === lastIncomingRef.current) return;
    lastIncomingRef.current = incomingImageUrl;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(incomingImageUrl);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onload = async (ev) => {
          if (cancelled) return;
          const rawDataUrl = ev.target?.result as string;
          const { dataUrl, mimeType } = await compressImage(rawDataUrl, blob.type || 'image/png');
          if (cancelled) return;
          const base64 = dataUrl.split(',')[1];
          lastAttachedPreviewRef.current = dataUrl;
          setAttachedImages((prev) => {
            if (prev.length >= 4) return prev;
            return [...prev, { base64, mime_type: mimeType, preview: dataUrl }];
          });
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error('[image-panel] failed to fetch incoming image', err);
      }
    })();
    return () => { cancelled = true; };
  }, [incomingImageUrl]);

  const incomingText = useIncomingText(nodeId);
  const lastIncomingTextRef = useRef<string | null>(null);
  useEffect(() => {
    if (incomingText === null) {
      if (lastIncomingTextRef.current !== null) {
        lastIncomingTextRef.current = null;
        setPrompt('');
      }
      return;
    }
    lastIncomingTextRef.current = incomingText;
    setPrompt(incomingText);
  }, [incomingText]);

  if (studioMode) {
    const PROPORTION_LABELS: Record<string, string> = {
      '16-9': '16:9', '9-16': '9:16', '1-1': '1:1', '4-3': '4:3',
      '3-4': '3:4', '2-3': '2:3', '3-2': '3:2', '21-9': '21:9',
    };
    const QUALITY_LABELS: Record<string, string> = { '4k': '4K', '3k': '3K', 'hd': '2K', 'sd': '1K' };
    const PROPORTION_WIDTH: Record<string, number> = {
      '9-16': 260, '1-1': 320, '4-3': 360, '16-9': 440,
      '3-4': 280, '2-3': 280, '3-2': 400, '21-9': 460,
    };
    const studioWidth = PROPORTION_WIDTH[proportion] ?? 300;
    const currentModelLabel = imageModelOptions.find((o) => o.value === model)?.label ?? 'GPT Image 2';
    const currentProportionLabel = PROPORTION_LABELS[proportion] ?? proportion;
    const currentQualityLabel = QUALITY_LABELS[quality] ?? quality;
    const isFreeGen = !!estimate?.canUseFreeGeneration;
    const creditCost = estimate?.creditsRequired ?? 0;
    const proportionOptions: { value: string; label: string; suffix?: string }[] = isSeedreamLite
      ? [
          { value: '1-1', label: '1:1', suffix: '1:1' },
          { value: '4-3', label: '4:3', suffix: '4:3' },
          { value: '3-4', label: '3:4', suffix: '3:4' },
          { value: '16-9', label: '16:9', suffix: '16:9' },
          { value: '9-16', label: '9:16', suffix: '9:16' },
          { value: '2-3', label: '2:3', suffix: '2:3' },
          { value: '3-2', label: '3:2', suffix: '3:2' },
          { value: '21-9', label: '21:9', suffix: '21:9' },
        ]
      : [
          { value: '9-16', label: t('proportionOptions.portrait'), suffix: '9:16' },
          { value: '1-1', label: t('proportionOptions.square'), suffix: '1:1' },
          { value: '4-3', label: t('proportionOptions.43'), suffix: '4:3' },
          { value: '16-9', label: t('proportionOptions.landscape'), suffix: '16:9' },
        ];
    const qualityOptionsBase: { value: string; label: string }[] =
      isSeedreamLite
        ? [{ value: '3k', label: '3K' }, { value: 'hd', label: '2K' }]
        : model === 'sem-censura'
          ? [{ value: '4k', label: '4K' }, { value: 'hd', label: '2K' }]
          : model === 'gpt-image-2' && proportion === '1-1'
            ? [{ value: 'hd', label: '2K' }, { value: 'sd', label: '1K' }]
            : [{ value: '4k', label: '4K' }, { value: 'hd', label: '2K' }, { value: 'sd', label: '1K' }];
    const qualityOptionsRaw = qualityOptionsBase.map((opt) => ({
      ...opt,
      unlimited:
        unlimited &&
        isUnlimitedModelAllowed(unlimitedStatus, imageModelVariant, qualityToResolution(opt.value)),
    }));
    const modelSelectOptions = imageModelOptions.map((o) => ({ value: o.value, label: o.label, disabled: o.disabled, unlimited: o.unlimited, isNew: !!o.badge }));
    const showEnhanceToggle = model !== 'sem-censura';

    return (
      <>
        <TooltipProvider>
          <div className="relative">
            <StudioImageInputHandle />
            <StudioTextInputHandle />
            <StudioImageOutputHandle />
          <div
            ref={panelRef}
            className={`group/studio max-w-[calc(100vw-5rem)] overflow-hidden rounded-2xl bg-[#161a1c] shadow-2xl shadow-black/50 ${isDraggingOver ? 'ring-2 ring-[#a2dd00]/30' : ''}`}
            style={{ width: studioWidth, transition: 'width 0.4s ease, border-color 0.2s ease' }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="panel-drag-handle flex cursor-grab items-center justify-between px-3 py-2.5 active:cursor-grabbing">
              <div className="flex items-center gap-1.5">
                <Image className="h-3.5 w-3.5 text-[#f3f0ed]/40" />
                <span className="text-[11px] font-medium text-[#f3f0ed]/60">{t('header')}</span>
              </div>
              <div className="flex items-center gap-1">
                <PanelDuplicateButton onClick={onDuplicate} />
                <button
                  onClick={() => { localStorage.removeItem(storageKey); idbDelete(`${storageKey}-images`).catch(() => { }); onClose?.(); }}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/8 hover:text-[#f3f0ed]/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="space-y-2 px-3 pb-3">
              <GenerationErrorBanner msg={errorMsg} />

              {genState === 'idle' && !generatedImageUrl && (
                <div
                  className="rounded-xl bg-[#0d1011]"
                  style={{
                    aspectRatio: PROPORTION_LABELS[proportion] ? proportion.replace('-', ' / ') : undefined,
                    transition: 'aspect-ratio 0.4s ease',
                  }}
                />
              )}

              <GenerationPreview
                proportion={proportion}
                genState={genState}
                imageVisible={imageVisible}
                onImageLoad={() => setImageVisible(true)}
                onImageError={handleImageError}
                progress={progress}
                generatedImageUrl={generatedImageUrl}
                imageRef={draggableImgRef}
                accent={unlimited ? 'violet' : undefined}
                onImageClick={() => window.open(generatedImageUrl!, '_blank')}
                onImageDragStart={(e) => {
                  e.stopPropagation();
                  e.dataTransfer.setData('text/geraew-image-url', generatedImageUrl!);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                imageFilter={upscaleState === 'done' ? 'blur(0px) brightness(1.06) contrast(1.04) saturate(1.12)' : undefined}
              >
                {upscaleState === 'done' && (
                  <div className="absolute left-2 top-2 flex items-center justify-center rounded-full bg-[#a2dd00] px-2 py-0.5">
                    <span className="text-[8px] font-black tracking-widest text-[#1a2123]">HD+</span>
                  </div>
                )}
                <ActionButton title={tCommon('expand')} onClick={() => window.open(generatedImageUrl!, '_blank')}>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </ActionButton>
                <ActionButton title={tCommon('download')} onClick={() => handleDownload(generatedImageUrl!)}>
                  <Download className="h-3.5 w-3.5" />
                </ActionButton>
                <ActionButton title={tCommon('discard')} onClick={handleDiscard}>
                  <X className="h-3.5 w-3.5" />
                </ActionButton>
              </GenerationPreview>

              {attachedImages.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {attachedImages.map((img, i) => (
                    <div key={i} className="group/ref relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[#f3f0ed]/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.preview} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={() => removeAttachedImage(i)}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover/ref:opacity-100"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-1.5 pt-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isGenerating || attachedImages.length >= 4}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#f3f0ed]/10 bg-[#f3f0ed]/5 text-[#f3f0ed]/50 transition-all hover:border-[#a2dd00]/40 hover:text-[#a2dd00] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={6}>{tCommon('uploadFromDevice')}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => openGalleryPicker({ nodeId, remaining: 4 - attachedImages.length, onSelect: (url) => { addImageFromUrl(url); toast.success(tCommon('imageAddedAsReference')); } })}
                      disabled={isGenerating || attachedImages.length >= 4}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#f3f0ed]/10 bg-[#f3f0ed]/5 text-[#f3f0ed]/50 transition-all hover:border-[#a2dd00]/40 hover:text-[#a2dd00] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={6}>{tCommon('pickFromGallery')}</TooltipContent>
                </Tooltip>
                <input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
                  placeholder={t('promptPlaceholder')}
                  disabled={isGenerating}
                  className="min-w-0 flex-1 bg-transparent text-[12px] text-[#f3f0ed]/85 placeholder-[#f3f0ed]/30 outline-none"
                />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />

              <div className="grid grid-rows-[0fr] opacity-0 transition-all duration-300 ease-out group-hover/studio:grid-rows-[1fr] group-hover/studio:opacity-100">
                <div className="overflow-hidden">
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                    <StudioSelectPill
                      value={model}
                      label={currentModelLabel}
                      options={modelSelectOptions}
                      onChange={setModel}
                      disabled={isGenerating}
                      icon={<Sparkles className="h-3 w-3 text-[#a2dd00]" />}
                      newLabel={tCommon('newBadge')}
                    />
                    <StudioSelectPill
                      value={proportion}
                      label={currentProportionLabel}
                      options={proportionOptions}
                      onChange={setProportion}
                      disabled={isGenerating}
                      icon={<Maximize2 className="h-3 w-3 opacity-70" />}
                    />
                    <StudioSelectPill
                      value={quality}
                      label={currentQualityLabel}
                      options={qualityOptionsRaw}
                      onChange={setQuality}
                      disabled={isGenerating}
                    />
                    {showEnhanceToggle && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => setEnhancePrompt(!enhancePrompt)}
                            disabled={isGenerating}
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                              enhancePrompt
                                ? 'border-[#a2dd00]/40 bg-[#a2dd00]/10 text-[#a2dd00]'
                                : 'border-[#f3f0ed]/8 bg-[#f3f0ed]/[0.04] text-[#f3f0ed]/55 hover:border-[#a2dd00]/30 hover:text-[#f3f0ed]'
                            }`}
                          >
                            {isEnhancing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                            Enhance
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={6}>
                          {enhancePrompt ? tCommon('hideOptions') : tCommon('showOptions')}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating || !prompt.trim()}
                      title={tCommon('generate')}
                      className={`ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${unlimited ? 'bg-[#a855f7] text-white' : 'bg-[#a2dd00] text-[#1a2123]'}`}
                    >
                      {isGenerating ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : unlimited ? (
                        <InfinityIcon className="h-3 w-3" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      {unlimited ? tUnlimited('costLabel') : isFreeGen ? tCommon('free') : (creditCost || '—')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </TooltipProvider>
        {plansModalOpen && createPortal(<PlansModal onClose={() => setPlansModalOpen(false)} />, document.body)}
        {unlimitedModalOpen && createPortal(<UnlimitedUpgradeModal onClose={() => setUnlimitedModalOpen(false)} />, document.body)}
      </>
    );
  }

  // Quality options compartilhadas com modo normal — exibem ícone Infinity
  // ao lado das resoluções liberadas no plano ilimitado do usuário.
  // Hover dos botões de upload (referências) — violeta em modo ilimitado.
  const refHoverClass = unlimited
    ? 'hover:border-[#a855f7]/40 hover:text-[#a855f7]/60'
    : 'hover:border-[#a2dd00]/40 hover:text-[#a2dd00]/60';

  const qualityOptionsForNormalMode = (
    isSeedreamLite
      ? [{ value: '3k', label: '3K' }, { value: 'hd', label: '2K' }]
      : model === 'sem-censura'
        ? [{ value: '4k', label: '4K' }, { value: 'hd', label: '2K' }]
        : model === 'gpt-image-2' && proportion === '1-1'
          ? [{ value: 'hd', label: '2K' }, { value: 'sd', label: '1K' }]
          : [{ value: '4k', label: '4K' }, { value: 'hd', label: '2K' }, { value: 'sd', label: '1K' }]
  ).map((opt) => ({
    ...opt,
    unlimited:
      unlimited &&
      isUnlimitedModelAllowed(unlimitedStatus, imageModelVariant, qualityToResolution(opt.value)),
  }));

  return (
    <>
      <TooltipProvider>
        <div
          ref={panelRef}
          className={`w-[calc(100vw-5rem)] overflow-hidden rounded-2xl border bg-[#1a2123] shadow-2xl shadow-black/50 transition-colors sm:w-[360px] ${
            unlimited
              ? 'unlimited-shimmer-border border-[#a855f7]/25'
              : isDraggingOver
                ? 'border-[#a2dd00]/50 ring-2 ring-[#a2dd00]/30'
                : 'border-[#f3f0ed]/8'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Header — drag handle */}
          <div className="panel-drag-handle flex cursor-grab items-center justify-between border-b border-[#f3f0ed]/[0.07] px-4 py-3 active:cursor-grabbing">
            <div className="flex items-center gap-2">
              <Image className={`h-4 w-4 ${unlimited ? 'text-[#a855f7]' : 'text-[#a2dd00]'}`} />
              <span className="text-xs font-bold tracking-[0.15em] text-[#f3f0ed]/90">
                {t('header')}
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
              placeholder={t('promptPlaceholder')}
              className={`w-full resize-none rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 px-3 py-2.5 text-sm text-[#f3f0ed]/90 placeholder-[#f3f0ed]/25 outline-none transition-all focus:bg-[#1e494b]/30 ${unlimited ? 'focus:border-[#a855f7]/40' : 'focus:border-[#a2dd00]/40'}`}
            />

            {/* Unlimited toggle (sempre aparece) */}
            <UnlimitedToggle
              enabled={unlimited}
              onToggle={handleToggleUnlimited}
              eligible={unlimitedStatus?.eligible ?? false}
              isLoading={isLoadingUnlimited}
              disabled={isGenerating}
              onRequireUpgrade={() => setUnlimitedModalOpen(true)}
            />

            {/* Enhance prompt toggle (não aparece em sem-censura) */}
            {model !== 'sem-censura' && (
              <EnhancePromptToggle
                enabled={enhancePrompt}
                onToggle={setEnhancePrompt}
                isEnhancing={isEnhancing}
                disabled={isGenerating}
                accent={unlimited ? '#a855f7' : undefined}
              />
            )}

            {/* ── Error message ────────────────────────────────────────────── */}
            <GenerationErrorBanner msg={errorMsg} />

            {/* ── Generation area + Generated image (crossfade) ───────────── */}
            <GenerationPreview
              proportion={proportion}
              genState={genState}
              imageVisible={imageVisible}
              onImageLoad={() => setImageVisible(true)}
              onImageError={handleImageError}
              progress={progress}
              generatedImageUrl={generatedImageUrl}
              accent={unlimited ? 'violet' : undefined}
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
              <ActionButton title={tCommon('expand')} onClick={() => window.open(generatedImageUrl!, '_blank')}>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </ActionButton>
              <ActionButton title={tCommon('download')} onClick={() => handleDownload(generatedImageUrl!)}>
                <Download className="h-3.5 w-3.5" />
              </ActionButton>
              {generationId && (
                <ActionButton title={t('actions.addToFolder')} onClick={() => setFolderDialogOpen(true)}>
                  <FolderPlus className="h-3.5 w-3.5" />
                </ActionButton>
              )}
              <ActionButton title={tCommon('discard')} onClick={handleDiscard}>
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
                title={t('folderDialog.title')}
                description={t('folderDialog.description')}
                newFolderPlaceholder={t('folderDialog.newFolderPlaceholder')}
              />
            )}


            {/* ── Bottom section (model + proportion + quality + refs) ──── */}
            <div className="flex items-center gap-3 m-0">
              <div className="h-px flex-1 overflow-hidden">
                <div
                  className="h-full w-full origin-right bg-[#f3f0ed]/[0.07] transition-transform duration-500 ease-out"
                  style={{ transform: optionsOpen ? 'scaleX(1)' : 'scaleX(0)' }}
                />
              </div>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setOptionsOpen((o) => !o)}
                    className={`flex h-6 w-6 items-center justify-center rounded-full transition-all ${unlimited
                      ? 'text-[#a855f7]/60 hover:bg-[#a855f7]/10 hover:text-[#a855f7]'
                      : 'text-[#a2dd00]/60 hover:bg-[#a2dd00]/10 hover:text-[#a2dd00]'
                      }`}
                  >
                    <Settings
                      className="h-5 w-5 transition-transform duration-500"
                      style={{ transform: optionsOpen ? 'rotate(0deg)' : 'rotate(-180deg)' }}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" sideOffset={6}>
                  {optionsOpen ? tCommon('hideOptions') : tCommon('showOptions')}
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
                    {t('labels.model')}
                  </label>
                  <PanelSelect
                    value={model}
                    onValueChange={setModel}
                    options={imageModelOptions}
                    maintenanceLabel={t('modelMaintenance')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3" style={{ opacity: isGenerating ? 0.4 : 1, pointerEvents: isGenerating ? 'none' : undefined }}>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
                      {t('labels.proportion')}
                    </label>
                    <PanelSelect
                      value={proportion}
                      onValueChange={setProportion}
                      options={
                        isSeedreamLite
                          ? [
                              { value: '1-1', label: '1:1' },
                              { value: '4-3', label: '4:3' },
                              { value: '3-4', label: '3:4' },
                              { value: '16-9', label: '16:9' },
                              { value: '9-16', label: '9:16' },
                              { value: '2-3', label: '2:3' },
                              { value: '3-2', label: '3:2' },
                              { value: '21-9', label: '21:9' },
                            ]
                          : [
                              { value: '16-9', label: t('proportionOptions.landscape') },
                              { value: '9-16', label: t('proportionOptions.portrait') },
                              { value: '1-1', label: t('proportionOptions.square') },
                              { value: '4-3', label: t('proportionOptions.43') },
                            ]
                      }
                      accent={unlimited ? 'violet' : undefined}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
                      {t('labels.quality')}
                    </label>
                    <PanelSelect
                      value={quality}
                      onValueChange={setQuality}
                      options={qualityOptionsForNormalMode}
                    />
                  </div>
                </div>

                {/* References */}
                <div className="space-y-2" style={{ opacity: isGenerating ? 0.4 : 1, pointerEvents: isGenerating ? 'none' : undefined }}>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
                      {t('labels.references')}
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
                              className={`flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-[#f3f0ed]/10 text-[#f3f0ed]/25 transition-all ${refHoverClass}`}
                            >
                              <ImagePlus className="h-5 w-5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6}>{tCommon('uploadFromDevice')}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => openGalleryPicker({ nodeId, remaining: 4 - attachedImages.length, onSelect: (url) => { addImageFromUrl(url); toast.success(tCommon('imageAddedAsReference')); } })}
                              className={`flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-[#f3f0ed]/10 text-[#f3f0ed]/25 transition-all ${refHoverClass}`}
                            >
                              <FolderOpen className="h-5 w-5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6}>{tCommon('pickFromGallery')}</TooltipContent>
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
                  <div className="flex flex-col gap-1.5">
                    {estimate?.canUseFreeGeneration && (
                      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3 py-2">
                        <Sparkles className="h-3 w-3 text-emerald-400" />
                        <span className="text-[11px] font-bold text-emerald-400">
                          {tCommon('freeGeneration')} {tCommon('freeGenerationRemaining', { count: estimate.freeGenerationsRemainingForType, plural: estimate.freeGenerationsRemainingForType !== 1 ? 's' : '' })}
                        </span>
                      </div>
                    )}
                    <div
                      className="flex items-center justify-between rounded-xl border px-3 py-2 transition-colors"
                      style={{
                        borderColor: unlimited ? 'rgba(168,85,247,0.25)' : 'rgba(243,240,237,0.07)',
                        background: unlimited ? 'rgba(168,85,247,0.06)' : 'rgba(243,240,237,0.03)',
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        {unlimited ? (
                          <InfinityIcon className="h-3 w-3 text-[#a855f7]" />
                        ) : (
                          <Coins className="h-3 w-3 text-[#a2dd00]" />
                        )}
                        <span className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/40 uppercase">{tCommon('cost')}</span>
                      </div>
                      {unlimited ? (
                        <span className="text-xs font-bold text-[#a855f7]">{tUnlimited('costLabel')}</span>
                      ) : estimateLoading ? (
                        <div className="h-3.5 w-16 animate-pulse rounded bg-[#f3f0ed]/8" />
                      ) : estimate ? (
                        <div className="flex items-center gap-2">
                          {estimate.canUseFreeGeneration ? (
                            <span className="text-xs font-bold text-emerald-400">{tCommon('free')}</span>
                          ) : (
                            <span className="text-xs font-bold text-[#f3f0ed]/70">{estimate.creditsRequired} {tCommon('credits')}</span>
                          )}
                          <div className={`h-1.5 w-1.5 rounded-full ${estimate.hasSufficientBalance ? 'bg-[#a2dd00]' : 'bg-red-400'}`} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Generate button */}
                <button
                  onClick={handleGenerate}
                  disabled={genState === 'generating' || !prompt.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    background:
                      genState === 'generating'
                        ? unlimited
                          ? 'rgba(168,85,247,0.12)'
                          : 'rgba(162,221,0,0.12)'
                        : unlimited
                          ? '#a855f7'
                          : '#a2dd00',
                    color:
                      genState === 'generating'
                        ? unlimited
                          ? '#a855f7'
                          : '#a2dd00'
                        : unlimited
                          ? '#ffffff'
                          : '#1a2123',
                    border:
                      genState === 'generating'
                        ? unlimited
                          ? '1px solid rgba(168,85,247,0.25)'
                          : '1px solid rgba(162,221,0,0.2)'
                        : 'none',
                  }}
                >
                  {genState === 'generating' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {tCommon('generating')}
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      {genState === 'done' ? tCommon('generateAgain') : tCommon('generate')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
      {plansModalOpen && createPortal(<PlansModal onClose={() => setPlansModalOpen(false)} />, document.body)}
      {unlimitedModalOpen && createPortal(<UnlimitedUpgradeModal onClose={() => setUnlimitedModalOpen(false)} />, document.body)}
    </>
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
  title,
  description,
  newFolderPlaceholder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Folder[];
  activeFolderIds: string[];
  onAddToFolder: (folderId: string) => void;
  onCreateAndAdd: (name: string) => void;
  title: string;
  description: string;
  newFolderPlaceholder: string;
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
          <DialogTitle className="text-sm font-bold text-[#f3f0ed]">{title}</DialogTitle>
          <DialogDescription className="text-xs text-[#f3f0ed]/40">
            {description}
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
            placeholder={newFolderPlaceholder}
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
  maintenanceLabel,
  accent,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string; disabled?: boolean; badge?: string; unlimited?: boolean }[];
  maintenanceLabel?: string;
  /** Tom de destaque para focus/selecionado. Default verde-limão. */
  accent?: 'violet';
}) {
  const isViolet = accent === 'violet';
  const triggerFocus = isViolet
    ? 'focus:border-[#a855f7]/40'
    : 'focus:border-[#a2dd00]/40';
  const checkedColor = isViolet
    ? 'data-[state=checked]:text-[#a855f7] [&>span:last-child>svg]:text-[#a855f7]'
    : 'data-[state=checked]:text-[#a2dd00] [&>span:last-child>svg]:text-[#a2dd00]';
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={`h-9 w-full rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 px-3 text-xs text-[#f3f0ed]/80 outline-none transition-all focus:ring-0 data-[placeholder]:text-[#f3f0ed]/35 [&>svg]:text-[#f3f0ed]/30 ${triggerFocus}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-xl border border-[#f3f0ed]/8 bg-[#1a2123] p-1 shadow-2xl shadow-black/60 backdrop-blur-md">
        {options.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            disabled={opt.disabled}
            className={`cursor-pointer rounded-lg px-3 py-2 text-xs text-[#f3f0ed]/70 transition-all focus:bg-[#1e494b]/40 focus:text-[#f3f0ed] data-disabled:cursor-not-allowed data-disabled:opacity-50 ${checkedColor}`}
          >
            <span className="flex items-center gap-1.5">
              {opt.label}
              {opt.unlimited && (
                <InfinityIcon className="h-3 w-3 text-[#a855f7]" />
              )}
              {opt.badge && (
                <span className="ml-2 rounded-full border border-[#a2dd00]/40 bg-[#a2dd00]/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#a2dd00]">
                  {opt.badge}
                </span>
              )}
              {opt.disabled && (
                <span title={maintenanceLabel}>
                  <TriangleAlert className="h-3 w-3 text-amber-400" />
                </span>
              )}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
