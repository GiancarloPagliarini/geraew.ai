'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  AlertCircle,
  Annoyed,
  AudioLines,
  Check,
  CircleHelp,
  Clock,
  Frown,
  Headphones,
  Laugh,
  Mic,
  MicVocal,
  Music,
  PartyPopper,
  RefreshCw,
  Smile,
  Square,
  Upload,
  Volume1,
  Wand2,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLoginModal } from '@/lib/login-modal-context';
import type { PendingGeneration } from '@/components/image/types';
import { useGenerationTracker } from '@/components/image/use-generation-tracker';
import { useGenerationErrorMessage } from '@/lib/use-generation-error';
import { MediaFileTile, readMediaDuration, type MediaFile } from '@/components/app/MediaFileTile';
import { VoicePickerModal, type VoiceOption } from '@/components/voice/VoicePickerModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MAX_TEXT_LENGTH = 900;
const MAX_AUDIO_MB = 15;
const MAX_RECORDING_SECONDS = 120;

type VoiceToolId = 'tts' | 'clone';

const VOICE_TOOLS: { id: VoiceToolId; labelKey: string; icon: LucideIcon }[] = [
  { id: 'tts', labelKey: 'toolTts', icon: Mic },
  { id: 'clone', labelKey: 'toolClone', icon: MicVocal },
];

/** Durações de pausa inseríveis no roteiro. */
const PAUSE_OPTIONS = ['0.5', '1', '2'];

