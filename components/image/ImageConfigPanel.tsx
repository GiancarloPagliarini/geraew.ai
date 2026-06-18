'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertCircle,
  Hd,
  Image as ImageIcon,
  Infinity as InfinityIcon,
  Minus,
  Plus,
  RefreshCw,
  Replace,
  ScanFace,
  Shirt,
  UserRound,
  Wand2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, ApiError, type CreditsEstimateRequest } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLoginModal } from '@/lib/login-modal-context';
import type { PendingGeneration } from '@/components/image/types';
import { useGenerationTracker } from '@/components/image/use-generation-tracker';
import { useGenerationErrorMessage } from '@/lib/use-generation-error';
import { ImageDropTile, type UploadedImage } from '@/components/image/ImageDropTile';
import { GenerationCostEstimate } from '@/components/app/GenerationCostEstimate';
import { UnlimitedToggle } from '@/components/editor/UnlimitedToggle';
import { UnlimitedUpgradeModal } from '@/components/editor/UnlimitedUpgradeModal';
import {
  useUnlimitedStatus,
  isModelSlugInUnlimitedPlan,
  isUnlimitedModelAllowed,
  getModelVariantFromSlug,
  getFirstUnlimitedSlugForType,
  getFirstUnlimitedResolutionForVariant,
} from '@/hooks/use-unlimited-status';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MAX_REFERENCES = 8;
const MAX_QUANTITY = 4;
const REF_ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const REF_MAX_BYTES = 5 * 1024 * 1024;
// proporções do provador virtual / troca de rosto
const ASPECT_RATIOS = ['1:1', '4:5', '3:4', '16:9', '9:16'];

// ── Capacidades por modelo de imagem (espelha o painel do workspace) ──
const R1K = { value: 'RES_1K', label: '1K' };
const R2K = { value: 'RES_2K', label: '2K' };
const R3K = { value: 'RES_3K', label: '3K' };
const R4K = { value: 'RES_4K', label: '4K' };
const ASPECTS_DEFAULT = ['9:16', '1:1', '4:3', '16:9'];
const ASPECTS_SEEDREAM = ['1:1', '4:3', '3:4', '16:9', '9:16', '2:3', '3:2', '21:9'];

type ToolId = 'generate' | 'try-on' | 'face-swap' | 'upscale';

const TOOLS: { id: ToolId; labelKey: string; icon: LucideIcon }[] = [
  { id: 'generate', labelKey: 'toolGenerateImages', icon: ImageIcon },
  { id: 'try-on', labelKey: 'toolTryon', icon: Shirt },
  { id: 'face-swap', labelKey: 'toolFaceSwap', icon: Replace },
  { id: 'upscale', labelKey: 'toolUpscale', icon: Wand2 },
];

interface ImageModelConfig {
  value: string;
  label: string;
  /** variante usada no pricing (/credits/estimate) */
  variant: string;
  /** resoluções aceitas pelo modelo, na ordem de exibição */
  resolutions: { value: string; label: string }[];
  defaultResolution: string;
  /** proporções aceitas */
  aspects: string[];
  defaultAspect: string;
  /** suporta "melhorar prompt" (sem-censura não suporta) */
  enhance: boolean;
  /** exibe badge "Novo" no seletor */
  isNew?: boolean;
}

/**
 * Modelos base do gerador (merge com os do banco quando disponíveis).
 * Cada modelo expõe apenas as resoluções/proporções que de fato suporta:
 * - Seedream Lite: somente 2K e 3K (sem 1K/4K), com proporções extras.
 * - Geraew Unlocked (sem-censura): somente 2K e 4K (sem 1K) e sem melhorar prompt.
 * - GPT Image 2: 1K/2K/4K, mas 4K é bloqueado na proporção 1:1.
 * - Nano Banana 2 / Pro: 1K/2K/4K.
 */
