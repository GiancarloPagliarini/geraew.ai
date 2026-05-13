'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, MicVocal, Video, Volume2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  api,
  ApiError,
  AvatarVideoAspectRatio,
  AvatarVideoResolution,
  UserAvatar,
  VoiceProfile,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useEditor } from '@/lib/editor-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface GenerateAvatarVideoModalProps {
  avatar: UserAvatar | null;
  onClose: () => void;
}

const RESOLUTIONS: { value: AvatarVideoResolution; label: string }[] = [
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
  { value: '4k', label: '4K' },
];

const ASPECT_RATIOS: { value: AvatarVideoAspectRatio; label: string; hint: string }[] = [
  { value: '9:16', label: '9:16', hint: 'Reels / TikTok' },
  { value: '16:9', label: '16:9', hint: 'YouTube / horizontal' },
];

// Mirrors AVATAR_VIDEO_CREDIT_COSTS in geraew-api/src/avatars/avatars.constants.ts
// for the default engine (avatar_iv). Keep in sync with the backend.
// Note: 4K is exposed in the UI and billed at 4K price, but the backend
// downgrades to 1080p before calling HeyGen (avatar_iv doesn't render true 4K).
const AVATAR_VIDEO_CREDIT_COSTS: Record<AvatarVideoResolution, number> = {
  '720p': 1200,
  '1080p': 1500,
  '4k': 2400,
};