/** Emoções inseríveis como etiqueta de áudio no roteiro (menu do rostinho). */
const EMOTIONS: { id: string; icon: LucideIcon }[] = [
  { id: 'laughs', icon: Laugh },
  { id: 'whispers', icon: Volume1 },
  { id: 'sarcastic', icon: Annoyed },
  { id: 'crying', icon: Frown },
  { id: 'singing', icon: Music },
  { id: 'excited', icon: PartyPopper },
  { id: 'curious', icon: CircleHelp },
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

interface VoiceConfigPanelProps {
  /** aba inativa: fica montada (mantém estado e polling) porém oculta */
  hidden?: boolean;
  /** ferramenta pré-selecionada (vinda do ?tool= na URL) */
  initialTool?: VoiceToolId;
  /** gerações em andamento desta aba (com url quando concluem, para revelar no preview) */
  onPendingChange: (pending: PendingGeneration[]) => void;
  /** registra a função que foca o roteiro desta aba */
  registerFocus?: (focus: () => void) => void;
}

/** Painel de configuração de uma aba de Texto para voz. */
export function VoiceConfigPanel({
  hidden = false,
  initialTool,
  onPendingChange,
  registerFocus,
}: VoiceConfigPanelProps) {
  const t = useTranslations('home');
  const { user, accessToken } = useAuth();
  const { openLoginModal } = useLoginModal();

  const [tool, setTool] = useState<VoiceToolId>(initialTool ?? 'tts');
  const [voice, setVoice] = useState<VoiceOption | null>(null);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // clonar voz
  const [referenceAudio, setReferenceAudio] = useState<MediaFile | null>(null);
  const [consent, setConsent] = useState(false);

  // gravação via microfone
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // picker de vozes (com animação de saída)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerClosing, setPickerClosing] = useState(false);
  const pickerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const textRef = useRef<HTMLTextAreaElement>(null);

  // banner de erro acima do botão Gerar — só some ao gerar de novo
  const [generationError, setGenerationError] = useState<string | null>(null);

  const { pending, track } = useGenerationTracker({ onError: setGenerationError });
  const mapError = useGenerationErrorMessage();

  useEffect(() => {
    onPendingChange(pending);
  }, [pending, onPendingChange]);

  useEffect(() => {
    registerFocus?.(() => textRef.current?.focus());
  }, [registerFocus]);

  // consentimento é por amostra: limpa quando o áudio muda
  useEffect(() => {
    setConsent(false);
  }, [referenceAudio]);

  useEffect(() => {
    return () => {
      if (pickerTimer.current) clearTimeout(pickerTimer.current);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const closePicker = () => {
    setPickerClosing(true);
    pickerTimer.current = setTimeout(() => {
      setPickerOpen(false);
      setPickerClosing(false);
    }, 180);
  };

  const insertTag = (tag: string) => {
    setText((prev) => {
      const next = prev ? `${prev.trimEnd()} ${tag} ` : `${tag} `;
      return next.slice(0, MAX_TEXT_LENGTH);
    });
    textRef.current?.focus();
  };

  // ─── gravação de áudio (MediaRecorder, como no workspace) ─────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
        const duration = await readMediaDuration(blob, 'audio');
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setReferenceAudio({
            base64: dataUrl.split(',')[1],
            mime_type: blob.type,
            duration,
            filename: t('voice.recordingName'),
          });
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => {
          if (s + 1 >= MAX_RECORDING_SECONDS) stopRecording();
          return s + 1;
        });
      }, 1000);
    } catch {
      toast.error(t('voice.micDenied'));
    }
  };

  const stopRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    setRecording(false);
  };

  const canGenerate =
    !!text.trim() &&
    (tool === 'tts' ? !!voice : !!referenceAudio && consent);

  // Emoções e pausas só funcionam no caminho Inworld (vozes padrão do catálogo).
  // Vozes clonadas e o modo "clonar" usam OmniVoice, que não suporta esse markup
  // — nesses casos os menus ficam desabilitados.
  const expressiveSupported = tool === 'tts' && !!voice && !voice.cloned;

  const generate = async () => {
    if (!canGenerate || submitting) return;
    if (!user || !accessToken) {
      openLoginModal({ mode: 'login' });
      return;
    }
    setGenerationError(null); // limpa o banner de erro ao gerar de novo
    setSubmitting(true);
    try {
      const { id } =
        tool === 'tts'
          ? await api.generations.textToSpeech(accessToken, {
              text: text.trim(),
              voice_id: voice!.id,
            })
          : await api.generations.voiceClone(accessToken, {
              text: text.trim(),
              audio: referenceAudio!.base64,
              audio_mime_type: referenceAudio!.mime_type,
            });
      track(id, text.trim(), 'voice');
    } catch (err) {
      const msg = mapError(err instanceof ApiError || err instanceof Error ? err.message : null);
      toast.error(msg);
      setGenerationError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        'relative flex w-full min-h-0 flex-1 flex-col border-b border-app-hairline lg:w-[360px] lg:flex-none lg:border-b-0 lg:border-r',
        hidden && 'hidden',
      )}
    >
      {/* *:shrink-0 — sem isso o flex esmaga os filhos (ex.: botão Gerar) antes de rolar */}
      <div className="flex min-h-0 flex-1 flex-col gap-[22px] overflow-y-auto p-5 scrollbar-app *:shrink-0">
        {/* ferramenta */}
        <div className="flex flex-col gap-2">
          <FieldLabel>{t('image.tool')}</FieldLabel>
          <Select value={tool} onValueChange={(v) => setTool(v as VoiceToolId)}>
            {/* o ícone vem junto no SelectValue (clonado do item selecionado) */}
            <SelectTrigger className={cn(selectTriggerClass, 'justify-start [&>span:first-child]:flex-1')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" align="start" sideOffset={6} className={selectContentClass}>
              {VOICE_TOOLS.map(({ id, labelKey, icon: OptIcon }) => (
                <SelectItem key={id} value={id} className={selectItemClass}>
                  <OptIcon className="size-[15px] !text-app-lime" strokeWidth={1.8} />
                  {t(`voice.${labelKey}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Texto para voz ── */}
        {tool === 'tts' && (
          <>
            {/* vozes */}
            <div className="flex flex-col gap-2">
              <FieldLabel>{t('voice.voices')}</FieldLabel>
              <div className="grid grid-cols-2 gap-3">
                {voice && (
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="flex h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border border-[rgba(162,221,0,0.3)] bg-app-surface px-2 text-app-text transition-colors duration-200 ease-app hover:border-[rgba(162,221,0,0.5)]"
                  >
                    {voice.cloned ? (
                      <MicVocal className="size-[19px] text-app-lime" strokeWidth={1.8} />
                    ) : (
                      <Headphones className="size-[19px] text-app-lime" strokeWidth={1.8} />
                    )}
                    <span className="w-full truncate text-center text-[12px] font-semibold">{voice.name}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="flex h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-app-hairline-2 text-app-text-2 transition-colors duration-200 ease-app hover:border-[rgba(162,221,0,0.4)] hover:text-app-text"
                >
                  <AudioLines className="size-[19px]" strokeWidth={1.8} />
                  <span className="text-[12px] font-semibold">
                    {voice ? t('voice.changeVoice') : t('voice.addVoice')}
                  </span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Clonar voz ── */}
        {tool === 'clone' && (
          <div className="flex flex-col gap-2">
            <FieldLabel>{t('voice.referenceAudio')}</FieldLabel>
            {recording ? (
              /* gravação em andamento */
              <div className="flex items-center gap-3 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3">
                <span className="relative flex size-3">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-60" />
                  <span className="relative inline-flex size-3 rounded-full bg-red-500" />
                </span>
                <span className="flex-1 font-mono text-[13px] text-app-text">
                  {t('voice.recording')} {recordSeconds}s
                </span>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex size-8 items-center justify-center rounded-full bg-red-500/20 text-red-400 transition-colors duration-200 ease-app hover:bg-red-500/30"
                  aria-label={t('voice.stopRecording')}
                >
                  <Square className="size-3.5" fill="currentColor" strokeWidth={0} />
                </button>
              </div>
            ) : referenceAudio ? (
              /* áudio capturado — card em largura total com player para ouvir */
              <div className="flex flex-col gap-3 rounded-xl border border-[rgba(162,221,0,0.3)] bg-app-surface p-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] border border-[rgba(162,221,0,0.25)] bg-[rgba(162,221,0,0.08)]">
                    <AudioLines className="size-4 text-app-lime" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-app-text">
                    {referenceAudio.filename}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-app-muted">
                    {Math.round(referenceAudio.duration)}s
                  </span>
                  <button
                    type="button"
                    aria-label={t('clone.remove')}
                    onClick={() => setReferenceAudio(null)}
                    className="flex size-6 shrink-0 items-center justify-center rounded-md text-app-muted transition-colors duration-200 ease-app hover:bg-app-card-hover hover:text-app-text"
                  >
                    <X className="size-3.5" strokeWidth={2} />
                  </button>
                </div>
                <audio
                  src={`data:${referenceAudio.mime_type};base64,${referenceAudio.base64}`}
                  controls
                  preload="metadata"
                  className="h-10 w-full"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <MediaFileTile
                  label={t('voice.uploadAudio')}
                  icon={Upload}
                  kind="audio"
                  value={referenceAudio}
                  onChange={setReferenceAudio}
                  maxMB={MAX_AUDIO_MB}
                />
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex h-full min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-app-hairline-2 text-app-text-2 transition-colors duration-200 ease-app hover:border-[rgba(162,221,0,0.4)] hover:text-app-text"
                >
                  <Mic className="size-[19px]" strokeWidth={1.8} />
                  <span className="text-[12px] font-semibold">{t('voice.record')}</span>
                </button>
              </div>
            )}

            {/* consentimento */}
            {referenceAudio && (
              <button
                type="button"
                role="checkbox"
                aria-checked={consent}
                onClick={() => setConsent((v) => !v)}
                className="flex items-start gap-2.5 rounded-xl border border-app-hairline bg-app-surface px-3.5 py-3 text-left transition-colors duration-200 ease-app hover:border-app-hairline-2"
              >
                <span
                  className={cn(
                    'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors duration-200 ease-app',
                    consent ? 'border-app-lime bg-app-lime' : 'border-app-hairline-2',
                  )}
                >
                  {consent && <Check className="size-3 text-app-lime-ink" strokeWidth={3} />}
                </span>
                <span className="text-[12.5px] leading-relaxed text-app-text-2">
                  {t('voice.consent')}
                </span>
              </button>
            )}
          </div>
        )}

        {/* roteiro */}
        <div className="flex flex-col gap-2">
          <FieldLabel
            right={
              <span className="flex items-center gap-1">
                {/* pausa */}
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild disabled={!expressiveSupported}>
                        <button
                          type="button"
                          disabled={!expressiveSupported}
                          aria-label={t('voice.tagPause')}
                          className="flex size-6 items-center justify-center rounded-md text-app-muted transition-colors duration-200 ease-app hover:bg-app-surface hover:text-app-text disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-app-muted"
                        >
                          <Clock className="size-[14px]" strokeWidth={1.8} />
                        </button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={6}>
                      {expressiveSupported ? t('voice.tagPause') : t('voice.expressiveUnavailable')}
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={6}
                    className="w-32 rounded-xl border-app-hairline-2 bg-app-card p-1.5 text-app-text shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
                  >
                    {PAUSE_OPTIONS.map((s) => (
                      <DropdownMenuItem
                        key={s}
                        onClick={() => insertTag(t('voice.pauseTag', { s }))}
                        className="cursor-pointer rounded-lg px-2.5 py-2 font-mono text-[13px] text-app-text-2 focus:bg-app-surface focus:text-app-text"
                      >
                        <Clock className="size-[14px] !text-app-lime" strokeWidth={1.8} />
                        {s}s
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* emoções */}
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild disabled={!expressiveSupported}>
                        <button
                          type="button"
                          disabled={!expressiveSupported}
                          aria-label={t('voice.emotionsMenu')}
                          className="flex size-6 items-center justify-center rounded-md text-app-muted transition-colors duration-200 ease-app hover:bg-app-surface hover:text-app-text disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-app-muted"
                        >
                          <Smile className="size-[14px]" strokeWidth={1.8} />
                        </button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={6}>
                      {expressiveSupported ? t('voice.emotionsMenu') : t('voice.expressiveUnavailable')}
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={6}
                    className="w-48 rounded-xl border-app-hairline-2 bg-app-card p-1.5 text-app-text shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
                  >
                    {EMOTIONS.map(({ id, icon: EmotionIcon }) => (
                      <DropdownMenuItem
                        key={id}
                        onClick={() => insertTag(t(`voice.emotionTags.${id}`))}
                        className="cursor-pointer rounded-lg px-2.5 py-2 text-[13.5px] text-app-text-2 focus:bg-app-surface focus:text-app-text"
                      >
                        <EmotionIcon className="size-[15px] !text-app-lime" strokeWidth={1.8} />
                        {t(`voice.emotions.${id}`)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </span>
            }
          >
            {t('voice.script')}
          </FieldLabel>
          <div className="flex flex-col rounded-xl border border-app-hairline bg-app-surface transition-colors duration-200 ease-app focus-within:border-[rgba(162,221,0,0.4)]">
            <textarea
              ref={textRef}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT_LENGTH))}
              placeholder={t('voice.scriptPlaceholder')}
              rows={6}
              maxLength={MAX_TEXT_LENGTH}
              className="w-full resize-none bg-transparent p-3.5 text-[14px] leading-relaxed text-app-text outline-none placeholder:text-app-muted"
            />
            <span className="px-3.5 pb-3 font-mono text-[11px] text-app-muted">
              {t('voice.chars', { count: text.length, max: MAX_TEXT_LENGTH })}
            </span>
          </div>
        </div>

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

        <div className="flex items-center gap-2 text-[12px] text-app-muted">
          <AudioLines className="size-3.5 shrink-0" strokeWidth={1.8} />
          {tool === 'tts' ? t('voice.ttsHint') : t('voice.cloneHint')}
        </div>
      </div>

      {pickerOpen && (
        <VoicePickerModal
          selected={voice?.id ?? null}
          closing={pickerClosing}
          onSelect={(v) => {
            setVoice(v);
            closePicker();
          }}
          onClose={closePicker}
        />
      )}
    </div>
  );
}