const IMAGE_MODELS: ImageModelConfig[] = [
  { value: 'gpt-image-2', label: 'GPT Image 2', variant: 'GPT_IMAGE_2', resolutions: [R4K, R2K, R1K], defaultResolution: 'RES_2K', aspects: ASPECTS_DEFAULT, defaultAspect: '1:1', enhance: true, isNew: true },
  { value: 'seedream-5-lite', label: 'Seedream Lite', variant: 'SEEDREAM_LITE', resolutions: [R3K, R2K], defaultResolution: 'RES_2K', aspects: ASPECTS_SEEDREAM, defaultAspect: '1:1', enhance: true, isNew: true },
  { value: 'gemini-3.1-flash-image-preview', label: 'Nano Banana 2', variant: 'NB2', resolutions: [R4K, R2K, R1K], defaultResolution: 'RES_2K', aspects: ASPECTS_DEFAULT, defaultAspect: '1:1', enhance: true },
  { value: 'gemini-3-pro-image-preview', label: 'Nano Banana Pro', variant: 'NBP', resolutions: [R4K, R2K, R1K], defaultResolution: 'RES_2K', aspects: ASPECTS_DEFAULT, defaultAspect: '1:1', enhance: true },
  { value: 'sem-censura', label: 'Geraew Unlocked', variant: 'SEM_CENSURA', resolutions: [R4K, R2K], defaultResolution: 'RES_2K', aspects: ASPECTS_DEFAULT, defaultAspect: '1:1', enhance: false },
];

/** Mesmo modelo fixo usado pelo painel de Upscale do workspace. */
const UPSCALE_MODEL = 'gemini-3-pro-image-preview';

const FACESWAP_RESOLUTIONS = ['1K', '2K', '4K'];
const FACESWAP_RES_TO_DB: Record<string, string> = { '1K': 'RES_1K', '2K': 'RES_2K', '4K': 'RES_4K' };
const TRYON_RESOLUTIONS = [
  { value: 'RES_1K', label: '1K' },
  { value: 'RES_2K', label: '2K' },
  { value: 'RES_4K', label: '4K' },
];

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

interface ImageConfigPanelProps {
  /** aba inativa: fica montada (mantém estado e polling) porém oculta */
  hidden?: boolean;
  initialPrompt?: string;
  /** ferramenta pré-selecionada (vinda do ?tool= na URL) */
  initialTool?: ToolId;
  /** URL de imagem para anexar como referência inicial (ex.: produto do TikTok Shop) */
  initialRefUrl?: string;
  /** gerações em andamento desta aba (com url quando concluem, para revelar no preview) */
  onPendingChange: (pending: PendingGeneration[]) => void;
  /** registra a função que foca o prompt desta aba */
  registerFocus?: (focus: () => void) => void;
}