export function GenerateAvatarVideoModal({ avatar, onClose }: GenerateAvatarVideoModalProps) {
  const { accessToken } = useAuth();
  const { requestAvatarVideoPanel } = useEditor();

  const [script, setScript] = useState('');
  const [resolution, setResolution] = useState<AvatarVideoResolution>('1080p');
  const [aspectRatio, setAspectRatio] = useState<AvatarVideoAspectRatio>('9:16');
  const [voiceMode, setVoiceMode] = useState<'heygen' | 'cloned'>('heygen');
  const [voiceProfileId, setVoiceProfileId] = useState<string>('');

  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load user's cloned voices when the modal opens
  useEffect(() => {
    if (!avatar || !accessToken) return;
    setVoicesLoading(true);
    api.voices
      .list(accessToken)
      .then((res) => {
        const ready = res.voices.filter((v) => v.status === 'READY');
        setVoices(ready);
        if (ready.length > 0 && !voiceProfileId) {
          setVoiceProfileId(ready[0].id);
        }
      })
      .catch(() => setVoices([]))
      .finally(() => setVoicesLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatar, accessToken]);

  // Reset form when avatar changes / modal closes
  useEffect(() => {
    if (!avatar) {
      setScript('');
      setSubmitting(false);
    }
  }, [avatar]);

  // Esc closes (unless mid-submit) + lock body scroll while open
  useEffect(() => {
    if (!avatar) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose();
    }
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [avatar, submitting, onClose]);

  // Portal target — only available on the client
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  // Photo Avatars have no default voice anywhere in HeyGen — force the user
  // toward a cloned voice when that's the case.
  const avatarHasDefaultVoice = !!avatar?.defaultVoiceId;
  useEffect(() => {
    if (avatar && !avatar.defaultVoiceId && voiceMode === 'heygen') {
      setVoiceMode('cloned');
    }
  }, [avatar, voiceMode]);

  if (!avatar || !portalTarget) return null;

  const isReady = avatar.status === 'READY';
  const cost = AVATAR_VIDEO_CREDIT_COSTS[resolution];
  const canSubmit =
    isReady &&
    script.trim().length > 0 &&
    ((voiceMode === 'heygen' && avatarHasDefaultVoice) ||
      (voiceMode === 'cloned' && !!voiceProfileId));

  async function handleSubmit() {
    if (!accessToken || !avatar) return;
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const res = await api.avatars.generateVideo(accessToken, avatar.id, {
        script: script.trim(),
        // 4K is sent as-is so the backend charges the 4K credit cost.
        // The backend downgrades to 1080p before calling HeyGen (avatar_iv
        // doesn't render true 4K today).
        resolution,
        aspectRatio,
        ...(voiceMode === 'cloned' ? { voiceProfileId } : {}),
        // engine: omitted → backend uses default avatar_iv
      });
      toast.success(`Vídeo enfileirado! ${res.creditsConsumed} créditos consumidos.`);
      // Hand off to the canvas — a new `avatar-video-preview` panel will be
      // created there, poll the generation, and let the user open/download
      // the video when ready. The modal closes immediately.
      if (avatar) {
        requestAvatarVideoPanel({
          generationId: res.generationId,
          aspectRatio,
          avatarName: avatar.name,
          avatarPreviewImageUrl: avatar.previewImageUrl,
        });
      }
      onClose();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Falha ao gerar vídeo.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[#a2dd00]/25 bg-gradient-to-b from-[#a2dd00]/[0.06] via-[#171f21] to-[#171f21] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6),0_0_0_1px_rgba(162,221,0,0.05),0_0_48px_-12px_rgba(162,221,0,0.18)]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#a2dd00]/15 bg-[#a2dd00]/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#a2dd00]/20 ring-1 ring-[#a2dd00]/30">
              <Video className="h-3 w-3 text-[#a2dd00]" />
            </span>
            <span className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#a2dd00]">
              Gerar vídeo
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/[0.05] hover:text-white/80 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Avatar identity bar */}
        <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.05] bg-white/[0.015] px-4 py-2.5">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/[0.08] bg-[#0f1414]">
            {avatar.previewImageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={avatar.previewImageUrl}
                alt={avatar.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Video className="h-4 w-4 text-white/20" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/35">
              Avatar selecionado
            </div>
            <div className="truncate text-[13px] font-bold text-white/90">{avatar.name}</div>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="sidebar-scroll flex-1 space-y-4 overflow-y-auto p-4">
          {/* 1. Roteiro */}
          <div>
            <FieldLabel index={1} label="Roteiro" />
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Ex.: Olá pessoal, hoje vou falar sobre..."
              maxLength={1500}
              rows={4}
              disabled={submitting}
              className="w-full resize-none rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-[12.5px] leading-relaxed text-white/90 placeholder:text-white/25 transition-all focus:border-[#a2dd00]/40 focus:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-[#a2dd00]/15 disabled:opacity-60"
            />
            <div className="mt-1 flex justify-end">
              <span className="text-[10px] tabular-nums text-white/30">
                {script.length}/1500
              </span>
            </div>
          </div>

          {/* 2. Voz */}
          <div>
            <FieldLabel index={2} label="Voz" />
            {!avatarHasDefaultVoice && voices.length === 0 && (
              <div className="mb-2 flex items-start gap-2 rounded-lg border border-yellow-400/25 bg-yellow-400/[0.05] px-3 py-2">
                <MicVocal className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-300/85" />
                <p className="text-[10.5px] leading-relaxed text-yellow-200/90">
                  Este avatar não tem voz padrão. Vá em{' '}
                  <span className="font-bold">Minhas Vozes</span> para clonar uma voz e voltar
                  pra gerar o vídeo.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <VoiceModeCard
                selected={voiceMode === 'heygen'}
                disabled={submitting || !avatarHasDefaultVoice}
                onClick={() => setVoiceMode('heygen')}
                icon={Volume2}
                title="Voz HeyGen"
                desc={avatarHasDefaultVoice ? 'Padrão do avatar' : 'Sem voz padrão'}
              />
              <VoiceModeCard
                selected={voiceMode === 'cloned'}
                disabled={submitting || voices.length === 0}
                onClick={() => setVoiceMode('cloned')}
                icon={MicVocal}
                title="Voz clonada"
                desc={voices.length === 0 ? 'Sem vozes ainda' : 'Sua voz'}
              />
            </div>
            {voiceMode === 'cloned' && (
              <Select
                value={voiceProfileId || undefined}
                onValueChange={setVoiceProfileId}
                disabled={submitting || voicesLoading || voices.length === 0}
              >
                <SelectTrigger className="mt-2 h-9 w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 text-[12px] text-white/90 outline-none transition-all hover:bg-white/[0.04] focus:border-[#a2dd00]/40 focus:ring-2 focus:ring-[#a2dd00]/15 disabled:opacity-60 data-placeholder:text-white/35 [&>svg]:text-white/35">
                  <SelectValue
                    placeholder={
                      voices.length === 0 ? 'Nenhuma voz disponível' : 'Selecione uma voz'
                    }
                  />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  className="z-[110] rounded-xl border border-white/[0.08] bg-[#1a2123] p-1 shadow-2xl shadow-black/60 backdrop-blur-md"
                >
                  {voices.map((v) => (
                    <SelectItem
                      key={v.id}
                      value={v.id}
                      className="cursor-pointer rounded-md px-3 py-2 text-[12px] text-white/75 transition-colors focus:bg-white/[0.05] focus:text-white data-[state=checked]:text-[#a2dd00] [&>span:last-child>svg]:text-[#a2dd00]"
                    >
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* 3. + 4. Resolução / Proporção */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel index={3} label="Resolução" />
              <div className="grid grid-cols-3 gap-1">
                {RESOLUTIONS.map((r) => (
                  <Pill
                    key={r.value}
                    selected={resolution === r.value}
                    disabled={submitting}
                    onClick={() => setResolution(r.value)}
                    label={r.label}
                  />
                ))}
              </div>
            </div>
            <div>
              <FieldLabel index={4} label="Proporção" />
              <div className="grid grid-cols-2 gap-1">
                {ASPECT_RATIOS.map((a) => (
                  <Pill
                    key={a.value}
                    selected={aspectRatio === a.value}
                    disabled={submitting}
                    onClick={() => setAspectRatio(a.value)}
                    label={a.label}
                    title={a.hint}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer (sticky) — Cost + CTA */}
        <div className="flex shrink-0 items-center gap-3 border-t border-white/[0.05] bg-[#171f21]/95 px-4 py-3">
          <div className="flex-1">
            <div className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-white/35">
              Custo
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[18px] font-extrabold tabular-nums text-[#a2dd00]">
                {cost.toLocaleString('pt-BR')}
              </span>
              <span className="text-[10.5px] font-semibold text-white/45">créditos</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="flex h-10 items-center gap-1.5 rounded-lg bg-[#a2dd00] px-5 text-[12px] font-extrabold text-black shadow-[0_4px_18px_-4px_rgba(162,221,0,0.5)] transition-all hover:bg-[#b6ec1f] hover:shadow-[0_6px_22px_-4px_rgba(162,221,0,0.6)] disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-white/35 disabled:shadow-none"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Enviando…
              </>
            ) : (
              <>
                <Video className="h-3.5 w-3.5" />
                Gerar vídeo
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    portalTarget,
  );
}

// ─── Form sub-components ────────────────────────────────────────────────────

function FieldLabel({ index, label }: { index: number; label: string }) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      <span className="flex h-4 w-4 items-center justify-center rounded-[5px] bg-[#a2dd00]/15 text-[9px] font-extrabold tabular-nums text-[#a2dd00]">
        {index}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
        {label}
      </span>
    </div>
  );
}

interface VoiceModeCardProps {
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: typeof Volume2;
  title: string;
  desc: string;
}
function VoiceModeCard({
  selected,
  disabled,
  onClick,
  icon: Icon,
  title,
  desc,
}: VoiceModeCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative flex flex-col items-start gap-1 overflow-hidden rounded-lg border p-2.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${selected
          ? 'border-[#a2dd00]/50 bg-[#a2dd00]/10 shadow-[inset_0_0_0_1px_rgba(162,221,0,0.2)]'
          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04]'
        }`}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${selected ? 'bg-[#a2dd00]/20 text-[#a2dd00]' : 'bg-white/[0.05] text-white/55'
          }`}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span
        className={`text-[12px] font-bold ${selected ? 'text-[#a2dd00]' : 'text-white/90'}`}
      >
        {title}
      </span>
      <span className="text-[10px] leading-tight text-white/45">{desc}</span>
    </button>
  );
}

interface PillProps {
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
  title?: string;
}
function Pill({ selected, disabled, onClick, label, title }: PillProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`rounded-md border px-2 py-1.5 text-[10.5px] font-bold transition-colors disabled:opacity-50 ${selected
          ? 'border-[#a2dd00]/50 bg-[#a2dd00]/10 text-[#a2dd00]'
          : 'border-white/[0.06] bg-white/[0.02] text-white/60 hover:border-white/[0.14] hover:bg-white/[0.04]'
        }`}
    >
      {label}
    </button>
  );
}
