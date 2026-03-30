'use client';

import { Coins, Loader2, PersonStanding, Sparkles, X } from 'lucide-react';
import { GenerationErrorBanner, showGenerationError } from './GenerationError';
import { PanelDuplicateButton } from './PanelDuplicateButton';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useEditor } from '@/lib/editor-context';
import { useAuth } from '@/lib/auth-context';
import { useInfluencerBuilder } from '@/lib/influencer-builder-context';
import { api } from '@/lib/api';
import { listenGeneration } from '@/lib/sse';
import { GenerationPreview } from './GenerationPreview';

// ─── types ────────────────────────────────────────────────────────────────────

type GenState = 'idle' | 'generating' | 'done';

// SVG circle metrics
const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const LOADING_MESSAGES = [
  'CRIANDO SUA INFLUENCER...',
  'AJUSTANDO TRAÇOS FACIAIS...',
  'APLICANDO ESTILO ÚNICO...',
  'REFINANDO DETALHES...',
  'QUASE LÁ...',
  'ADICIONANDO UM TOQUE DE MAGIA...',
  'CONSULTANDO OS PIXELS...',
  'SONHANDO EM ALTA RESOLUÇÃO...',
];

// ─── component ────────────────────────────────────────────────────────────────

interface CreateInfluencerPanelProps {
  nodeId: string;
  onClose?: () => void;
  onDuplicate?: () => void;
}

export function CreateInfluencerPanel({ nodeId, onClose, onDuplicate }: CreateInfluencerPanelProps) {
  const { setNodeImage, consumeCredits, refetchCredits, prependToGallery, setNodeGenerating } = useEditor();
  const { accessToken } = useAuth();
  const { selections, referenceImage } = useInfluencerBuilder();

  const [genState, setGenState] = useState<GenState>('idle');
  useEffect(() => {
    setNodeGenerating(nodeId, genState === 'generating');
    return () => setNodeGenerating(nodeId, false);
  }, [genState, nodeId, setNodeGenerating]);
  const [progress, setProgress] = useState(0);
  const [imageVisible, setImageVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);

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
      // imageVisible set via onLoad on <img> inside GenerationPreview
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
          setErrorMsg(showGenerationError({ errorMessage: generation.errorMessage, fallback: 'Erro ao gerar influencer.' }));
          refetchCredits();
        }
      } catch {
        clearPollTimer();
        clearProgressTimer();
        clearMsgTimer();
        setGenState('idle');
        setErrorMsg(showGenerationError({ fallback: 'Erro ao verificar status da geração.' }));
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

    startProgressAnimation();

    try {
      // Call AI agent to build structured JSON prompt with varied scenes
      const { enhancedPrompt } = await api.promptEnhancer.enhanceInfluencer(
        accessToken,
        selections as unknown as Record<string, string>,
        referenceImage ? { base64: referenceImage.base64, mimeType: referenceImage.mimeType } : undefined,
      );

      const generatePayload: Parameters<typeof api.generations.generateImage>[1] = {
        prompt: enhancedPrompt,
        model: 'gemini-3-pro-image-preview',
        resolution: 'RES_2K',
        aspect_ratio: '9:16',
        mime_type: 'image/png',
      };

      // When using a reference image, send it as input image for image-to-image generation
      if (referenceImage) {
        generatePayload.images = [{ base64: referenceImage.base64, mime_type: referenceImage.mimeType }];
      }

      const { id, creditsConsumed } = await api.generations.generateImage(accessToken, generatePayload);

      consumeCredits(creditsConsumed);

      sseControllerRef.current = listenGeneration(id, accessToken, {
        onCompleted: ({ generationId: genId, outputUrls }) => {
          finishWithImage(outputUrls[0]);
          refetchCredits();
          api.generations.get(accessToken!, genId).then(prependToGallery).catch(() => {});
        },
        onFailed: ({ errorMessage, creditsRefunded }) => {
          clearProgressTimer();
          clearMsgTimer();
          setGenState('idle');
          setErrorMsg(showGenerationError({ errorMessage, creditsRefunded, fallback: 'Erro ao gerar influencer.' }));
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

  useEffect(
    () => () => {
      clearProgressTimer();
      clearMsgTimer();
      clearPollTimer();
      clearSSE();
    },
    [],
  );

  const { data: estimate, isLoading: estimateLoading } = useQuery({
    queryKey: ['credits', 'estimate', 'TEXT_TO_IMAGE', 'RES_2K', 'NBP'],
    queryFn: () => api.credits.estimate(accessToken!, { type: 'TEXT_TO_IMAGE', resolution: 'RES_2K', modelVariant: 'NBP' }),
    enabled: !!accessToken && genState !== 'generating',
    staleTime: 30_000,
  });

  const dashOffset = CIRCUMFERENCE * (1 - progress / 100);

  return (
    <div className="w-[320px] overflow-hidden rounded-2xl border border-[#f3f0ed]/[0.08] bg-[#1a2123] shadow-2xl shadow-black/50">
      {/* Header — drag handle */}
      <div className="panel-drag-handle flex cursor-grab items-center justify-between border-b border-[#f3f0ed]/[0.07] px-4 py-3 active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <PersonStanding className="h-4 w-4 text-[#a2dd00]" />
          <span className="text-xs font-bold tracking-[0.15em] text-[#f3f0ed]/90">
            AI INFLUENCER
          </span>
        </div>
        <div className="flex items-center gap-1">
          <PanelDuplicateButton onClick={onDuplicate} />
          <button
            onClick={(e) => { e.stopPropagation(); onClose?.(); }}
            className="flex h-6 w-6 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/8 hover:text-[#f3f0ed]/80"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* ── Error message ────────────────────────────────────────────── */}
        <GenerationErrorBanner msg={errorMsg} />

{/* ── Idle state — empty placeholder ────────────────────────── */}
        {genState === 'idle' && !generatedImageUrl && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#f3f0ed]/10 bg-[#1e494b]/10 px-4 py-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3f0ed]/[0.05]">
              <PersonStanding className="h-6 w-6 text-[#f3f0ed]/25" />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-[#f3f0ed]/60">
                Sua AI influencer mora aqui.
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-[#f3f0ed]/25">
                Configure na sidebar e clique em gerar
              </p>
            </div>
          </div>
        )}

        {/* ── Generation preview (aurora + crossfade) ───────────────── */}
        <GenerationPreview
          proportion="9-16"
          genState={genState}
          imageVisible={imageVisible}
          onImageLoad={() => setImageVisible(true)}
          progress={progress}
          generatedImageUrl={generatedImageUrl}
        />

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

        {/* ── Generate button ───────────────────────────────────────── */}
        <button
          onClick={handleGenerate}
          disabled={genState === 'generating'}
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
              {generatedImageUrl ? 'GERAR NOVAMENTE' : 'GERAR INFLUENCER'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
