'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AudioLines,
  Clock,
  Film,
  Hd,
  Image as ImageIcon,
  PersonStanding,
  Plus,
  RefreshCw,
  SquarePlay,
  UserRound,
  Volume2,
  VolumeOff,
  Wand2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLoginModal } from '@/lib/login-modal-context';
import type { PendingGeneration } from '@/components/image/types';
import { useGenerationTracker } from '@/components/image/use-generation-tracker';
import { ImageDropTile, type UploadedImage } from '@/components/image/ImageDropTile';
import { MediaFileTile, type MediaFile } from '@/components/app/MediaFileTile';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const REF_ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const REF_MAX_BYTES = 5 * 1024 * 1024;

type VideoToolId = 'generate' | 'motion-control';

const VIDEO_TOOLS: { id: VideoToolId; labelKey: string; icon: LucideIcon }[] = [
  { id: 'generate', labelKey: 'toolGenerateVideos', icon: SquarePlay },
  { id: 'motion-control', labelKey: 'toolMotionControl', icon: PersonStanding },
];

/** Resoluções do Motion Control (Kling — preço por segundo: 70/100 cr). */
const MC_RESOLUTIONS = ['720p', '1080p'];

/** gera opções de duração para modelos com slider no workspace (ex.: 6s–30s) */
const durationRange = (min: number, max: number) =>
  Array.from({ length: max - min + 1 }, (_, i) => `${min + i}s`);

interface VideoModelConfig {
  value: string;
  label: string;
  variant: string;
  /** rota de geração usada pelo workspace para este modelo */
  api: 'geraew' | 'kie' | 'omni' | 'seedance' | 'grok';
  durations: string[];
  defaultDuration: string;
  audio: 'toggle' | 'always-on' | 'always-off';
  /** resoluções aceitas pelo modelo (de lib/video-models.ts) */
  resolutions: { value: string; label: string }[];
  defaultResolution: string;
  /** proporções aceitas (apiValue enviado ao provider; KIE usa 'Auto' p/ 1:1) */
  aspects: { value: string; label: string }[];
  defaultAspect: string;
  /** referências múltiplas (refs) ou primeiro frame único (Grok) */
  refMode: 'refs' | 'first-frame';
  maxRefs: number;
}

const RES_HD = [
  { value: 'RES_720P', label: '720p' },
  { value: 'RES_1080P', label: '1080p' },
  { value: 'RES_4K', label: '4K' },
];

const ASPECTS_VERTICAL_WIDE = [
  { value: '9:16', label: '9:16' },
  { value: '16:9', label: '16:9' },
];

/**
 * Modelos de vídeo, espelhando o painel do workspace (labels invertidos dos
 * Veo/Geraew são intencionais: geraew-* são Vertex e aparecem como "Veo 3.1";
 * veo3* são KIE e aparecem como "Geraew").
 */