/** Painel de configuração de uma aba de geração de imagens. */
export function ImageConfigPanel({
  hidden = false,
  initialPrompt,
  initialTool,
  initialRefUrl,
  onPendingChange,
  registerFocus,
}: ImageConfigPanelProps) {
  const t = useTranslations('home');
  const tUnlimited = useTranslations('editorPanels.unlimited');
  const { user, accessToken } = useAuth();
  const { openLoginModal } = useLoginModal();

  const [tool, setTool] = useState<ToolId>(initialTool ?? 'generate');

  // modo ilimitado
  const [unlimited, setUnlimited] = useState(false);
  const [unlimitedModalOpen, setUnlimitedModalOpen] = useState(false);
  const { data: unlimitedStatus } = useUnlimitedStatus();

  // gerar imagens
  const [model, setModel] = useState(IMAGE_MODELS[0].value);
  const [references, setReferences] = useState<UploadedImage[]>([]);
  const [prompt, setPrompt] = useState(initialPrompt ?? '');
  const [enhance, setEnhance] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [aspect, setAspect] = useState(IMAGE_MODELS[0].defaultAspect);
  const [resolution, setResolution] = useState(IMAGE_MODELS[0].defaultResolution);

  const modelConfig = IMAGE_MODELS.find((m) => m.value === model) ?? IMAGE_MODELS[0];

  // GPT Image 2 não suporta 4K com proporção 1:1 (mesma regra do workspace)
  const is4kBlocked = (m: string, a: string) => m === 'gpt-image-2' && a === '1:1';

  // ao trocar de modelo, coage proporção e resolução para o que o modelo aceita
  const selectGenModel = (value: string) => {
    setModel(value);
    const cfg = IMAGE_MODELS.find((m) => m.value === value);
    if (!cfg) return;
    if (!cfg.enhance) setEnhance(false);
    const nextAspect = cfg.aspects.includes(aspect) ? aspect : cfg.defaultAspect;
    if (nextAspect !== aspect) setAspect(nextAspect);
    const blocked = (r: string) => r === 'RES_4K' && value === 'gpt-image-2' && nextAspect === '1:1';
    const stillValid = cfg.resolutions.some((r) => r.value === resolution) && !blocked(resolution);
    if (!stillValid) {
      const fallback = blocked(cfg.defaultResolution)
        ? cfg.resolutions.find((r) => !blocked(r.value))?.value ?? cfg.defaultResolution
        : cfg.defaultResolution;
      setResolution(fallback);
    }
  };
  const selectAspect = (value: string) => {
    setAspect(value);
    if (is4kBlocked(model, value) && resolution === 'RES_4K') setResolution('RES_2K');
  };

  // ── modo ilimitado ──
  // ao ativar: garante que modelo + resolução estão liberados no plano,
  // trocando automaticamente quando o atual está fora.
  const handleToggleUnlimited = (next: boolean) => {
    if (!next) {
      setUnlimited(false);
      return;
    }
    let targetModel = model;
    if (!isModelSlugInUnlimitedPlan(unlimitedStatus, model)) {
      const fallbackSlug = getFirstUnlimitedSlugForType(unlimitedStatus, 'image');
      if (!fallbackSlug) {
        toast.info(tUnlimited('errors.noImagePlan'));
        setUnlimitedModalOpen(true);
        return;
      }
      selectGenModel(fallbackSlug);
      targetModel = fallbackSlug;
    }
    const targetVariant = getModelVariantFromSlug(targetModel);
    if (!isUnlimitedModelAllowed(unlimitedStatus, targetVariant, resolution)) {
      const fallbackResolution = getFirstUnlimitedResolutionForVariant(unlimitedStatus, targetVariant);
      if (fallbackResolution) setResolution(fallbackResolution);
    }
    setUnlimited(true);
  };

  // desliga o ilimitado se o modelo selecionado sair do plano
  useEffect(() => {
    if (!unlimited) return;
    if (!isModelSlugInUnlimitedPlan(unlimitedStatus, model)) setUnlimited(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, unlimitedStatus]);

  /** Trata erros específicos do modo ilimitado. Retorna true se tratou. */
  const handleUnlimitedError = (err: ApiError): boolean => {
    if (err.code === 'UNLIMITED_PLAN_REQUIRED' || err.code === 'UNLIMITED_MODEL_NOT_ALLOWED') {
      setUnlimited(false);
      setUnlimitedModalOpen(true);
      return true;
    }
    if (err.code === 'UNLIMITED_DAILY_CAP_REACHED') {
      toast.error(tUnlimited('errors.serverBusy'));
      return true;
    }
    if (err.code === 'UNLIMITED_LOCK_HELD') {
      toast.error(tUnlimited('errors.lockHeld'));
      return true;
    }
    return false;
  };

  // provador virtual
  const [tryonPerson, setTryonPerson] = useState<UploadedImage | null>(null);
  const [tryonClothing, setTryonClothing] = useState<UploadedImage | null>(null);
  const [tryonInstructions, setTryonInstructions] = useState('');
  const [tryonResolution, setTryonResolution] = useState('RES_2K');
  const [tryonAspect, setTryonAspect] = useState('3:4');

  // troca de rosto
  const [fsSource, setFsSource] = useState<UploadedImage | null>(null);
  const [fsTarget, setFsTarget] = useState<UploadedImage | null>(null);
  const [fsResolution, setFsResolution] = useState('2K');

  // upscale
  const [upscaleImage, setUpscaleImage] = useState<UploadedImage | null>(null);

  const [submitting, setSubmitting] = useState(false);
  // banner de erro acima do botão Gerar — só some ao gerar de novo
  const [generationError, setGenerationError] = useState<string | null>(null);
  // contador (e não boolean) para o dragleave dos filhos não piscar o overlay
  const [dragDepth, setDragDepth] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const { pending, track } = useGenerationTracker({ onError: setGenerationError });
  const mapError = useGenerationErrorMessage();

  useEffect(() => {
    onPendingChange(pending);
  }, [pending, onPendingChange]);

  useEffect(() => {
    registerFocus?.(() => promptRef.current?.focus());
  }, [registerFocus]);

  // modelos do banco sobrescrevem labels/disponibilidade dos base
  const modelsQuery = useQuery({
    queryKey: ['models', 'image'],
    queryFn: () => api.models.listImages(),
    staleTime: 60_000,
  });

  const modelOptions = useMemo(() => {
    const dbBySlug = new Map((modelsQuery.data ?? []).map((m) => [m.slug, m]));
    return IMAGE_MODELS.map((opt) => {
      const dbModel = dbBySlug.get(opt.value);
      return {
        value: opt.value,
        label: dbModel?.label ?? opt.label,
        disabled: dbModel ? !dbModel.isActive : false,
        isNew: !!opt.isNew,
      };
    });
  }, [modelsQuery.data]);

  // variante do modelo p/ pricing
  const imageModelVariant = modelConfig.variant;

  // estimativa de créditos por geração — varia conforme a ferramenta/config
  const estimateQuery = useQuery({
    queryKey: ['credits', 'estimate', 'image', tool, references.length > 0, resolution, imageModelVariant, tryonResolution, fsResolution],
    queryFn: () => {
      const req: CreditsEstimateRequest =
        tool === 'generate'
          ? {
              type: references.length > 0 ? 'IMAGE_TO_IMAGE' : 'TEXT_TO_IMAGE',
              resolution,
              modelVariant: imageModelVariant,
            }
          : tool === 'try-on'
            ? { type: 'IMAGE_TO_IMAGE', resolution: tryonResolution, hasAudio: false, freeGenerationType: 'VIRTUAL_TRY_ON' }
            : tool === 'face-swap'
              ? { type: 'IMAGE_TO_IMAGE', resolution: FACESWAP_RES_TO_DB[fsResolution] ?? 'RES_2K', hasAudio: false, freeGenerationType: 'FACE_SWAP' }
              : { type: 'IMAGE_TO_IMAGE', resolution: 'RES_2K', modelVariant: 'NBP', freeGenerationType: 'UPSCALE' };
      return api.credits.estimate(accessToken!, req);
    },
    enabled: !!accessToken && !!user,
    staleTime: 30_000,
  });
  const estimate = estimateQuery.data;

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
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setReferences((prev) => {
          if (prev.length >= MAX_REFERENCES) {
            toast.error(t('image.refMax', { max: MAX_REFERENCES }));
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

  // anexa a imagem inicial (ex.: produto do TikTok Shop) como referência, uma vez
  const initialRefLoaded = useRef(false);
  useEffect(() => {
    if (!initialRefUrl || initialRefLoaded.current) return;
    initialRefLoaded.current = true;
    (async () => {
      try {
        const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(initialRefUrl)}`);
        if (!res.ok) return;
        const blob = await res.blob();
        if (blob.size > REF_MAX_BYTES) return;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setReferences((prev) =>
            prev.length >= MAX_REFERENCES
              ? prev
              : [...prev, { base64: dataUrl.split(',')[1], mime_type: blob.type || 'image/jpeg', preview: dataUrl }],
          );
        };
        reader.readAsDataURL(blob);
      } catch {
        /* sem referência — segue sem ela */
      }
    })();
  }, [initialRefUrl]);

  const canGenerate = (() => {
    switch (tool) {
      case 'generate':
        return !!prompt.trim();
      case 'try-on':
        return !!tryonPerson && !!tryonClothing;
      case 'face-swap':
        return !!fsSource && !!fsTarget;
      case 'upscale':
        return !!upscaleImage;
    }
  })();

  const generate = async () => {
    if (!canGenerate || submitting) return;
    if (!user || !accessToken) {
      openLoginModal({ mode: 'login' });
      return;
    }
    setGenerationError(null); // limpa o banner de erro ao gerar de novo
    setSubmitting(true);
    try {
      if (tool === 'generate') {
        let finalPrompt = prompt.trim();
        if (enhance) {
          try {
            const { enhancedPrompt } = await api.promptEnhancer.enhance(
              accessToken,
              finalPrompt,
              {
                type: 'image',
                model,
                resolution,
                aspectRatio: aspect,
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

        // no ilimitado é 1 por vez (há lock que impede gerações concorrentes)
        const genCount = unlimited ? 1 : quantity;
        const requests = Array.from({ length: genCount }, () =>
          api.generations.generateImage(accessToken, {
            prompt: finalPrompt,
            model,
            resolution: resolution as 'RES_1K' | 'RES_2K' | 'RES_3K' | 'RES_4K',
            aspect_ratio: aspect,
            mime_type: 'image/png',
            ...(references.length > 0 && {
              images: references.map(({ base64, mime_type }) => ({ base64, mime_type })),
            }),
            ...(unlimited && { unlimited: true }),
          }),
        );
        const results = await Promise.allSettled(requests);
        const ids = results.filter((r) => r.status === 'fulfilled').map((r) => r.value.id);
        const firstFailure = results.find((r) => r.status === 'rejected') as
          | PromiseRejectedResult
          | undefined;
        if (firstFailure) {
          const reason = firstFailure.reason;
          // erros específicos do modo ilimitado têm tratamento próprio
          if (reason instanceof ApiError && handleUnlimitedError(reason)) {
            // tratado (modal/toast) — não mostra o banner genérico
          } else {
            const msg = mapError(reason instanceof ApiError || reason instanceof Error ? reason.message : null);
            toast.error(msg);
            setGenerationError(msg);
          }
        }
        ids.forEach((id) => track(id, finalPrompt, undefined, unlimited));
        return;
      }

      if (tool === 'try-on') {
        const { id } = await api.generations.virtualTryOn(accessToken, {
          influencer_image: tryonPerson!.base64,
          influencer_image_mime_type: tryonPerson!.mime_type,
          clothing_image: tryonClothing!.base64,
          clothing_image_mime_type: tryonClothing!.mime_type,
          additional_instructions: tryonInstructions.trim() || undefined,
          resolution: tryonResolution,
          aspect_ratio: tryonAspect,
        });
        track(id, tryonInstructions.trim() || t('image.toolTryon'));
        return;
      }

      if (tool === 'face-swap') {
        const { id } = await api.generations.faceSwap(accessToken, {
          source_image: fsSource!.base64,
          source_image_mime_type: fsSource!.mime_type,
          target_image: fsTarget!.base64,
          target_image_mime_type: fsTarget!.mime_type,
          resolution: fsResolution,
        });
        track(id, t('image.toolFaceSwap'));
        return;
      }

      // upscale
      const { id } = await api.generations.upscale(accessToken, {
        image: upscaleImage!.base64,
        mime_type: upscaleImage!.mime_type as 'image/jpeg' | 'image/png',
        model: UPSCALE_MODEL,
      });
      track(id, t('image.toolUpscale'));
    } catch (err) {
      const msg = mapError(err instanceof ApiError || err instanceof Error ? err.message : null);
      toast.error(msg);
      setGenerationError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // painel de configuração — no modo gerar, aceita soltar imagens como referência
    <div
      className={cn(
        'relative flex w-full min-h-0 flex-1 flex-col border-b border-app-hairline lg:w-[360px] lg:flex-none lg:border-b-0 lg:border-r',
        hidden && 'hidden',
      )}
      onDragEnter={(e) => {
        if (tool === 'generate' && e.dataTransfer.types.includes('Files')) {
          setDragDepth((c) => c + 1);
        }
      }}
      onDragLeave={() => setDragDepth((c) => Math.max(0, c - 1))}
      onDragOver={(e) => {
        if (tool === 'generate') e.preventDefault();
      }}
      onDrop={(e) => {
        if (tool !== 'generate') return;
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
          <Select value={tool} onValueChange={(v) => setTool(v as ToolId)}>
            {/* o ícone vem junto no SelectValue (clonado do item selecionado); como
                filho direto do trigger, o estilo do shadcn o alinha em linha */}
            <SelectTrigger className={cn(selectTriggerClass, 'justify-start [&>span:first-child]:flex-1')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" align="start" sideOffset={6} className={selectContentClass}>
              {TOOLS.map(({ id, labelKey, icon: OptIcon }) => (
                <SelectItem key={id} value={id} className={selectItemClass}>
                  <OptIcon className="size-[15px] !text-app-lime" strokeWidth={1.8} />
                  {t(`image.${labelKey}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Gerar imagens ── */}
        {tool === 'generate' && (
          <>
            {/* modelo */}
            <div className="flex flex-col gap-2">
              <FieldLabel>{t('image.model')}</FieldLabel>
              <Select value={model} onValueChange={selectGenModel}>
                <SelectTrigger className={selectTriggerClass}>
                  <ImageIcon className="size-[16px] !text-app-lime" strokeWidth={1.8} />
                  <span className="flex-1 truncate text-left">
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" sideOffset={6} className={selectContentClass}>
                  {modelOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled} className={selectItemClass}>
                      <span className="flex items-center gap-1.5">
                        {opt.label}
                        {unlimited && isModelSlugInUnlimitedPlan(unlimitedStatus, opt.value) && (
                          <InfinityIcon className="size-3.5 text-[#a855f7]" strokeWidth={2} />
                        )}
                        {opt.isNew && (
                          <span className="rounded-full border border-app-lime/40 bg-app-lime/15 px-1.5 py-px text-[8px] font-bold uppercase tracking-[0.1em] text-app-lime">
                            {t('newBadge')}
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* referências */}
            <div className="flex flex-col gap-2">
              <FieldLabel
                right={
                  <span className="font-mono text-[11px] text-app-muted">
                    {references.length}/{MAX_REFERENCES}
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
                {references.length < MAX_REFERENCES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-app-hairline-2 text-app-text-2 transition-colors duration-200 ease-app hover:border-[rgba(162,221,0,0.4)] hover:text-app-text"
                  >
                    <ImageIcon className="size-[19px]" strokeWidth={1.8} />
                    <span className="text-[12px] font-semibold">{t('image.addReference')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* prompt */}
            <div className="flex flex-col gap-2">
              <FieldLabel>{t('image.prompt')}</FieldLabel>
              <div className="flex flex-col rounded-xl border border-app-hairline bg-app-surface transition-colors duration-200 ease-app focus-within:border-[rgba(162,221,0,0.4)]">
                <textarea
                  ref={promptRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t('image.promptPlaceholder')}
                  rows={5}
                  className="w-full resize-none bg-transparent px-3.5 pb-2.5 pt-3.5 text-[14px] leading-relaxed text-app-text outline-none placeholder:text-app-muted"
                />
                {/* melhorar prompt (modelos sem suporte, ex.: sem-censura, ocultam) */}
                {modelConfig.enhance && (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enhance}
                    onClick={() => setEnhance((v) => !v)}
                    className="flex items-center gap-2.5 border-t border-app-hairline px-3.5 py-3 text-[13px] font-medium text-app-text-2 transition-colors duration-200 ease-app hover:text-app-text"
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
                )}
              </div>
            </div>

            {/* quantidade + proporção */}
            <div className="flex items-center gap-3">
              {/* no ilimitado é 1 por vez (lock impede gerações simultâneas) */}
              <div className={cn('flex h-10 items-center rounded-[10px] border border-app-hairline bg-app-surface', unlimited && 'opacity-50')}>
                <button
                  type="button"
                  aria-label={t('image.less')}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-full w-9 items-center justify-center text-app-text-2 transition-colors duration-200 ease-app hover:text-app-text disabled:opacity-40"
                  disabled={unlimited || quantity <= 1}
                >
                  <Minus className="size-3.5" strokeWidth={2} />
                </button>
                <span className="w-6 text-center font-mono text-[13.5px] font-semibold text-app-text">
                  {unlimited ? 1 : quantity}
                </span>
                <button
                  type="button"
                  aria-label={t('image.more')}
                  onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
                  className="flex h-full w-9 items-center justify-center text-app-text-2 transition-colors duration-200 ease-app hover:text-app-text disabled:opacity-40"
                  disabled={unlimited || quantity >= MAX_QUANTITY}
                >
                  <Plus className="size-3.5" strokeWidth={2} />
                </button>
              </div>

              {/* resolução (opções variam por modelo; GPT Image 2 bloqueia 4K em 1:1) */}
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger className={cn(selectTriggerClass, '!h-10 flex-1')}>
                  <Hd className="size-[15px] !text-app-lime" strokeWidth={1.8} />
                  <span className="flex-1 truncate text-left font-mono text-[13px]">
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" sideOffset={6} className={selectContentClass}>
                  {modelConfig.resolutions.map((r) => (
                    <SelectItem
                      key={r.value}
                      value={r.value}
                      disabled={r.value === 'RES_4K' && is4kBlocked(model, aspect)}
                      className={cn(selectItemClass, 'font-mono')}
                    >
                      <span className="flex items-center gap-1.5">
                        {r.label}
                        {unlimited && isUnlimitedModelAllowed(unlimitedStatus, imageModelVariant, r.value) && (
                          <InfinityIcon className="size-3.5 text-[#a855f7] [[data-slot=select-trigger]_&]:hidden" strokeWidth={2} />
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* proporção (opções variam por modelo) */}
              <Select value={aspect} onValueChange={selectAspect}>
                <SelectTrigger className={cn(selectTriggerClass, '!h-10 flex-1')}>
                  <ImageIcon className="size-[15px] !text-app-lime" strokeWidth={1.8} />
                  <span className="flex-1 truncate text-left font-mono text-[13px]">
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" sideOffset={6} className={selectContentClass}>
                  {modelConfig.aspects.map((r) => (
                    <SelectItem key={r} value={r} className={cn(selectItemClass, 'font-mono')}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* modo ilimitado */}
            <UnlimitedToggle
              enabled={unlimited}
              onToggle={handleToggleUnlimited}
              onRequireUpgrade={() => setUnlimitedModalOpen(true)}
              eligible={unlimitedStatus?.eligible ?? false}
              className="px-3.5 py-3"
            />
          </>
        )}

        {/* ── Provador Virtual ── */}
        {tool === 'try-on' && (
          <>
            <div className="flex flex-col gap-2">
              <FieldLabel>{t('image.references')}</FieldLabel>
              <div className="grid grid-cols-2 gap-3">
                <ImageDropTile label={t('image.person')} icon={UserRound} value={tryonPerson} onChange={setTryonPerson} />
                <ImageDropTile label={t('image.clothing')} icon={Shirt} value={tryonClothing} onChange={setTryonClothing} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel>{t('image.instructions')}</FieldLabel>
              <textarea
                value={tryonInstructions}
                onChange={(e) => setTryonInstructions(e.target.value)}
                placeholder={t('image.instructionsPlaceholder')}
                rows={3}
                className="w-full resize-none rounded-xl border border-app-hairline bg-app-surface p-3.5 text-[14px] leading-relaxed text-app-text outline-none transition-colors duration-200 ease-app placeholder:text-app-muted focus:border-[rgba(162,221,0,0.4)]"
              />
            </div>

            <div className="flex items-center gap-3">
              <Select value={tryonResolution} onValueChange={setTryonResolution}>
                <SelectTrigger className={cn(selectTriggerClass, '!h-10 flex-1')}>
                  <Hd className="size-[15px] !text-app-lime" strokeWidth={1.8} />
                  <span className="flex-1 truncate text-left font-mono text-[13px]">
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" sideOffset={6} className={selectContentClass}>
                  {TRYON_RESOLUTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value} className={cn(selectItemClass, 'font-mono')}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={tryonAspect} onValueChange={setTryonAspect}>
                <SelectTrigger className={cn(selectTriggerClass, '!h-10 w-[110px]')}>
                  <ImageIcon className="size-[15px] !text-app-lime" strokeWidth={1.8} />
                  <span className="flex-1 truncate text-left font-mono text-[13px]">
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" sideOffset={6} className={selectContentClass}>
                  {ASPECT_RATIOS.map((r) => (
                    <SelectItem key={r} value={r} className={cn(selectItemClass, 'font-mono')}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* ── Troca de Rosto ── */}
        {tool === 'face-swap' && (
          <>
            <div className="flex flex-col gap-2">
              <FieldLabel>{t('image.references')}</FieldLabel>
              <div className="grid grid-cols-2 gap-3">
                <ImageDropTile label={t('image.face')} icon={ScanFace} value={fsSource} onChange={setFsSource} />
                <ImageDropTile label={t('image.targetImage')} icon={ImageIcon} value={fsTarget} onChange={setFsTarget} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel>{t('image.resolution')}</FieldLabel>
              <Select value={fsResolution} onValueChange={setFsResolution}>
                <SelectTrigger className={cn(selectTriggerClass, '!h-10')}>
                  <Hd className="size-[15px] !text-app-lime" strokeWidth={1.8} />
                  <span className="flex-1 truncate text-left font-mono text-[13px]">
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start" sideOffset={6} className={selectContentClass}>
                  {FACESWAP_RESOLUTIONS.map((r) => (
                    <SelectItem key={r} value={r} className={cn(selectItemClass, 'font-mono')}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* ── Upscale ── */}
        {tool === 'upscale' && (
          <div className="flex flex-col gap-2">
            <FieldLabel>{t('image.imageToUpscale')}</FieldLabel>
            <ImageDropTile
              label={t('image.imageToUpscale')}
              value={upscaleImage}
              onChange={setUpscaleImage}
              accept={['image/jpeg', 'image/png']}
              className="h-[160px]"
            />
          </div>
        )}

        {/* estimativa de custo por geração */}
        <GenerationCostEstimate
          credits={estimate?.creditsRequired}
          loading={estimateQuery.isLoading}
          free={!!estimate?.canUseFreeGeneration}
          freeRemaining={estimate?.freeGenerationsRemainingForType}
          count={tool === 'generate' ? quantity : 1}
          unlimited={tool === 'generate' && unlimited}
        />

        {/* banner de erro — persiste até gerar de novo */}
        {generationError && (
          <div className="flex items-start gap-2.5 rounded-[10px] border border-red-500/25 bg-red-500/[0.07] p-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-400" strokeWidth={1.8} />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-app-text">{t('image.errorTitle')}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-app-text-2">{generationError}</p>
            </div>
          </div>
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

      {unlimitedModalOpen && (
        <UnlimitedUpgradeModal onClose={() => setUnlimitedModalOpen(false)} />
      )}
    </div>
  );
}
