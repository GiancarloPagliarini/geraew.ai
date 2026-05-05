'use client';

import {
  Coins,
  Download,
  Image as ImageIcon,
  ImageUpscale,
  Loader2,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { PanelDuplicateButton } from './PanelDuplicateButton';
import { useEffect, useRef, useState } from 'react';
import { idbSave, idbLoad, idbDelete } from '@/lib/panel-idb';
import { useQuery } from '@tanstack/react-query';
import { useEditor } from '@/lib/editor-context';
import { useAuth } from '@/lib/auth-context';
import { useLoginModal } from '@/lib/login-modal-context';
import { api } from '@/lib/api';
import { listenGeneration } from '@/lib/sse';
import { useGenerationRecovery } from '@/lib/use-generation-recovery';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { GenerationErrorBanner, showGenerationError } from './GenerationError';
import { GenerationPreview } from './GenerationPreview';
import { useTranslations } from 'next-intl';
import { StudioImageInputHandle, StudioImageOutputHandle } from './studio/StudioHandles';
import { useIncomingImage, urlToImagePayload } from '@/lib/use-incoming-image';

type GenState = 'idle' | 'generating' | 'done';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1920;
const IMAGE_QUALITY = 0.9;

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

interface UpscalePanelProps {
  nodeId: string;
  onClose?: () => void;
  onDuplicate?: () => void;
}

export function UpscalePanel({ nodeId, onClose, onDuplicate }: UpscalePanelProps) {
  const t = useTranslations('editorPanels.upscale');
  const tCommon = useTranslations('editorPanels.common');
  const { setNodeImage, consumeCredits, refetchCredits, prependToGallery, setNodeGenerating, studioMode } = useEditor();
  const { accessToken } = useAuth();
  const { openLoginModal } = useLoginModal();
  const loadingMessages = t.raw('loadingMessages') as string[];

  const storageKey = `geraew-panel-upscale-${nodeId}`;
  const [stored] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  const model = 'gemini-3-pro-image-preview';
  const [sourceImage, setSourceImage] = useState<{ base64: string; mime_type: string; preview: string } | null>(null);

  useEffect(() => {
    idbLoad<{ sourceImage: { base64: string; mime_type: string; preview: string } | null }>(`${storageKey}-images`)
      .then((data) => { if (data?.sourceImage) setSourceImage(data.sourceImage); })
      .catch((err) => { console.error('[upscale-panel] failed to fetch incoming image', err); });
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

  const imageModelVariant = model === 'gemini-3-pro-image-preview' ? 'NBP' : 'NB2';
  const { data: estimate, isLoading: estimateLoading } = useQuery({
    queryKey: ['credits', 'estimate', 'IMAGE_TO_IMAGE', 'RES_2K', imageModelVariant, 'UPSCALE'],
    queryFn: () => api.credits.estimate(accessToken!, {
      type: 'IMAGE_TO_IMAGE',
      resolution: 'RES_2K',
      modelVariant: imageModelVariant,
      freeGenerationType: 'UPSCALE',
    }),
    enabled: !!accessToken && genState !== 'generating',
    staleTime: 60_000,
  });

  const [progress, setProgress] = useState(0);
  const [imageVisible, setImageVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    if (stored?.generatedImageUrl) {
      setNodeImage(nodeId, stored.generatedImageUrl);
      setTimeout(() => setImageVisible(true), 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stored?.genState === 'generating' && stored?.generationId && accessToken) {
      startProgressAnimation(70);
      startPollingFallback(stored.generationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ generatedImageUrl, generationId, genState }));
    } catch { /* ignore */ }
  }, [storageKey, generatedImageUrl, generationId, genState]);

  useEffect(() => {
    idbSave(`${storageKey}-images`, { sourceImage }).catch(() => { });
  }, [storageKey, sourceImage]);

  useEffect(() => {
    document.title = genState === 'generating' ? t('documentTitle') : 'Geraew AI';
    return () => { document.title = 'Geraew AI'; };
  }, [genState]);

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseControllerRef = useRef<AbortController | null>(null);
  const isFinishedRef = useRef(false);

  useGenerationRecovery(generationId, accessToken, genState === 'generating', {
    onCompleted: (gen) => {
      finishWithImage(gen.outputs[0]?.url);
      refetchCredits();
      prependToGallery(gen);
    },
    onFailed: (gen) => {
      clearProgressTimer(); clearMsgTimer(); clearPollTimer(); clearSSE();
      setGenState('idle');
      setErrorMsg(showGenerationError({ errorMessage: gen.errorMessage, fallback: t('errorUpscaleFailed') }));
      refetchCredits();
    },
  });

  const panelRef = useRef<HTMLDivElement | null>(null);
  const sourceInputRef = useRef<HTMLInputElement | null>(null);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (file.size > MAX_IMAGE_SIZE) { toast.error(t('toastImageTooLarge')); return; }
    if (!file.type.startsWith('image/')) { toast.error(t('toastInvalidFormat')); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const rawDataUrl = ev.target?.result as string;
      const { dataUrl, mimeType } = await compressImage(rawDataUrl, file.type);
      setSourceImage({ base64: dataUrl.split(',')[1], mime_type: mimeType, preview: dataUrl });
      toast.success(t('toastImageAdded'));
    };
    reader.readAsDataURL(file);
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); }
  function handleDragLeave(e: React.DragEvent) { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false);
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
    if (file) {
      if (file.size > MAX_IMAGE_SIZE) { toast.error(t('toastImageTooLarge')); return; }
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const rawDataUrl = ev.target?.result as string;
        const { dataUrl, mimeType } = await compressImage(rawDataUrl, file.type);
        setSourceImage({ base64: dataUrl.split(',')[1], mime_type: mimeType, preview: dataUrl });
        toast.success(t('toastImageAdded'));
      };
      reader.readAsDataURL(file);
      return;
    }
    const imageUrl = e.dataTransfer.getData('text/geraew-image-url');
    if (imageUrl) {
      fetch(imageUrl).then((r) => r.blob()).then((blob) => {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const rawDataUrl = ev.target?.result as string;
          const rawMime = blob.type || 'image/jpeg';
          const { dataUrl, mimeType } = await compressImage(rawDataUrl, rawMime);
          setSourceImage({ base64: dataUrl.split(',')[1], mime_type: mimeType, preview: dataUrl });
        };
        reader.readAsDataURL(blob);
      }).catch(() => { });
    }
  }

  function clearProgressTimer() { if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null; } }
  function clearMsgTimer() { if (msgIntervalRef.current) { clearInterval(msgIntervalRef.current); msgIntervalRef.current = null; } }
  function clearPollTimer() { if (pollIntervalRef.current) { clearInterval(pollIntervalRef.current); pollIntervalRef.current = null; } }
  function clearSSE() { if (sseControllerRef.current) { sseControllerRef.current.abort(); sseControllerRef.current = null; } }

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
    setLoadingMsg(loadingMessages[0]);
    msgIntervalRef.current = setInterval(() => {
      msgIndex = (msgIndex + 1) % loadingMessages.length;
      setLoadingMsg(loadingMessages[msgIndex]);
    }, 5000);
  }

  function finishWithImage(url: string) {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    clearProgressTimer(); clearMsgTimer(); clearPollTimer(); clearSSE();
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
          clearPollTimer(); clearProgressTimer(); clearMsgTimer();
          setGenState('idle');
          setErrorMsg(showGenerationError({ errorMessage: generation.errorMessage, fallback: t('errorUpscaleFailed') }));
          refetchCredits();
        }
      } catch {
        clearPollTimer(); clearProgressTimer();
        setGenState('idle');
        setErrorMsg(showGenerationError({ fallback: t('errorCheckStatus') }));
      }
    }, 3000);
  }

  async function handleGenerate() {
    if (!accessToken) { openLoginModal(); return; }
    if (!sourceImage) return;

    setGenState('generating');
    setProgress(0);
    setImageVisible(false);
    setErrorMsg(null);
    isFinishedRef.current = false;
    clearProgressTimer(); clearPollTimer(); clearSSE();
    startProgressAnimation();

    try {
      const { id, creditsConsumed } = await api.generations.upscale(accessToken, {
        image: sourceImage.base64,
        mime_type: sourceImage.mime_type as 'image/jpeg' | 'image/png',
        model,
      });

      consumeCredits(creditsConsumed);
      setGenerationId(id);
      startPollingFallback(id);

      sseControllerRef.current = listenGeneration(id, accessToken, {
        onCompleted: ({ generationId: gId, outputUrls }) => {
          finishWithImage(outputUrls[0]);
          refetchCredits();
          api.generations.get(accessToken!, gId).then(prependToGallery).catch(() => { });
        },
        onFailed: ({ errorMessage, creditsRefunded }) => {
          clearProgressTimer(); clearMsgTimer(); clearPollTimer(); clearSSE();
          setGenState('idle');
          setErrorMsg(showGenerationError({ errorMessage, creditsRefunded, fallback: t('errorUpscaleFailed') }));
          refetchCredits();
        },
        onError: () => { /* polling cobre */ },
      });
    } catch (err) {
      clearProgressTimer(); clearMsgTimer();
      setGenState('idle');
      setErrorMsg(showGenerationError({ errorMessage: err instanceof Error ? err.message : null, fallback: t('errorStartFailed') }));
    }
  }

  function handleDiscard() {
    setGenState('idle');
    setProgress(0);
    setImageVisible(false);
    setGeneratedImageUrl(null);
    setGenerationId(null);
    setErrorMsg(null);
    setSourceImage(null);
  }

  useEffect(() => () => { clearProgressTimer(); clearMsgTimer(); clearPollTimer(); clearSSE(); }, []);

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

  const isGenerating = genState === 'generating';

  const incomingImageUrl = useIncomingImage(nodeId);
  const lastIncomingRef = useRef<string | null>(null);
  useEffect(() => {
    if (!incomingImageUrl) {
      if (lastIncomingRef.current) {
        lastIncomingRef.current = null;
        setSourceImage(null);
      }
      return;
    }
    if (incomingImageUrl === lastIncomingRef.current) return;
    lastIncomingRef.current = incomingImageUrl;
    let cancelled = false;
    urlToImagePayload(incomingImageUrl)
      .then((payload) => {
        if (!cancelled) setSourceImage(payload);
      })
      .catch((err) => { console.error('[upscale-panel] failed to fetch incoming image', err); });
    return () => { cancelled = true; };
  }, [incomingImageUrl]);

  if (studioMode) {
    const isFreeGen = !!estimate?.canUseFreeGeneration;
    const creditCost = estimate?.creditsRequired ?? 0;
    return (
      <TooltipProvider>
        <div className="relative">
          <StudioImageInputHandle />
          <StudioImageOutputHandle />
        <div
          ref={panelRef}
          className={`group/studio max-w-[calc(100vw-5rem)] overflow-hidden rounded-2xl bg-[#161a1c] shadow-2xl shadow-black/50 ${isDraggingOver ? 'ring-2 ring-[#a2dd00]/30' : ''}`}
          style={{ width: 320 }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="panel-drag-handle flex cursor-grab items-center justify-between px-3 py-2.5 active:cursor-grabbing">
            <div className="flex items-center gap-1.5">
              <ImageUpscale className="h-3.5 w-3.5 text-[#f3f0ed]/40" />
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

            {genState === 'idle' && !generatedImageUrl ? (
              sourceImage ? (
                <div className="group/slot relative aspect-square overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sourceImage.preview} alt={t('imageAlt')} className="h-full w-full object-cover" />
                  <button
                    onClick={() => setSourceImage(null)}
                    disabled={isGenerating}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-[#f3f0ed]/80 opacity-0 transition-opacity hover:text-[#f3f0ed] group-hover/slot:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => sourceInputRef.current?.click()}
                  disabled={isGenerating}
                  className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-xl bg-[#0d1011] text-[#f3f0ed]/40 transition-all hover:bg-[#0f1416] hover:text-[#a2dd00] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ImageIcon className="h-5 w-5" />
                  <span className="text-[11px] font-medium">{t('attachImage')}</span>
                </button>
              )
            ) : (
              <GenerationPreview
                proportion="1-1"
                genState={genState}
                imageVisible={imageVisible}
                progress={progress}
                generatedImageUrl={generatedImageUrl}
                onImageLoad={() => setImageVisible(true)}
              >
                <button
                  onClick={handleDiscard}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a2123]/80 text-[#f3f0ed]/70 backdrop-blur-sm transition-all hover:bg-[#1e494b] hover:text-[#a2dd00]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {generatedImageUrl && imageVisible && (
                  <a
                    href={generatedImageUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a2123]/80 text-[#f3f0ed]/70 backdrop-blur-sm transition-all hover:bg-[#1e494b] hover:text-[#a2dd00]"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                )}
              </GenerationPreview>
            )}

            <input
              ref={sourceInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageSelect}
            />

            <div className="grid grid-rows-[0fr] opacity-0 transition-all duration-300 ease-out group-hover/studio:grid-rows-[1fr] group-hover/studio:opacity-100">
              <div className="overflow-hidden">
                <div className="flex items-center justify-end gap-1.5 pt-1.5">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !sourceImage}
                    title={t('generate')}
                    className="inline-flex items-center gap-1 rounded-full bg-[#a2dd00] px-2.5 py-1 text-[11px] font-bold text-[#1a2123] transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {isFreeGen ? tCommon('free') : (creditCost || '—')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div
        ref={panelRef}
        className={`w-[calc(100vw-5rem)] overflow-hidden rounded-2xl border bg-[#1a2123] shadow-2xl shadow-black/50 transition-colors sm:w-[320px] ${isDraggingOver ? 'border-[#a2dd00]/50 ring-2 ring-[#a2dd00]/30' : 'border-[#f3f0ed]/8'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="panel-drag-handle flex cursor-grab items-center justify-between border-b border-[#f3f0ed]/[0.07] px-4 py-3 active:cursor-grabbing">
          <div className="flex items-center gap-2">
            <ImageUpscale className="h-4 w-4 text-[#a2dd00]" />
            <span className="text-xs font-bold tracking-[0.15em] text-[#f3f0ed]/90">{t('header')}</span>
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
          <GenerationPreview
            proportion="1-1"
            genState={genState}
            imageVisible={imageVisible}
            progress={progress}
            generatedImageUrl={generatedImageUrl}
            onImageLoad={() => setImageVisible(true)}
          />

          {genState === 'generating' && (
            <p className="text-center text-[11px] text-[#f3f0ed]/40">{loadingMsg}</p>
          )}

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
                      {t('download')}
                    </a>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={4}>{t('downloadTooltip')}</TooltipContent>
                </Tooltip>
              </div>
              <button
                onClick={handleDiscard}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-[#f3f0ed]/6 text-xs font-semibold text-[#f3f0ed]/40 transition-all hover:border-[#f3f0ed]/15 hover:text-[#f3f0ed]/70"
              >
                {t('doAnother')}
              </button>
            </div>
          )}

          {genState === 'idle' && (
            <>
              <div>
                <label className="mb-1.5 block text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/40">
                  {t('imageLabel')}
                </label>
                {sourceImage ? (
                  <div className="relative overflow-hidden rounded-xl border border-[#f3f0ed]/[0.08]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sourceImage.preview} alt={t('imageAlt')} className="h-32 w-full object-cover" />
                    <button
                      onClick={() => setSourceImage(null)}
                      className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-[#f3f0ed]/70 hover:text-[#f3f0ed]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => sourceInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#f3f0ed]/[0.12] bg-[#1e494b]/10 px-3 py-4 text-xs text-[#f3f0ed]/40 transition-all hover:border-[#a2dd00]/30 hover:text-[#a2dd00]/70"
                  >
                    <ImageIcon className="h-4 w-4" />
                    {t('attachImage')}
                  </button>
                )}
                <input
                  ref={sourceInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageSelect}
                />
              </div>

              <GenerationErrorBanner msg={errorMsg} />

              <div className="flex flex-col gap-1.5">
                {estimate?.canUseFreeGeneration && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3 py-2">
                    <Sparkles className="h-3 w-3 text-emerald-400" />
                    <span className="text-[11px] font-bold text-emerald-400">
                      {tCommon('freeGeneration')} {tCommon('freeGenerationRemaining', { count: estimate.freeGenerationsRemainingForType, plural: estimate.freeGenerationsRemainingForType !== 1 ? 's' : '' })}
                    </span>
                  </div>
                )}
                <div className="flex flex-col gap-1.5 rounded-xl border border-[#f3f0ed]/7 bg-[#f3f0ed]/3 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Coins className="h-3 w-3 text-[#a2dd00]" />
                      <span className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/40 uppercase">
                        {t('estimatedCost')}
                      </span>
                    </div>
                    {estimateLoading ? (
                      <div className="h-3.5 w-16 animate-pulse rounded bg-[#f3f0ed]/8" />
                    ) : estimate ? (
                      <div className="flex items-center gap-2">
                        {estimate.canUseFreeGeneration ? (
                          <span className="text-xs font-bold text-emerald-400">{tCommon('free')}</span>
                        ) : (
                          <span className="text-xs font-bold text-[#f3f0ed]/70">{t('credits', { count: estimate.creditsRequired })}</span>
                        )}
                        <div className={`h-1.5 w-1.5 rounded-full ${estimate.hasSufficientBalance ? 'bg-[#a2dd00]' : 'bg-red-400'}`} />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <button
                disabled={!sourceImage}
                onClick={handleGenerate}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ background: '#a2dd00', color: '#1a2123' }}
              >
                <Wand2 className="h-4 w-4" />
                {t('generate')}
              </button>

              <p className="text-center text-[10px] text-[#f3f0ed]/25">
                {t('description')}
              </p>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