const VIDEO_MODELS: VideoModelConfig[] = [
  { value: 'geraew-fast', label: 'Veo 3.1 Fast', variant: 'GERAEW_FAST', api: 'geraew', durations: ['4s', '6s', '8s'], defaultDuration: '8s', audio: 'toggle', resolutions: RES_HD, defaultResolution: 'RES_1080P', aspects: ASPECTS_VERTICAL_WIDE, defaultAspect: '9:16', refMode: 'refs', maxRefs: 8 },
  { value: 'geraew-quality', label: 'Veo 3.1 Quality', variant: 'GERAEW_QUALITY', api: 'geraew', durations: ['4s', '6s', '8s'], defaultDuration: '8s', audio: 'toggle', resolutions: RES_HD, defaultResolution: 'RES_1080P', aspects: ASPECTS_VERTICAL_WIDE, defaultAspect: '9:16', refMode: 'refs', maxRefs: 8 },
  { value: 'gemini-omni-video', label: 'Gemini Omni', variant: 'GEMINI_OMNI', api: 'omni', durations: ['4s', '6s', '8s', '10s'], defaultDuration: '8s', audio: 'always-off', resolutions: RES_HD, defaultResolution: 'RES_1080P', aspects: ASPECTS_VERTICAL_WIDE, defaultAspect: '9:16', refMode: 'refs', maxRefs: 7 },
  { value: 'bytedance-seedance-2', label: 'Seedance 2', variant: 'SEEDANCE_2', api: 'seedance', durations: durationRange(4, 15), defaultDuration: '5s', audio: 'toggle', resolutions: [{ value: 'RES_480P', label: '480p' }, { value: 'RES_720P', label: '720p' }, { value: 'RES_1080P', label: '1080p' }], defaultResolution: 'RES_480P', aspects: [{ value: '1:1', label: '1:1' }, { value: '4:3', label: '4:3' }, { value: '3:4', label: '3:4' }, { value: '16:9', label: '16:9' }, { value: '9:16', label: '9:16' }, { value: '21:9', label: '21:9' }], defaultAspect: '9:16', refMode: 'refs', maxRefs: 6 },
  { value: 'grok-imagine', label: 'Grok Imagine', variant: 'GROK_IMAGINE', api: 'grok', durations: durationRange(6, 30), defaultDuration: '6s', audio: 'always-off', resolutions: [{ value: 'RES_480P', label: '480p' }, { value: 'RES_720P', label: '720p' }], defaultResolution: 'RES_720P', aspects: [{ value: '2:3', label: '2:3' }, { value: '3:2', label: '3:2' }, { value: '1:1', label: '1:1' }, { value: '9:16', label: '9:16' }, { value: '16:9', label: '16:9' }], defaultAspect: '9:16', refMode: 'first-frame', maxRefs: 1 },
  { value: 'veo3_fast', label: 'Geraew Fast', variant: 'VEO_FAST', api: 'kie', durations: ['8s'], defaultDuration: '8s', audio: 'always-on', resolutions: RES_HD, defaultResolution: 'RES_1080P', aspects: [{ value: '9:16', label: '9:16' }, { value: 'Auto', label: 'Auto' }, { value: '16:9', label: '16:9' }], defaultAspect: '9:16', refMode: 'refs', maxRefs: 8 },
  { value: 'veo3', label: 'Geraew Quality', variant: 'VEO_MAX', api: 'kie', durations: ['8s'], defaultDuration: '8s', audio: 'always-on', resolutions: RES_HD, defaultResolution: 'RES_1080P', aspects: [{ value: '9:16', label: '9:16' }, { value: 'Auto', label: 'Auto' }, { value: '16:9', label: '16:9' }], defaultAspect: '9:16', refMode: 'refs', maxRefs: 8 },
];

function durationToSeconds(d: string): number {
  return parseInt(d, 10) || 8;
}


const selectTriggerClass =
  'w-full shrink-0 !h-11 rounded-[10px] border-app-hairline bg-app-surface px-3.5 text-[14px] font-semibold text-app-text shadow-none transition-colors duration-200 ease-app hover:border-app-hairline-2 focus-visible:border-[rgba(162,221,0,0.4)] focus-visible:ring-0 dark:bg-app-surface dark:hover:bg-app-surface [&_svg:not([class*=\'text-\'])]:text-app-muted';

const selectContentClass =
  'rounded-xl border-app-hairline-2 bg-app-card text-app-text shadow-[0_12px_30px_rgba(0,0,0,0.45)]';

const selectItemClass =
  'rounded-lg px-2.5 py-2 text-[13.5px] text-app-text-2 focus:bg-app-surface focus:text-app-text';

function FieldLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold uppercase tracking-[0.9px] text-app-muted">
        {children}
      </span>
      {right}
    </div>
  );
}

interface VideoConfigPanelProps {
  /** aba inativa: fica montada (mantém estado e polling) porém oculta */
  hidden?: boolean;
  initialPrompt?: string;
  /** gerações em andamento desta aba (com url quando concluem, para revelar no preview) */
  onPendingChange: (pending: PendingGeneration[]) => void;
  /** registra a função que foca o prompt desta aba */
  registerFocus?: (focus: () => void) => void;
}

