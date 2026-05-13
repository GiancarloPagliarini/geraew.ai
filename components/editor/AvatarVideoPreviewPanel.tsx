'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Download,
  Loader2,
  RotateCcw,
  Video,
  X,
} from 'lucide-react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useEditor } from '@/lib/editor-context';
import { GenerationPreview } from './GenerationPreview';

type Mode = 'generating' | 'done' | 'failed';

interface AvatarVideoPreviewPanelProps {
  nodeId: string;
  onClose?: () => void;
}

export function AvatarVideoPreviewPanel({
  nodeId,
  onClose,
}: AvatarVideoPreviewPanelProps) {
  const { accessToken } = useAuth();
  const { consumePendingAvatarVideo, setNodeGenerating } = useEditor();

  const [generationId, setGenerationId] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [avatarName, setAvatarName] = useState<string>('');
  const [avatarPreviewImageUrl, setAvatarPreviewImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoVisible, setVideoVisible] = useState(false);
  const [mode, setMode] = useState<Mode>('generating');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Consume the pending request on mount — that's how we receive generationId etc.
  useEffect(() => {
    const pending = consumePendingAvatarVideo();
    if (!pending) return;
    setGenerationId(pending.generationId);
    setAspectRatio(pending.aspectRatio);
    setAvatarName(pending.avatarName);
    setAvatarPreviewImageUrl(pending.avatarPreviewImageUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mark the node as generating so the user can't accidentally close it during polling
  useEffect(() => {
    setNodeGenerating(nodeId, mode === 'generating');
    return () => setNodeGenerating(nodeId, false);
  }, [nodeId, mode, setNodeGenerating]);

  // Poll /generations/{id} until COMPLETED or FAILED
  useEffect(() => {
    if (mode !== 'generating' || !generationId || !accessToken) return;
    let cancelled = false;

    async function poll() {
      if (cancelled || !accessToken) return;
      try {
        const gen = await api.generations.get(accessToken, generationId!);
        if (cancelled) return;
        if (gen.status === 'COMPLETED' && gen.outputs.length > 0) {
          setVideoUrl(gen.outputs[0].url);
          setMode('done');
          return;
        }
        if (gen.status === 'FAILED') {
          setErrorMsg(gen.errorMessage || 'A geração falhou. Tente novamente.');
          setMode('failed');
          return;
        }
        pollTimerRef.current = setTimeout(poll, 3_000);
      } catch {
        if (!cancelled) pollTimerRef.current = setTimeout(poll, 6_000);
      }
    }

    pollTimerRef.current = setTimeout(poll, 1_500);
    return () => {
      cancelled = true;
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [mode, generationId, accessToken]);

  const proportion = aspectRatio === '9:16' ? '9-16' : '16-9';
  const isBusy = mode === 'generating';

  return (
    <TooltipProvider>
      <div
        className="w-[380px] overflow-hidden rounded-2xl border border-[#f3f0ed]/8 bg-[#1a2123] shadow-2xl shadow-black/50"
        onWheelCapture={(e) => {
          // Allow internal scroll to bypass ReactFlow's pan
          const tag = (e.target as HTMLElement).tagName;
          if (tag === 'VIDEO' || tag === 'TEXTAREA') e.stopPropagation();
        }}
      >
        {/* Drag handle / header */}
        <div className="panel-drag-handle flex cursor-grab items-center justify-between px-3 py-2.5 active:cursor-grabbing">
          <div className="flex min-w-0 items-center gap-1.5">
            {avatarPreviewImageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={avatarPreviewImageUrl}
                alt={avatarName}
                className="h-5 w-5 shrink-0 rounded-full border border-[#a2dd00]/30 object-cover"
              />
            ) : (
              <Video className="h-3.5 w-3.5 shrink-0 text-[#f3f0ed]/40" />
            )}
            <span className="truncate text-[11px] font-medium text-[#f3f0ed]/60">
              Vídeo do avatar
              {avatarName ? (
                <span className="ml-1 text-[#a2dd00]/70">— {avatarName}</span>
              ) : null}
            </span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onClose}
                disabled={isBusy}
                className="flex h-5 w-5 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/8 hover:text-[#f3f0ed]/80 disabled:opacity-40"
              >
                <X className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              {isBusy ? 'Aguarde a geração terminar' : 'Fechar'}
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="space-y-2 px-3 pb-3">
          {/* Preview area */}
          <GenerationPreview
            proportion={proportion}
            genState={mode === 'generating' ? 'generating' : 'done'}
            imageVisible={mode === 'done' && videoVisible}
            progress={0}
            renderMedia={
              videoUrl
                ? () => (
                    <video
                      key={videoUrl}
                      src={videoUrl}
                      controls
                      preload="metadata"
                      className="h-full w-full bg-black object-contain"
                      onLoadedData={() => setVideoVisible(true)}
                    />
                  )
                : undefined
            }
          >
            {videoUrl && mode === 'done' && (
              <>
                <ActionButton
                  title="Abrir em nova aba"
                  onClick={() => window.open(videoUrl, '_blank')}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </ActionButton>
                <ActionButton title="Baixar" onClick={() => handleDownload(videoUrl)}>
                  <Download className="h-3.5 w-3.5" />
                </ActionButton>
              </>
            )}
          </GenerationPreview>

          {/* Status / actions row */}
          {mode === 'generating' && (
            <div className="flex items-center justify-center gap-2 py-1">
              <Loader2 className="h-3 w-3 animate-spin text-[#a2dd00]/80" />
              <span className="text-[10.5px] font-semibold text-white/55">
                Gerando vídeo… pode levar alguns minutos
              </span>
            </div>
          )}

          {mode === 'failed' && errorMsg && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/[0.06] px-2.5 py-2">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-400" />
              <p className="text-[10.5px] leading-relaxed text-red-300/90">{errorMsg}</p>
            </div>
          )}

          {mode === 'done' && videoUrl && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => window.open(videoUrl, '_blank')}
                className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md border border-white/[0.1] bg-white/[0.04] text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/70 transition-colors hover:border-white/[0.18] hover:bg-white/[0.08] hover:text-white/90"
              >
                <ArrowUpRight className="h-3 w-3" />
                Abrir
              </button>
              <button
                type="button"
                onClick={() => handleDownload(videoUrl)}
                className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md bg-[#a2dd00]/15 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#a2dd00] ring-1 ring-[#a2dd00]/30 transition-colors hover:bg-[#a2dd00]/25"
              >
                <Download className="h-3 w-3" />
                Baixar
              </button>
            </div>
          )}

          {mode === 'failed' && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-full items-center justify-center gap-1.5 rounded-md border border-white/[0.1] bg-white/[0.04] text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/70 transition-colors hover:border-white/[0.18] hover:bg-white/[0.08] hover:text-white/90"
            >
              <RotateCcw className="h-3 w-3" />
              Fechar e tentar de novo
            </button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
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
      <TooltipContent side="top" sideOffset={6}>
        {title}
      </TooltipContent>
    </Tooltip>
  );
}

async function handleDownload(url: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = 'geraew-avatar-video.mp4';
    a.click();
    URL.revokeObjectURL(objectUrl);
  } catch {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'geraew-avatar-video.mp4';
    a.click();
  }
}
