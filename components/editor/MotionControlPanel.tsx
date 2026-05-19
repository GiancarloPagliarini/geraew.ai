'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight,
  AudioWaveform,
  Coins,
  Download, Image,
  Loader2,
  Sparkles,
  Video,
  Wand2,
  Wrench,
  X
} from 'lucide-react';
import { StudioSelectPill } from './studio/StudioControls';
import { StudioImageInputHandle } from './studio/StudioHandles';
import { useIncomingImage, urlToImagePayload } from '@/lib/use-incoming-image';
import { PanelDuplicateButton } from './PanelDuplicateButton';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
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

// ─── types ────────────────────────────────────────────────────────────────────

type GenState = 'idle' | 'generating' | 'done';

const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

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
  const t = useTranslations('editorPanels.motionControl');
  const tCommon = useTranslations('editorPanels.common');
  const LOADING_MESSAGES = t.raw('loadingMessages') as string[];
  const { setNodeImage, consumeCredits, refetchCredits, prependToGallery, setNodeGenerating, studioMode } = useEditor();
  const { accessToken } = useAuth();
  const { openLoginModal } = useLoginModal();

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
  const [videoFile, setVideoFile] = useState<{ base64: string; mime_type: string; name: string } | null>(null);
  const [imageFile, setImageFile] = useState<{ base64: string; mime_type: string; preview: string } | null>(null);

  // Load files from IndexedDB on mount (too large for localStorage)
  useEffect(() => {
    idbLoad<{ videoFile: { base64: string; mime_type: string; name: string } | null; imageFile: { base64: string; mime_type: string; preview: string } | null }>(`${storageKey}-images`)
      .then((data) => {
        if (!data) return;
        if (data.videoFile) setVideoFile(data.videoFile);
        if (data.imageFile) setImageFile(data.imageFile);
      })
      .catch((err) => { console.error('[motion-panel] failed to fetch incoming image', err); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(stored?.generatedVideoUrl ?? null);
  const [videoAspect, setVideoAspect] = useState<string>(stored?.videoAspect ?? '16-9');

  const [generationId, setGenerationId] = useState<string | null>(stored?.generationId ?? null);
  const [genState, setGenState] = useState<GenState>(
    stored?.genState === 'generating' && stored?.generationId
      ? 'generating'
      : stored?.generatedVideoUrl ? 'done' : 'idle'
  );
  useEffect(() => {
    setNodeGenerating(nodeId, genState === 'generating');
    return () => setNodeGenerating(nodeId, false);
  }, [genState, nodeId, setNodeGenerating]);

  const dbResolution = resolution === '1080p' ? 'RES_1080P' : 'RES_720P';
  const { data: estimate, isLoading: estimateLoading } = useQuery({
    queryKey: ['credits', 'estimate', 'MOTION_CONTROL', dbResolution, videoDuration],
    queryFn: () => api.credits.estimate(accessToken!, {
      type: 'MOTION_CONTROL',
      resolution: dbResolution,
      hasAudio: false,
      durationSeconds: videoDuration,
    }),
    enabled: !!accessToken && genState !== 'generating',
    staleTime: 60_000,
  });

  // Feature gate — admin can disable the motion-control feature via
  // /admin/modelos. When off, the Gerar button shows a maintenance icon.
  const { data: videoModels } = useQuery({
    queryKey: ['models', 'video'],
    queryFn: () => api.models.listVideos(),
    staleTime: 60_000,
  });
  const motionControlModel = videoModels?.find((m) => m.slug === 'motion-control');
  const featureDisabled = motionControlModel?.isActive === false;
  const featureDisabledMessage =
    motionControlModel?.statusMessage ?? 'Em manutenção — voltamos em breve.';

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
        resolution, videoDuration, generatedVideoUrl, generationId, genState, videoAspect,
      }));
    } catch { /* ignore */ }
  }, [storageKey, resolution, videoDuration, generatedVideoUrl, generationId, genState, videoAspect]);

  // Save files to IndexedDB (too large for localStorage)
  useEffect(() => {
    idbSave(`${storageKey}-images`, { videoFile, imageFile }).catch(() => { });
  }, [storageKey, videoFile, imageFile]);

  // Document title
  useEffect(() => {
    if (genState === 'generating') {
      document.title = t('docTitleGenerating');
    } else {
      document.title = 'Geraew AI';
    }
    return () => { document.title = 'Geraew AI'; };
  }, [genState, t]);

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseControllerRef = useRef<AbortController | null>(null);
  const isFinishedRef = useRef(false);

  // Immediately check generation status when page regains visibility (fixes mobile app-switch)
  useGenerationRecovery(generationId, accessToken, genState === 'generating', {
    onCompleted: (gen) => {
      finishWithVideo(gen.outputs[0]?.url);
      refetchCredits();
      prependToGallery(gen);
    },
    onFailed: (gen) => {
      clearProgressTimer();
      clearMsgTimer();
      clearPollTimer();
      clearSSE();
      setGenState('idle');
      setErrorMsg(showGenerationError({ errorMessage: gen.errorMessage, fallback: tCommon('errors.generateVideo') }));
      refetchCredits();
    },
  });

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
      toast.error(tCommon('errors.videoMax10MB'));
      return;
    }

    if (!file.type.startsWith('video/')) {
      toast.error(tCommon('errors.invalidVideoFormat'));
      return;
    }

    readVideoDuration(file).then(setVideoDuration);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      setVideoFile({ base64, mime_type: file.type, name: file.name });
      toast.success(t('toasts.videoAdded'));
    };
    reader.readAsDataURL(file);
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(tCommon('errors.imageMax10MB'));
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error(tCommon('errors.invalidImageFormat'));
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const rawDataUrl = ev.target?.result as string;
      const { dataUrl, mimeType } = await compressImage(rawDataUrl, file.type);
      setImageFile({ base64: dataUrl.split(',')[1], mime_type: mimeType, preview: dataUrl });
      toast.success(t('toasts.imageAdded'));
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
        toast.error(tCommon('errors.videoMax10MB'));
      } else {
        readVideoDuration(videoF).then(setVideoDuration);
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          setVideoFile({ base64: dataUrl.split(',')[1], mime_type: videoF.type, name: videoF.name });
          toast.success(t('toasts.videoAdded'));
        };
        reader.readAsDataURL(videoF);
      }
    }

    if (imageF && !imageFile) {
      if (imageF.size > MAX_IMAGE_SIZE) {
        toast.error(tCommon('errors.imageMax10MB'));
      } else {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const rawDataUrl = ev.target?.result as string;
          const { dataUrl, mimeType } = await compressImage(rawDataUrl, imageF.type);
          setImageFile({ base64: dataUrl.split(',')[1], mime_type: mimeType, preview: dataUrl });
          toast.success(t('toasts.imageAdded'));
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
          toast.success(t('toasts.imageAdded'));
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
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    clearProgressTimer();
    clearMsgTimer();
    clearPollTimer();
    clearSSE();
    setProgress(100);
    setTimeout(() => {
      setGenState('done');
      setGeneratedVideoUrl(url);
      setNodeImage(nodeId, url);
      // videoVisible set via onLoadedData on <video> inside GenerationPreview
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
          setErrorMsg(showGenerationError({ errorMessage: generation.errorMessage, fallback: tCommon('errors.generateVideo') }));
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
    if (!videoFile || !imageFile) return;

    setGenState('generating');
    setProgress(0);
    setVideoVisible(false);
    setErrorMsg(null);
    isFinishedRef.current = false;
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

      // Polling always runs alongside SSE as a safety net (SSE may silently die on mobile)
      startPollingFallback(id);

      sseControllerRef.current = listenGeneration(id, accessToken, {
        onCompleted: ({ generationId: gId, outputUrls }) => {
          finishWithVideo(outputUrls[0]);
          refetchCredits();
          api.generations.get(accessToken!, gId).then(prependToGallery).catch(() => { });
        },
        onFailed: ({ errorMessage, creditsRefunded }) => {
          clearProgressTimer();
          clearMsgTimer();
          clearPollTimer();
          clearSSE();
          setGenState('idle');
          setErrorMsg(showGenerationError({ errorMessage, creditsRefunded, fallback: tCommon('errors.generateVideo') }));
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
      setErrorMsg(showGenerationError({ errorMessage: err instanceof Error ? err.message : null, fallback: tCommon('errors.startGeneration') }));
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
    setVideoAspect('16-9');
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
  const isGenerating = genState === 'generating';

  const incomingImageUrl = useIncomingImage(nodeId);
  const lastIncomingRef = useRef<string | null>(null);
  useEffect(() => {
    if (!incomingImageUrl) {
      if (lastIncomingRef.current) {
        lastIncomingRef.current = null;
        setImageFile(null);
      }
      return;
    }
    if (incomingImageUrl === lastIncomingRef.current) return;
    lastIncomingRef.current = incomingImageUrl;
    let cancelled = false;
    urlToImagePayload(incomingImageUrl)
      .then((payload) => {
        if (!cancelled) setImageFile(payload);
      })
      .catch((err) => { console.error('[motion-panel] failed to fetch incoming image', err); });
    return () => { cancelled = true; };
  }, [incomingImageUrl]);

  if (studioMode) {
    const isFreeGen = !!estimate?.canUseFreeGeneration;
    const creditCost = estimate?.creditsRequired ?? 0;
    const ready = !!videoFile && !!imageFile;
    const resolutionOptions = [
      { value: '720p', label: '720p' },
      { value: '1080p', label: '1080p' },
    ];

    return (
      <TooltipProvider>
        <div className="relative">
          <StudioImageInputHandle />
        <div
          ref={panelRef}
          className={`group/studio max-w-[calc(100vw-5rem)] overflow-hidden rounded-2xl bg-[#161a1c] shadow-2xl shadow-black/50 ${isDraggingOver ? 'ring-2 ring-[#a2dd00]/30' : ''}`}
          style={{ width: 340 }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="panel-drag-handle flex cursor-grab items-center justify-between px-3 py-2.5 active:cursor-grabbing">
            <div className="flex items-center gap-1.5">
              <AudioWaveform className="h-3.5 w-3.5 text-[#f3f0ed]/40" />
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

            {genState === 'idle' && !generatedVideoUrl ? (
              <div className="flex items-center gap-2">
                <MotionStudioSlot
                  label="Vídeo"
                  icon={<Video className="h-4 w-4" />}
                  filled={!!videoFile}
                  videoName={videoFile?.name}
                  onClick={() => videoInputRef.current?.click()}
                  onClear={() => setVideoFile(null)}
                  disabled={isGenerating}
                />
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#f3f0ed]/25" />
                <MotionStudioSlot
                  label="Imagem"
                  icon={<Image className="h-4 w-4" />}
                  filled={!!imageFile}
                  imagePreview={imageFile?.preview}
                  onClick={() => imageInputRef.current?.click()}
                  onClear={() => setImageFile(null)}
                  disabled={isGenerating}
                />
              </div>
            ) : (
              <GenerationPreview
                proportion={videoAspect}
                genState={genState}
                imageVisible={videoVisible}
                progress={progress}
                renderMedia={generatedVideoUrl ? () => (
                  <video
                    src={generatedVideoUrl}
                    className="h-full w-full object-contain"
                    controls
                    autoPlay
                    loop
                    muted
                    playsInline
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      if (v.videoWidth && v.videoHeight) {
                        setVideoAspect(`${v.videoWidth} / ${v.videoHeight}`);
                      }
                    }}
                    onLoadedData={() => setVideoVisible(true)}
                  />
                ) : undefined}
              >
                <button
                  onClick={handleDiscard}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a2123]/80 text-[#f3f0ed]/70 backdrop-blur-sm transition-all hover:bg-[#1e494b] hover:text-[#a2dd00]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </GenerationPreview>
            )}

            <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />
            <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageSelect} />

            <div className="grid grid-rows-[0fr] opacity-0 transition-all duration-300 ease-out group-hover/studio:grid-rows-[1fr] group-hover/studio:opacity-100">
              <div className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                  <StudioSelectPill
                    value={resolution}
                    label={resolution}
                    options={resolutionOptions}
                    onChange={setResolution}
                    disabled={isGenerating}
                  />
                  {videoDuration > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f0ed]/[0.04] px-2.5 py-1 text-[11px] font-medium text-[#f3f0ed]/60">
                      {videoDuration}s
                    </span>
                  )}
                  {featureDisabled ? (
                    <button
                      disabled
                      title={featureDisabledMessage}
                      className="ml-auto inline-flex cursor-not-allowed items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-300/90"
                    >
                      <Wrench className="h-3 w-3" />
                      Manutenção
                    </button>
                  ) : (
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating || !ready}
                      title={tCommon('generate')}
                      className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#a2dd00] px-2.5 py-1 text-[11px] font-bold text-[#1a2123] transition-all hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      {isFreeGen ? tCommon('free') : (creditCost || '—')}
                    </button>
                  )}
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
        {/* Header */}
        <div className="panel-drag-handle flex cursor-grab items-center justify-between border-b border-[#f3f0ed]/[0.07] px-4 py-3 active:cursor-grabbing">
          <div className="flex items-center gap-2">
            <AudioWaveform className="h-4 w-4 text-[#a2dd00]" />
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

        <div className="space-y-4 p-4">
          {/* ── Generation preview (aurora + crossfade) ───────────────── */}
          <GenerationPreview
            proportion={videoAspect}
            genState={genState}
            imageVisible={videoVisible}
            progress={progress}
            renderMedia={generatedVideoUrl ? () => (
              <video
                src={generatedVideoUrl}
                className="h-full w-full object-contain"
                controls
                autoPlay
                loop
                muted
                playsInline
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  if (v.videoWidth && v.videoHeight) {
                    setVideoAspect(`${v.videoWidth} / ${v.videoHeight}`);
                  }
                }}
                onLoadedData={() => setVideoVisible(true)}
              />
            ) : undefined}
          />

          {/* ── Actions (download + discard) — shown after video loads ── */}
          {genState === 'done' && generatedVideoUrl && videoVisible && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={async () => {
                        if (!generatedVideoUrl) return;
                        try {
                          const res = await fetch(generatedVideoUrl);
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `geraew-motion-${Date.now()}.mp4`;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch {
                          window.open(generatedVideoUrl, '_blank');
                        }
                      }}
                      className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-[#f3f0ed]/8 bg-[#1e494b]/20 text-xs font-semibold text-[#f3f0ed]/60 transition-all hover:border-[#a2dd00]/30 hover:text-[#a2dd00]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {tCommon('download')}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={4}>{tCommon('downloadVideo')}</TooltipContent>
                </Tooltip>
              </div>
              <button
                onClick={handleDiscard}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-[#f3f0ed]/6 text-xs font-semibold text-[#f3f0ed]/40 transition-all hover:border-[#f3f0ed]/15 hover:text-[#f3f0ed]/70"
              >
                {tCommon('generateAnother')}
              </button>
            </div>
          )}

          {/* ── IDLE STATE (form) ────────────────────────────── */}
          {genState === 'idle' && (
            <>
              {/* Video upload */}
              <div>
                <label className="mb-1.5 block text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/40">
                  {t('labels.referenceVideo')}
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
                    {t('uploads.video')}
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
                  {t('labels.replacementImage')}
                </label>
                {imageFile ? (
                  <div className="relative overflow-hidden rounded-xl border border-[#f3f0ed]/[0.08]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageFile.preview} alt="Preview" className="w-full object-contain" />
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
                    {t('uploads.image')}
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
                  {t('labels.resolution')}
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

              {/* Credit estimate – only shown when a reference video is selected */}
              {videoFile && (
                <div className="flex flex-col gap-1.5 rounded-xl border border-[#f3f0ed]/7 bg-[#f3f0ed]/3 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Coins className="h-3 w-3 text-[#a2dd00]" />
                      <span className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/40 uppercase">
                        {tCommon('estimatedCost')}
                      </span>
                    </div>
                    {estimateLoading ? (
                      <div className="h-3.5 w-16 animate-pulse rounded bg-[#f3f0ed]/8" />
                    ) : estimate ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#f3f0ed]/70">{estimate.creditsRequired} {tCommon('credits')}</span>
                        <div className={`h-1.5 w-1.5 rounded-full ${estimate.hasSufficientBalance ? 'bg-[#a2dd00]' : 'bg-red-400'}`} />
                      </div>
                    ) : null}
                  </div>
                  <p className="text-[10px] text-[#f3f0ed]/30">
                    {t('creditsPerSecond', { duration: videoDuration, rate: resolution === '1080p' ? '100' : '70' })}
                  </p>
                </div>
              )}

              {/* Generate button. When the motion-control feature gate is
                  off, render as a maintenance block with the admin's message. */}
              {featureDisabled ? (
                <div className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 py-3 text-center">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-amber-300/90">
                    <Wrench className="h-4 w-4" />
                    Em manutenção
                  </div>
                  <p className="px-3 text-[10.5px] leading-relaxed text-amber-200/70">
                    {featureDisabledMessage}
                  </p>
                </div>
              ) : (
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
                  {tCommon('generate')}
                </button>
              )}

              <p className="text-center text-[10px] text-[#f3f0ed]/25">
                {t('footnote')}
              </p>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

function MotionStudioSlot({
  label,
  icon,
  filled,
  imagePreview,
  videoName,
  onClick,
  onClear,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  filled: boolean;
  imagePreview?: string;
  videoName?: string;
  onClick: () => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  if (filled) {
    return (
      <div className="group/slot relative aspect-square min-w-0 flex-1 overflow-hidden rounded-xl bg-[#0d1011]">
        {imagePreview ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={imagePreview} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-[#a2dd00]/80">
            <Video className="h-5 w-5" />
            <span className="line-clamp-2 text-center text-[9px] text-[#f3f0ed]/50">{videoName}</span>
          </div>
        )}
        <button
          onClick={onClear}
          disabled={disabled}
          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-[#f3f0ed]/80 opacity-0 transition-opacity hover:text-[#f3f0ed] group-hover/slot:opacity-100"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group/slot flex aspect-square min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-xl bg-[#0d1011] text-[#f3f0ed]/40 transition-all hover:bg-[#0f1416] hover:text-[#a2dd00] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="opacity-70 transition-opacity group-hover/slot:opacity-100">{icon}</span>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