/** Painel de configuração de uma aba de geração de vídeos. */
export function VideoConfigPanel({
  hidden = false,
  initialPrompt,
  onPendingChange,
  registerFocus,
}: VideoConfigPanelProps) {
  const t = useTranslations('home');
  const { user, accessToken } = useAuth();
  const { openLoginModal } = useLoginModal();

  const [tool, setTool] = useState<VideoToolId>('generate');
  const [model, setModel] = useState('geraew-fast');
  const [references, setReferences] = useState<UploadedImage[]>([]);

  // motion control (copiar movimentos)
  const [mcImage, setMcImage] = useState<UploadedImage | null>(null);
  const [mcVideo, setMcVideo] = useState<MediaFile | null>(null);
  const [mcResolution, setMcResolution] = useState('720p');
  const [firstFrame, setFirstFrame] = useState<UploadedImage | null>(null);
  const [lastFrame, setLastFrame] = useState<UploadedImage | null>(null);
  // mídia de referência: vídeo do Omni; vídeo + áudio do Seedance
  const [omniVideo, setOmniVideo] = useState<MediaFile | null>(null);
  const [seedanceVideo, setSeedanceVideo] = useState<MediaFile | null>(null);
  const [seedanceAudio, setSeedanceAudio] = useState<MediaFile | null>(null);
  const [prompt, setPrompt] = useState(initialPrompt ?? '');
  const [enhance, setEnhance] = useState(false);
  const [duration, setDuration] = useState('8s');
  const [resolution, setResolution] = useState('RES_1080P');
  const [aspect, setAspect] = useState('9:16');
  const [audio, setAudio] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // contador (e não boolean) para o dragleave dos filhos não piscar o overlay
  const [dragDepth, setDragDepth] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const { pending, track } = useGenerationTracker();

  useEffect(() => {
    onPendingChange(pending);
  }, [pending, onPendingChange]);

  useEffect(() => {
    registerFocus?.(() => promptRef.current?.focus());
  }, [registerFocus]);

  const modelConfig = VIDEO_MODELS.find((m) => m.value === model) ?? VIDEO_MODELS[0];
  const audioLocked = modelConfig.audio !== 'toggle';
  const effectiveAudio =
    modelConfig.audio === 'always-on' ? true : modelConfig.audio === 'always-off' ? false : audio;
  const isOmni = modelConfig.api === 'omni';
  const isSeedance = modelConfig.api === 'seedance';
  // quota KIE do Omni: imagens + 2×vídeos ≤ 7 — com vídeo anexado sobram 5
  const effectiveMaxRefs = isOmni && omniVideo ? 5 : modelConfig.maxRefs;

  // modelos do banco sobrescrevem labels/disponibilidade dos base
  const modelsQuery = useQuery({
    queryKey: ['models', 'video'],
    queryFn: () => api.models.listVideos(),
    staleTime: 60_000,
  });

  const modelOptions = useMemo(() => {
    const dbBySlug = new Map((modelsQuery.data ?? []).map((m) => [m.slug, m]));
    return VIDEO_MODELS.map((opt) => {
      const dbModel = dbBySlug.get(opt.value);
      return {
        value: opt.value,
        // labels invertidos são intencionais — manter o override local
        label: opt.label,
        disabled: dbModel ? !dbModel.isActive : false,
      };
    });
  }, [modelsQuery.data]);

  const selectModel = (value: string) => {
    setModel(value);
    const cfg = VIDEO_MODELS.find((m) => m.value === value);
    if (!cfg) return;
    // ajusta controles para o que o modelo novo aceita
    if (!cfg.durations.includes(duration)) setDuration(cfg.defaultDuration);
    if (!cfg.resolutions.some((r) => r.value === resolution)) setResolution(cfg.defaultResolution);
    if (!cfg.aspects.some((a) => a.value === aspect)) setAspect(cfg.defaultAspect);
    // respeita o limite de referências do modelo novo
    setReferences((prev) => prev.slice(0, cfg.refMode === 'refs' ? cfg.maxRefs : 0));
    // mídia de referência é exclusiva de cada modelo
    if (cfg.api !== 'omni') setOmniVideo(null);
    if (cfg.api !== 'seedance') {
      setSeedanceVideo(null);
      setSeedanceAudio(null);
    }
    if (cfg.refMode !== 'first-frame') {
      setFirstFrame(null);
      setLastFrame(null);
    }
  };

  const attachOmniVideo = (file: MediaFile | null) => {
    setOmniVideo(file);
    // com vídeo anexado, a quota de imagens do Omni cai para 5
    if (file) setReferences((prev) => prev.slice(0, 5));
  };

  const addReferenceFiles = (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!REF_ACCEPTED.includes(file.type)) {
        toast.error(t('clone.invalidFormat'));
        continue;
      }
      if (file.size > REF_MAX_BYTES) {
        toast.error(t('clone.tooLarge', { max: 5 }));
        continue;
      }
      const maxRefs = effectiveMaxRefs;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setReferences((prev) => {
          if (prev.length >= maxRefs) {
            toast.error(t('image.refMax', { max: maxRefs }));
            return prev;
          }
          return [
            ...prev,
            { base64: dataUrl.split(',')[1], mime_type: file.type, preview: dataUrl },
          ];
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const canGenerate =
    tool === 'motion-control'
      ? !!mcImage && !!mcVideo
      : modelConfig.api === 'grok'
        ? !!prompt.trim() || !!firstFrame
        : !!prompt.trim();

  const generate = async () => {
    if (!canGenerate || submitting) return;
    if (!user || !accessToken) {
      openLoginModal({ mode: 'login' });
      return;
    }
    setSubmitting(true);
    try {
      if (tool === 'motion-control') {
        const { id } = await api.generations.motionControl(accessToken, {
          video: mcVideo!.base64,
          video_mime_type: mcVideo!.mime_type,
          image: mcImage!.base64,
          image_mime_type: mcImage!.mime_type,
          resolution: mcResolution as '720p' | '1080p',
        });
        track(id, t('video.toolMotionControl'));
        return;
      }

      let finalPrompt = prompt.trim();
      if (enhance && finalPrompt) {
        try {
          const { enhancedPrompt } = await api.promptEnhancer.enhance(
            accessToken,
            finalPrompt,
            {
              type: 'video',
              model,
              resolution,
              aspectRatio: aspect,
              durationSeconds: durationToSeconds(duration),
              hasAudio: effectiveAudio,
              hasReferenceImages: references.length > 0,
            },
            references.length > 0
              ? references.map(({ base64, mime_type }) => ({ base64, mime_type }))
              : undefined,
          );
          finalPrompt = enhancedPrompt;
          setPrompt(enhancedPrompt);
        } catch { /* segue com o prompt original */ }
      }

      let result: { id: string };
      switch (modelConfig.api) {
        case 'kie': {
          const kiePayload = {
            prompt: finalPrompt,
            model,
            resolution,
            aspect_ratio: aspect,
            generate_audio: true,
            model_variant: modelConfig.variant,
          };
          result =
            references.length > 0
              ? await api.generations.referenceToVideoKie(accessToken, {
                  ...kiePayload,
                  reference_images: references.map(({ base64 }) => base64),
                  reference_images_mime_types: references.map(({ mime_type }) => mime_type),
                })
              : await api.generations.textToVideoKie(accessToken, kiePayload);
          break;
        }
        case 'omni': {
          result = await api.generations.omniVideo(accessToken, {
            prompt: finalPrompt,
            resolution,
            duration_seconds: durationToSeconds(duration) as 4 | 6 | 8 | 10,
            aspect_ratio: aspect as '16:9' | '9:16',
            images:
              references.length > 0
                ? references.map(({ base64, mime_type }) => ({ base64, mime_type }))
                : undefined,
            video: omniVideo
              ? {
                  base64: omniVideo.base64,
                  mime_type: omniVideo.mime_type,
                  duration_seconds: omniVideo.duration,
                }
              : undefined,
            model_variant: modelConfig.variant,
          });
          break;
        }
        case 'seedance': {
          result = await api.generations.seedanceVideo(accessToken, {
            prompt: finalPrompt,
            resolution,
            duration_seconds: durationToSeconds(duration),
            aspect_ratio: aspect as '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '21:9',
            generate_audio: effectiveAudio,
            model_variant: modelConfig.variant,
            ...(references.length > 0 && {
              reference_images: references.map(({ base64, mime_type }) => ({ base64, mime_type })),
            }),
            ...(seedanceVideo && {
              reference_video: { base64: seedanceVideo.base64, mime_type: seedanceVideo.mime_type },
            }),
            ...(seedanceAudio && {
              reference_audio: { base64: seedanceAudio.base64, mime_type: seedanceAudio.mime_type },
            }),
          });
          break;
        }
        case 'grok': {
          result = firstFrame
            ? await api.generations.imageToVideoGrok(accessToken, {
                prompt: finalPrompt || undefined,
                resolution,
                duration_seconds: durationToSeconds(duration),
                aspect_ratio: aspect,
                first_frame: firstFrame.base64,
                first_frame_mime_type: firstFrame.mime_type,
                ...(lastFrame && {
                  last_frame: lastFrame.base64,
                  last_frame_mime_type: lastFrame.mime_type,
                }),
                model_variant: modelConfig.variant,
              })
            : await api.generations.textToVideoGrok(accessToken, {
                prompt: finalPrompt,
                resolution,
                duration_seconds: durationToSeconds(duration),
                aspect_ratio: aspect,
                model_variant: modelConfig.variant,
              });
          break;
        }
        default: {
          const basePayload = {
            prompt: finalPrompt,
            model,
            resolution,
            duration_seconds: durationToSeconds(duration),
            aspect_ratio: aspect,
            generate_audio: effectiveAudio,
            sample_count: 1,
          };
          result =
            references.length > 0
              ? await api.generations.videoWithReferences(accessToken, {
                  ...basePayload,
                  reference_images: references.map(({ base64, mime_type }) => ({
                    base64,
                    mime_type,
                    reference_type: 'asset' as const,
                  })),
                })
              : await api.generations.textToVideo(accessToken, basePayload);
        }
      }

      track(result.id, finalPrompt || t('video.tab'));
    } catch (err) {
      toast.error(
        err instanceof ApiError || err instanceof Error ? err.message : t('video.failed'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // painel de configuração — aceita soltar imagens como referência
    <div
      className={cn(
        'relative flex w-full shrink-0 flex-col border-b border-app-hairline lg:w-[360px] lg:border-b-0 lg:border-r',
        hidden && 'hidden',
      )}
      onDragEnter={(e) => {
        if (e.dataTransfer.types.includes('Files')) setDragDepth((c) => c + 1);
      }}
      onDragLeave={() => setDragDepth((c) => Math.max(0, c - 1))}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        setDragDepth(0);
        addReferenceFiles(e.dataTransfer.files);
      }}
    >
      {dragDepth > 0 && (
        <div className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-[14px] border-2 border-dashed border-[rgba(162,221,0,0.6)] bg-[rgba(162,221,0,0.07)] backdrop-blur-[2px]">
          <p className="text-[14px] font-semibold text-app-lime">{t('image.dropHint')}</p>
        </div>
      )}
      {/* *:shrink-0 — sem isso o flex esmaga os filhos (ex.: botão Gerar) antes de rolar */}
      <div className="flex min-h-0 flex-1 flex-col gap-[22px] overflow-y-auto p-5 scrollbar-app *:shrink-0">
        {/* ferramenta */}
        <div className="flex flex-col gap-2">
          <FieldLabel>{t('image.tool')}</FieldLabel>
          <Select value={tool} onValueChange={(v) => setTool(v as VideoToolId)}>
            {/* o ícone vem junto no SelectValue (clonado do item selecionado) */}
            <SelectTrigger className={cn(selectTriggerClass, 'justify-start [&>span:first-child]:flex-1')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" align="start" sideOffset={6} className={selectContentClass}>
              {VIDEO_TOOLS.map(({ id, labelKey, icon: OptIcon }) => (
                <SelectItem key={id} value={id} className={selectItemClass}>
                  <OptIcon className="size-[15px] !text-app-lime" strokeWidth={1.8} />
                  {t(`video.${labelKey}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Motion Control (copiar movimentos) ── */}
        {tool === 'motion-control' && (
          <>
            <div className="flex flex-col gap-2">
              <FieldLabel>{t('image.references')}</FieldLabel>
              <div className="grid grid-cols-2 gap-3">
                <ImageDropTile
                  label={t('video.mcImage')}
                  icon={ImageIcon}
                  value={mcImage}
                  onChange={setMcImage}
                  maxMB={10}
                />
                <MediaFileTile
                  label={t('video.mcVideo')}
                  icon={Film}
                  kind="video"
                  value={mcVideo}
                  onChange={setMcVideo}
                  maxMB={10}
                />
              </div>
              <p className="text-[12px] leading-relaxed text-app-muted">{t('video.mcHint')}</p>
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel>{t('image.resolution')}</FieldLabel>
              <Select value={mcResolution} onValueChange={setMcResolution}>
                <SelectTrigger className={cn(selectTriggerClass, '!h-10')}>
                  <Hd className="size-[15px] !text-app-lime" strokeWidth={1.8} />
                  <span className="flex-1 truncate text-left font-mono text-[13px]">
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" sideOffset={6} className={selectContentClass}>
                  {MC_RESOLUTIONS.map((r) => (
                    <SelectItem key={r} value={r} className={cn(selectItemClass, 'font-mono')}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {tool === 'generate' && (
        <>
        {/* modelo */}
        <div className="flex flex-col gap-2">
          <FieldLabel>{t('image.model')}</FieldLabel>
          <Select value={model} onValueChange={selectModel}>
            <SelectTrigger className={selectTriggerClass}>
              <SquarePlay className="size-[16px] !text-app-lime" strokeWidth={1.8} />
              <span className="flex-1 truncate text-left">
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" align="start" sideOffset={6} className={selectContentClass}>
              {modelOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled} className={selectItemClass}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* referências (Grok usa primeiro/último frame) */}
        {modelConfig.refMode === 'first-frame' ? (
          <div className="flex flex-col gap-2">
            <FieldLabel>{t('video.frames')}</FieldLabel>
            <div className="grid grid-cols-2 gap-3">
              <ImageDropTile
                label={t('video.firstFrame')}
                value={firstFrame}
                onChange={setFirstFrame}
                className="h-[96px]"
              />
              <ImageDropTile
                label={t('video.lastFrame')}
                value={lastFrame}
                onChange={setLastFrame}
                className="h-[96px]"
              />
            </div>
          </div>
        ) : (
        <div className="flex flex-col gap-2">
          <FieldLabel
            right={
              <span className="font-mono text-[11px] text-app-muted">
                {references.length}/{effectiveMaxRefs}
              </span>
            }
          >
            {t('image.references')}
          </FieldLabel>
          <input
            ref={fileInputRef}
            type="file"
            accept={REF_ACCEPTED.join(',')}
            multiple
            className="hidden"
            onChange={(e) => {
              addReferenceFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <div className="grid grid-cols-2 gap-3">
            {references.map((ref, i) => (
              <div
                key={i}
                className="group relative h-[76px] overflow-hidden rounded-xl border border-app-hairline bg-app-surface"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ref.preview} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  aria-label={t('clone.remove')}
                  onClick={() => setReferences((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-[rgba(13,16,17,0.75)] text-app-text-2 opacity-0 backdrop-blur-sm transition-opacity duration-200 ease-app hover:text-app-text group-hover:opacity-100"
                >
                  <X className="size-3" strokeWidth={2} />
                </button>
              </div>
            ))}
            {/* vídeo de referência (Omni: corta em 10s; Seedance: até 15s) */}
            {isOmni && (
              <MediaFileTile
                label={t('video.refVideo')}
                icon={Film}
                kind="video"
                value={omniVideo}
                onChange={attachOmniVideo}
                maxMB={100}
                maxSeconds={30}
                truncateAfterSeconds={10}
              />
            )}
            {isSeedance && (
              <>
                <MediaFileTile
                  label={t('video.refVideo')}
                  icon={Film}
                  kind="video"
                  value={seedanceVideo}
                  onChange={setSeedanceVideo}
                  maxMB={50}
                  maxSeconds={15}
                />
                <MediaFileTile
                  label={t('video.refAudio')}
                  icon={AudioLines}
                  kind="audio"
                  value={seedanceAudio}
                  onChange={setSeedanceAudio}
                  maxMB={15}
                  maxSeconds={15}
                />
              </>
            )}
            {/* personagem (avatares — em breve) */}
            <button
              type="button"
              onClick={() => toast.info(t('soon'))}
              className="flex h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border border-app-hairline bg-app-surface text-app-text-2 transition-colors duration-200 ease-app hover:border-app-hairline-2 hover:text-app-text"
            >
              <UserRound className="size-[19px]" strokeWidth={1.8} />
              <span className="text-[12px] font-semibold">{t('image.persona')}</span>
            </button>
            {references.length < effectiveMaxRefs && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-app-hairline-2 text-app-text-2 transition-colors duration-200 ease-app hover:border-[rgba(162,221,0,0.4)] hover:text-app-text"
              >
                <Plus className="size-[19px]" strokeWidth={1.8} />
                <span className="text-[12px] font-semibold">{t('image.addReference')}</span>
              </button>
            )}
          </div>
        </div>
        )}

        {/* prompt */}
        <div className="flex flex-col gap-2">
          <FieldLabel>{t('image.prompt')}</FieldLabel>
          <div className="flex flex-col rounded-xl border border-app-hairline bg-app-surface transition-colors duration-200 ease-app focus-within:border-[rgba(162,221,0,0.4)]">
            <textarea
              ref={promptRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('video.promptPlaceholder')}
              rows={5}
              className="w-full resize-none bg-transparent p-3.5 text-[14px] leading-relaxed text-app-text outline-none placeholder:text-app-muted"
            />
            {/* melhorar prompt */}
            <button
              type="button"
              role="switch"
              aria-checked={enhance}
              onClick={() => setEnhance((v) => !v)}
              className="flex items-center gap-2.5 px-3.5 pb-3 text-[13px] font-medium text-app-text-2 transition-colors duration-200 ease-app hover:text-app-text"
            >
              <span
                className={cn(
                  'flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ease-app',
                  enhance ? 'bg-app-lime' : 'bg-app-card-hover',
                )}
              >
                <span
                  className={cn(
                    'size-4 rounded-full bg-app-text transition-transform duration-200 ease-app',
                    enhance && 'translate-x-4 !bg-app-lime-ink',
                  )}
                />
              </span>
              {t('image.enhance')}
            </button>
          </div>
        </div>

        {/* duração + resolução / proporção + áudio */}
        <div className="grid grid-cols-2 gap-3">
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger className={cn(selectTriggerClass, '!h-10')}>
              <Clock className="size-[15px] !text-app-lime" strokeWidth={1.8} />
              <span className="flex-1 truncate text-left font-mono text-[13px]">
                <SelectValue />
              </span>
            </SelectTrigger>
            {/* max-h: modelos como o Grok vão de 6s a 30s — sem limite a lista fica gigante */}
            <SelectContent
              position="popper"
              side="bottom"
              align="start"
              sideOffset={6}
              className={cn(selectContentClass, '!max-h-[240px]')}
            >
              {modelConfig.durations.map((d) => (
                <SelectItem key={d} value={d} className={cn(selectItemClass, 'font-mono')}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* resolução (opções variam por modelo) */}
          <Select value={resolution} onValueChange={setResolution}>
            <SelectTrigger className={cn(selectTriggerClass, '!h-10')}>
              <Hd className="size-[15px] !text-app-lime" strokeWidth={1.8} />
              <span className="flex-1 truncate text-left font-mono text-[13px]">
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" align="start" sideOffset={6} className={selectContentClass}>
              {modelConfig.resolutions.map((r) => (
                <SelectItem key={r.value} value={r.value} className={cn(selectItemClass, 'font-mono')}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* proporção (opções variam por modelo) */}
          <Select value={aspect} onValueChange={setAspect}>
            <SelectTrigger className={cn(selectTriggerClass, '!h-10')}>
              <SquarePlay className="size-[15px] !text-app-lime" strokeWidth={1.8} />
              <span className="flex-1 truncate text-left font-mono text-[13px]">
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" align="start" sideOffset={6} className={selectContentClass}>
              {modelConfig.aspects.map((a) => (
                <SelectItem key={a.value} value={a.value} className={cn(selectItemClass, 'font-mono')}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* toggle de áudio (design 6.9: ON = lime); travado quando o modelo força */}
          <button
            type="button"
            role="switch"
            aria-checked={effectiveAudio}
            disabled={audioLocked}
            onClick={() => setAudio((v) => !v)}
            className={cn(
              'flex h-10 items-center gap-2 rounded-[10px] border px-3.5 text-[13px] font-semibold transition-colors duration-200 ease-app',
              effectiveAudio
                ? 'border-[rgba(162,221,0,0.5)] text-app-lime'
                : 'border-app-hairline bg-app-surface text-app-text-2 hover:text-app-text',
              audioLocked && 'cursor-not-allowed opacity-70',
            )}
          >
            {effectiveAudio ? (
              <Volume2 className="size-[15px]" strokeWidth={1.8} />
            ) : (
              <VolumeOff className="size-[15px]" strokeWidth={1.8} />
            )}
            {t('video.audio')}
            <span className="font-mono text-[11px]">
              {effectiveAudio ? t('video.audioOn') : t('video.audioOff')}
            </span>
          </button>
        </div>
        </>
        )}

        {/* gerar */}
        <button
          type="button"
          onClick={generate}
          disabled={!canGenerate || submitting}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-app-lime text-[14.5px] font-semibold text-app-lime-ink transition-colors duration-200 ease-app hover:bg-app-lime-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <>
              <RefreshCw className="size-[16px] animate-spin" strokeWidth={2} />
              {t('image.generating')}
            </>
          ) : (
            <>
              {t('image.generate')}
              <Wand2 className="size-[16px]" strokeWidth={2} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
