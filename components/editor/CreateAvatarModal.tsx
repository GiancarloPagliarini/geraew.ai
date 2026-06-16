'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Lightbulb,
  Loader2,
  Upload,
  Video,
  Wand2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { api, ApiError, UserAvatar } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLoginModal } from '@/lib/login-modal-context';
import { useGenerationErrorMessage } from '@/lib/use-generation-error';

type AvatarKind = 'photo' | 'digital_twin';
type FileSource = 'upload' | 'webcam';

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB
const MIN_VIDEO_DURATION_S = 20;
const MAX_VIDEO_DURATION_S = 300;

interface CreateAvatarModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (avatar: UserAvatar) => void;
  /** renderiza o formulário embutido (sem overlay/portal), para o painel do shell */
  embedded?: boolean;
}

export function CreateAvatarModal({ open, onClose, onCreated, embedded = false }: CreateAvatarModalProps) {
  const { user, accessToken } = useAuth();
  const { openLoginModal } = useLoginModal();
  const t = useTranslations('editorDialogs.avatars.create');
  const mapError = useGenerationErrorMessage();

  const [avatarKind, setAvatarKind] = useState<AvatarKind>('photo');
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileDuration, setFileDuration] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // banner de erro acima do botão Criar — só some ao criar de novo
  const [createError, setCreateError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [source, setSource] = useState<FileSource>('upload');
  // Consent must be re-checked for every new file — mirrors the voice clone
  // pattern in GenerateAudioPanel. Reset whenever the file changes.
  const [consent, setConsent] = useState(false);
  const [consentExpanded, setConsentExpanded] = useState(false);

  // Reset state shortly after close so the close animation doesn't flash empty
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setAvatarKind('photo');
      setName('');
      setFile(null);
      setFileError(null);
      setFileDuration(null);
      setSubmitting(false);
      setCreateError(null);
      setUploadProgress(null);
      setIsDragging(false);
      setSource('upload');
      setConsent(false);
      setConsentExpanded(false);
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
        setFilePreview(null);
      }
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Esc closes (unless mid-submit) + lock body scroll while open
  useEffect(() => {
    if (!open || embedded) return;
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
  }, [open, embedded, submitting, onClose]);

  // Portal target — only available on the client
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  if (!embedded && (!open || !portalTarget)) return null;

  async function handleFileChosen(
    f: File | null,
    options?: { knownDurationSec?: number },
  ) {
    setFile(null);
    setFileError(null);
    setFileDuration(null);
    // Re-confirm consent for every new sample.
    setConsent(false);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);

    if (!f) return;

    if (avatarKind === 'photo') {
      if (!ACCEPTED_IMAGE_TYPES.includes(f.type)) {
        setFileError(t('errorImageType'));
        return;
      }
      if (f.size > MAX_IMAGE_BYTES) {
        setFileError(t('errorImageSize'));
        return;
      }
      setFile(f);
      setFilePreview(URL.createObjectURL(f));
      return;
    }

    // digital_twin → vídeo
    if (!ACCEPTED_VIDEO_TYPES.includes(f.type)) {
      setFileError(t('errorVideoType'));
      return;
    }
    if (f.size > MAX_VIDEO_BYTES) {
      setFileError(t('errorVideoSize'));
      return;
    }

    let duration = options?.knownDurationSec;
    if (duration === undefined) {
      try {
        duration = await probeDuration(f);
      } catch {
        // If we can't probe (e.g. fresh MediaRecorder blob), trust the file
        setFile(f);
        setFilePreview(URL.createObjectURL(f));
        return;
      }
    }

    // Some browsers return Infinity for fresh MediaRecorder webm blobs
    if (!Number.isFinite(duration)) {
      if (options?.knownDurationSec !== undefined) {
        duration = options.knownDurationSec;
      } else {
        setFile(f);
        setFilePreview(URL.createObjectURL(f));
        return;
      }
    }

    if (duration < MIN_VIDEO_DURATION_S) {
      setFileError(t('errorVideoTooShort', { min: MIN_VIDEO_DURATION_S }));
      return;
    }
    if (duration > MAX_VIDEO_DURATION_S) {
      setFileError(t('errorVideoTooLong', { max: MAX_VIDEO_DURATION_S }));
      return;
    }
    setFile(f);
    setFileDuration(Math.round(duration));
    setFilePreview(URL.createObjectURL(f));
  }

  function handleSwitchKind(kind: AvatarKind) {
    if (kind === avatarKind || submitting) return;
    setAvatarKind(kind);
    setFile(null);
    setFileError(null);
    setFileDuration(null);
    setSource('upload');
    setConsent(false);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
  }

  async function handleSubmitCreate() {
    if (!user || !accessToken) {
      openLoginModal();
      return;
    }
    if (!name.trim() || !file || !consent) return;

    setCreateError(null); // limpa o banner de erro ao criar de novo
    setSubmitting(true);
    setUploadProgress(0);
    try {
      const detectedMime = await detectMimeType(file);
      const realMime = detectedMime ?? file.type;
      const ext = mimeToExt(realMime);
      const safeFilename = `avatar.${ext}`;

      const presigned = await api.uploads.presigned(accessToken, {
        filename: safeFilename,
        contentType: realMime as 'image/png' | 'image/jpeg' | 'image/webp' | 'video/mp4',
        purpose: 'avatar_source',
      });

      await uploadToR2(presigned.uploadUrl, file, realMime, (pct) => setUploadProgress(pct));

      const created = await api.avatars.create(accessToken, {
        name: name.trim(),
        sourceMediaKey: presigned.fileKey,
        type: avatarKind,
      });

      toast.success(
        avatarKind === 'photo' ? t('toastSuccessPhoto') : t('toastSuccessVideo'),
      );
      onCreated(created);
      onClose();
    } catch (err) {
      const msg = mapError(err instanceof ApiError || err instanceof Error ? err.message : null);
      toast.error(msg);
      setCreateError(msg);
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  }

  const card = (
    <div
      className={
        embedded
          ? 'relative flex h-full min-h-0 w-full flex-col overflow-hidden'
          : 'relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#a2dd00]/25 bg-gradient-to-b from-[#a2dd00]/[0.06] via-[#171f21] to-[#171f21] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6),0_0_0_1px_rgba(162,221,0,0.05),0_0_48px_-12px_rgba(162,221,0,0.18)]'
      }
    >
      {/* Header — só no modal */}
      {!embedded && (
        <div className="flex shrink-0 items-center justify-between border-b border-[#a2dd00]/15 bg-[#a2dd00]/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#a2dd00]/20 ring-1 ring-[#a2dd00]/30">
              <Wand2 className="h-3 w-3 text-[#a2dd00]" />
            </span>
            <span className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#a2dd00]">
              {t('title')}
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
      )}

        {/* Body — scrollable */}
        <div className="sidebar-scroll flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {/* 1. Tipo */}
          <div>
            <FieldLabel label={t('typeLabel')} />
            <div className="grid grid-cols-2 gap-2">
              <TypeCard
                selected={avatarKind === 'photo'}
                disabled={submitting}
                onClick={() => handleSwitchKind('photo')}
                icon={Camera}
                title={t('typePhoto')}
                badge={t('typePhotoBadge')}
                timeLabel={t('typePhotoTime')}
                desc={t('typePhotoDesc')}
              />
              <TypeCard
                selected={avatarKind === 'digital_twin'}
                disabled={submitting}
                onClick={() => handleSwitchKind('digital_twin')}
                icon={Video}
                title={t('typeVideo')}
                badge={t('typeVideoBadge')}
                timeLabel={t('typeVideoTime')}
                desc={t('typeVideoDesc')}
              />
            </div>
          </div>

          {/* 2. Nome */}
          <div>
            <FieldLabel label={t('nameLabel')} />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              maxLength={60}
              disabled={submitting}
              className="w-full rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-[13px] text-white/90 placeholder:text-white/25 transition-all focus:border-[#a2dd00]/40 focus:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-[#a2dd00]/15 disabled:opacity-60"
            />
          </div>

          {/* 3. Arquivo */}
          <div>
            <FieldLabel
              label={avatarKind === 'photo' ? t('fileLabelPhoto') : t('fileLabelVideo')}
            />
            {file ? (
              <FilePreview
                file={file}
                filePreview={filePreview}
                fileDuration={fileDuration}
                kind={avatarKind}
                disabled={submitting}
                onReset={() => handleFileChosen(null)}
              />
            ) : (
              <>
                <SourceTabs source={source} onChange={setSource} disabled={submitting} />
                {source === 'upload' ? (
                  <UploadDropzone
                    kind={avatarKind}
                    submitting={submitting}
                    isDragging={isDragging}
                    hasError={!!fileError}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!submitting && !isDragging) setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const f = e.dataTransfer.files?.[0] ?? null;
                      handleFileChosen(f);
                    }}
                    onChange={(f) => handleFileChosen(f)}
                  />
                ) : (
                  <WebcamCapture
                    key={avatarKind}
                    kind={avatarKind}
                    disabled={submitting}
                    onFileReady={(f, durationSec) =>
                      handleFileChosen(
                        f,
                        durationSec !== undefined ? { knownDurationSec: durationSec } : undefined,
                      )
                    }
                  />
                )}
              </>
            )}

            {fileError && (
              <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-red-400/85">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {fileError}
              </p>
            )}
            <TipList kind={avatarKind} />
          </div>

          {/* Consent — required before submit. Only shown once a file is
              chosen (no point asking before there's something to consent to). */}
          {file && (
            <ConsentBox
              consent={consent}
              expanded={consentExpanded}
              onToggleConsent={() => setConsent((v) => !v)}
              onToggleExpand={() => setConsentExpanded((v) => !v)}
            />
          )}

          {/* Progress */}
          {uploadProgress !== null && <StageProgress progress={uploadProgress} />}
        </div>

        {/* Footer (sticky) — CTA no padrão do painel de vídeo */}
        <div className="flex shrink-0 flex-col gap-3 border-t border-white/[0.05] bg-[#171f21]/95 px-4 py-3 sm:px-5 sm:py-4">
          {/* banner de erro — persiste até criar de novo */}
          {createError && (
            <div className="flex items-start gap-2.5 rounded-[10px] border border-red-500/25 bg-red-500/[0.07] p-3">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-400" strokeWidth={1.8} />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-white/90">{t('errorTitle')}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-white/55">{createError}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleSubmitCreate}
            disabled={submitting || !name.trim() || !file || !consent}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-app-lime text-[14.5px] font-semibold text-app-lime-ink transition-colors duration-200 ease-app hover:bg-app-lime-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="size-[16px] animate-spin" strokeWidth={2} />
                {t('submitting')}
              </>
            ) : (
              <>
                {t('submit')}
                <Wand2 className="size-[16px]" strokeWidth={2} />
              </>
            )}
          </button>
        </div>
    </div>
  );

  if (embedded) return card;
  if (!portalTarget) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      {card}
    </div>,
    portalTarget,
  );
}

// ─── Form sub-components ────────────────────────────────────────────────────

function FieldLabel({ label }: { label: string }) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
        {label}
      </span>
    </div>
  );
}

interface TypeCardProps {
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: typeof Camera;
  title: string;
  badge: string;
  timeLabel: string;
  desc: string;
}
function TypeCard({
  selected,
  disabled,
  onClick,
  icon: Icon,
  title,
  badge,
  timeLabel,
  desc,
}: TypeCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative flex flex-col items-start gap-1 overflow-hidden rounded-lg border p-3 text-left transition-all disabled:opacity-50 ${selected
        ? 'border-[#a2dd00]/50 bg-[#a2dd00]/10 shadow-[inset_0_0_0_1px_rgba(162,221,0,0.2)]'
        : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04]'
        }`}
    >
      <div className="flex w-full items-center justify-between">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${selected ? 'bg-[#a2dd00]/20 text-[#a2dd00]' : 'bg-white/[0.05] text-white/55'
            }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${selected ? 'bg-[#a2dd00]/20 text-[#a2dd00]' : 'bg-white/[0.05] text-white/45'
            }`}
        >
          {badge}
        </span>
      </div>
      <span
        className={`text-[13px] font-bold ${selected ? 'text-[#a2dd00]' : 'text-white/90'}`}
      >
        {title}
      </span>
      <span className="text-[11px] leading-tight text-white/45">{desc}</span>
      <span className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-white/35">
        <Clock className="h-2.5 w-2.5" />
        {timeLabel}
      </span>
    </button>
  );
}

interface ConsentBoxProps {
  consent: boolean;
  expanded: boolean;
  onToggleConsent: () => void;
  onToggleExpand: () => void;
}
function ConsentBox({ consent, expanded, onToggleConsent, onToggleExpand }: ConsentBoxProps) {
  const t = useTranslations('editorDialogs.avatars.create');
  return (
    <div
      className={`overflow-hidden rounded-xl border transition-all ${
        consent
          ? 'border-[#a2dd00]/40 bg-[#a2dd00]/[0.06]'
          : 'border-[#f3f0ed]/[0.07] bg-[#1e494b]/15'
      }`}
    >
      <div className="flex items-center gap-2 px-2.5 py-2">
        <button
          type="button"
          onClick={onToggleConsent}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <span
            className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-all ${
              consent
                ? 'border-[#a2dd00] bg-[#a2dd00]'
                : 'border-[#f3f0ed]/30 bg-transparent'
            }`}
          >
            {consent && (
              <svg
                viewBox="0 0 12 12"
                className="h-2.5 w-2.5 text-[#1a2123]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="2.5,6.5 5,9 9.5,3.5" />
              </svg>
            )}
          </span>
          <span className="text-[11px] font-medium text-[#f3f0ed]/80">
            {t('consentLabel')}
          </span>
        </button>
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#f3f0ed]/40 transition-colors hover:bg-[#f3f0ed]/[0.06] hover:text-[#f3f0ed]/80"
          aria-label={expanded ? t('consentCollapse') : t('consentExpand')}
        >
          <ChevronRight
            className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </button>
      </div>
      {expanded && (
        <div className="border-t border-[#f3f0ed]/[0.06] px-2.5 py-2">
          <p className="text-[10px] leading-relaxed text-[#f3f0ed]/55">
            {t('consentDetails')}
          </p>
        </div>
      )}
    </div>
  );
}

function TipList({ kind }: { kind: AvatarKind }) {
  const t = useTranslations('editorDialogs.avatars.create');
  return (
    <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-[#a2dd00]/15 bg-[#a2dd00]/[0.04] p-2.5">
      <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-[#a2dd00]" strokeWidth={1.8} />
      <p className="text-[10.5px] leading-relaxed text-white/55">
        {kind === 'photo' ? t('tipPhoto') : t('tipVideo')}
      </p>
    </div>
  );
}

function StageProgress({ progress }: { progress: number }) {
  const t = useTranslations('editorDialogs.avatars.create');
  const inUpload = progress < 100;
  return (
    <div className="rounded-lg border border-[#a2dd00]/15 bg-[#a2dd00]/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/55">
          {inUpload ? t('stageUpload') : t('stageTraining')}
        </span>
        <span className="text-[10.5px] font-extrabold tabular-nums text-[#a2dd00]">
          {progress}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#a2dd00] to-[#c5f33a] transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 flex items-center gap-2 text-[10px] font-semibold">
        <span
          className={`flex items-center gap-1 ${inUpload ? 'text-[#a2dd00]/85' : 'text-white/40'
            }`}
        >
          <span
            className={`h-1 w-1 rounded-full ${inUpload ? 'bg-[#a2dd00]/85' : 'bg-white/30'}`}
          />
          {t('stageStepUpload')}
        </span>
        <span className="h-px w-3 bg-white/10" />
        <span
          className={`flex items-center gap-1 ${!inUpload ? 'text-[#a2dd00]/85' : 'text-white/25'
            }`}
        >
          <span
            className={`h-1 w-1 rounded-full ${!inUpload ? 'bg-[#a2dd00]/85' : 'bg-white/15'}`}
          />
          {t('stageStepTrain')}
        </span>
      </div>
    </div>
  );
}

// ─── Source picker (Upload / Webcam) ────────────────────────────────────────

interface SourceTabsProps {
  source: FileSource;
  onChange: (s: FileSource) => void;
  disabled?: boolean;
}
function SourceTabs({ source, onChange, disabled }: SourceTabsProps) {
  const t = useTranslations('editorDialogs.avatars.create');
  return (
    <div className="mb-2 inline-flex w-full rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('upload')}
        className={`flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md text-[10.5px] font-bold uppercase tracking-[0.1em] transition-all disabled:opacity-50 ${source === 'upload'
          ? 'bg-white/[0.07] text-white/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]'
          : 'text-white/40 hover:text-white/70'
          }`}
      >
        <Upload className="h-3 w-3" />
        {t('sourceUpload')}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('webcam')}
        className={`flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md text-[10.5px] font-bold uppercase tracking-[0.1em] transition-all disabled:opacity-50 ${source === 'webcam'
          ? 'bg-white/[0.07] text-white/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]'
          : 'text-white/40 hover:text-white/70'
          }`}
      >
        <Camera className="h-3 w-3" />
        {t('sourceWebcam')}
      </button>
    </div>
  );
}

// ─── Upload dropzone ────────────────────────────────────────────────────────

interface UploadDropzoneProps {
  kind: AvatarKind;
  submitting: boolean;
  isDragging: boolean;
  hasError: boolean;
  onDragOver: (e: React.DragEvent<HTMLLabelElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLLabelElement>) => void;
  onChange: (file: File | null) => void;
}
function UploadDropzone({
  kind,
  submitting,
  isDragging,
  hasError,
  onDragOver,
  onDragLeave,
  onDrop,
  onChange,
}: UploadDropzoneProps) {
  const t = useTranslations('editorDialogs.avatars.create');
  return (
    <label
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`group/drop relative flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed px-6 py-7 transition-all ${hasError
        ? 'border-red-400/40 bg-red-400/[0.04]'
        : isDragging
          ? 'scale-[1.01] border-[#a2dd00]/70 bg-[#a2dd00]/[0.08] shadow-[0_0_28px_-6px_rgba(162,221,0,0.45)]'
          : 'border-white/[0.08] bg-white/[0.015] hover:border-white/[0.18] hover:bg-white/[0.03]'
        } ${submitting ? 'pointer-events-none opacity-60' : ''}`}
    >
      <input
        type="file"
        accept={kind === 'photo' ? 'image/png,image/jpeg,image/webp' : 'video/mp4,video/quicktime,video/webm'}
        className="hidden"
        disabled={submitting}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${isDragging
          ? 'bg-[#a2dd00]/20 text-[#a2dd00]'
          : 'bg-white/[0.04] text-white/40 group-hover/drop:bg-white/[0.06] group-hover/drop:text-white/55'
          }`}
      >
        <Upload className="h-5 w-5" />
      </span>
      <span className="text-[12.5px] font-bold text-white/85">
        {isDragging
          ? t('dropDrop')
          : kind === 'photo'
            ? t('dropPhotoIdle')
            : t('dropVideoIdle')}
      </span>
      <span className="text-center text-[10.5px] text-white/35">
        {kind === 'photo' ? t('dropPhotoHint') : t('dropVideoHint')}
      </span>
    </label>
  );
}

// ─── Webcam capture (photo + video) ─────────────────────────────────────────

interface WebcamCaptureProps {
  kind: AvatarKind;
  disabled: boolean;
  onFileReady: (file: File, durationSec?: number) => void;
}
function WebcamCapture({ kind, disabled, onFileReady }: WebcamCaptureProps) {
  const t = useTranslations('editorDialogs.avatars.create');
  const videoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Mirrors recordingSec for callbacks that read stale state (onstop, setInterval)
  const recordingSecRef = useRef(0);

  const [streamReady, setStreamReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);

  // Acquire camera (and mic for video) on mount
  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('not_supported');
        }
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: kind === 'digital_twin',
        });
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
        setStreamReady(true);
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : '';
        const msg = err instanceof Error ? err.message : '';
        if (name === 'NotAllowedError' || msg.includes('denied') || msg.includes('Permission')) {
          setError(t('webcamErrorDenied'));
        } else if (name === 'NotFoundError' || msg.includes('not found') || msg.includes('NotFound')) {
          setError(t('webcamErrorNotFound'));
        } else if (msg === 'not_supported') {
          setError(t('webcamErrorNotSupported'));
        } else {
          setError(t('webcamErrorGeneric'));
        }
      }
    }
    start();
    return () => {
      cancelled = true;
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [kind]);

  function handleCapturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // The video element is mirrored visually via CSS for selfie feel,
    // but we want the captured image to be un-mirrored (a real selfie photo).
    // So draw directly without flipping — what the user "sees" is mirrored,
    // the actual captured pixels match what HeyGen needs.
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const f = new File([blob], `webcam-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onFileReady(f);
      },
      'image/jpeg',
      0.92,
    );
  }

  function handleStartRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const mimeType = pickRecorderMime();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      setError(t('webcamErrorNoRecording'));
      return;
    }
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const recorderMime = recorder.mimeType || 'video/webm';
      // MediaRecorder returns the type with codec specifiers (e.g.
      // 'video/webm;codecs=vp8,opus'). Strip them so the base type matches
      // ACCEPTED_VIDEO_TYPES on the parent's validation.
      const baseMime = recorderMime.split(';')[0].trim();
      const blob = new Blob(chunksRef.current, { type: baseMime });
      const ext = baseMime.includes('mp4') ? 'mp4' : 'webm';
      const f = new File([blob], `webcam-${Date.now()}.${ext}`, { type: baseMime });
      const elapsed = recordingSecRef.current;
      setIsRecording(false);
      setRecordingSec(0);
      onFileReady(f, elapsed);
    };
    recorder.start(1000); // emit chunks every 1s for safer recoverability
    setIsRecording(true);
    setRecordingSec(0);
    recordingSecRef.current = 0;
    timerRef.current = setInterval(() => {
      recordingSecRef.current += 1;
      setRecordingSec(recordingSecRef.current);
      if (recordingSecRef.current >= MAX_VIDEO_DURATION_S) {
        handleStopRecording();
      }
    }, 1000);
  }

  function handleStopRecording() {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/[0.05] px-4 py-6 text-center">
        <Camera className="h-5 w-5 text-red-400/85" />
        <p className="text-[11.5px] font-semibold text-red-300/90">{error}</p>
      </div>
    );
  }

  const isPhoto = kind === 'photo';
  const minReached = recordingSec >= MIN_VIDEO_DURATION_S;

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-black">
      {/* Live preview */}
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full object-cover [transform:scaleX(-1)]"
        />
        {!streamReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/60">
            <Loader2 className="h-5 w-5 animate-spin text-white/45" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
              {t('webcamRequesting')}
            </span>
          </div>
        )}

        {/* Recording badge */}
        {isRecording && (
          <div className="absolute right-2 top-2 flex items-center gap-1.5 rounded-full bg-black/65 px-2 py-0.5 backdrop-blur-md ring-1 ring-red-500/40">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-red-500/70" />
              <span className="relative h-2 w-2 rounded-full bg-red-500" />
            </span>
            <span className="text-[10.5px] font-extrabold tabular-nums text-white">
              {formatRecordingTime(recordingSec)}
            </span>
          </div>
        )}

        {/* Duration hint (digital_twin only) */}
        {!isPhoto && !isRecording && streamReady && (
          <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 backdrop-blur-md">
            <span className="text-[10px] font-semibold text-white/65">
              {t('webcamDurationHint', { min: MIN_VIDEO_DURATION_S, max: Math.floor(MAX_VIDEO_DURATION_S / 60) })}
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="border-t border-white/[0.06] bg-white/[0.015] p-2.5">
        {isPhoto ? (
          <button
            type="button"
            disabled={disabled || !streamReady}
            onClick={handleCapturePhoto}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#a2dd00] text-[11.5px] font-extrabold text-black shadow-[0_2px_10px_-2px_rgba(162,221,0,0.4)] transition-all hover:bg-[#b6ec1f] hover:shadow-[0_4px_14px_-2px_rgba(162,221,0,0.55)] disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-white/35 disabled:shadow-none"
          >
            <Camera className="h-3.5 w-3.5" />
            {t('webcamCapturePhoto')}
          </button>
        ) : isRecording ? (
          <button
            type="button"
            disabled={disabled}
            onClick={handleStopRecording}
            className={`flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-[11.5px] font-extrabold transition-all ${minReached
              ? 'bg-red-500/25 text-red-200 ring-1 ring-red-500/45 hover:bg-red-500/35'
              : 'bg-red-500/15 text-red-300/85 ring-1 ring-red-500/30 hover:bg-red-500/25'
              }`}
            title={
              minReached
                ? t('webcamStopRecording')
                : t('webcamWaitForMin', { s: MIN_VIDEO_DURATION_S - recordingSec })
            }
          >
            <span className="h-2.5 w-2.5 rounded-sm bg-current" />
            {minReached
              ? t('webcamStopRecording')
              : t('webcamStopWait', { s: MIN_VIDEO_DURATION_S - recordingSec })}
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled || !streamReady}
            onClick={handleStartRecording}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-red-500/20 text-[11.5px] font-extrabold text-red-200 ring-1 ring-red-500/40 transition-all hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            {t('webcamStartRecording')}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Selected file preview (post upload / capture) ──────────────────────────

interface FilePreviewProps {
  file: File;
  filePreview: string | null;
  fileDuration: number | null;
  kind: AvatarKind;
  disabled: boolean;
  onReset: () => void;
}
function FilePreview({
  file,
  filePreview,
  fileDuration,
  kind,
  disabled,
  onReset,
}: FilePreviewProps) {
  const t = useTranslations('editorDialogs.avatars.create');
  const isVideo = kind === 'digital_twin';
  return (
    <div className="overflow-hidden rounded-xl border border-[#a2dd00]/35 bg-[#a2dd00]/[0.04]">
      {/* Big media preview */}
      <div className="relative aspect-video w-full bg-black">
        {filePreview ? (
          isVideo ? (
            <video
              src={filePreview}
              className="h-full w-full object-contain"
              controls
              playsInline
              muted
              preload="metadata"
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={filePreview}
              alt="Preview"
              className="h-full w-full object-contain"
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-[#a2dd00]/80" />
          </div>
        )}
      </div>

      {/* File info bar */}
      <div className="flex items-center gap-2 border-t border-[#a2dd00]/15 bg-white/[0.015] px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-bold text-white/90">{file.name}</div>
          <div className="mt-0.5 text-[10.5px] text-white/45 tabular-nums">
            {formatBytes(file.size)}
            {fileDuration ? ` · ${fileDuration}s` : ''}
          </div>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onReset}
          className="shrink-0 rounded-md border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/70 transition-colors hover:border-white/[0.18] hover:bg-white/[0.08] hover:text-white/90 disabled:opacity-60"
        >
          {t('filePreviewReset')}
        </button>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Detect the real MIME type from the file's magic bytes — independent of
 * file extension and browser-reported file.type. Returns null if unknown.
 */
async function detectMimeType(file: File): Promise<string | null> {
  const slice = file.slice(0, 12);
  const buf = new Uint8Array(await slice.arrayBuffer());
  if (buf.length < 4) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return 'image/png';
  }
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  // WEBP: 'RIFF' + 'WEBP'
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return 'image/webp';
  }
  // MP4 / QuickTime: bytes 4..7 spell 'ftyp'
  if (buf.length >= 8 && buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    return 'video/mp4';
  }
  // WEBM (EBML header): 1A 45 DF A3
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    return 'video/webm';
  }
  return null;
}

function mimeToExt(mime: string): string {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'video/mp4':
      return 'mp4';
    case 'video/quicktime':
      return 'mov';
    case 'video/webm':
      return 'webm';
    default:
      return 'bin';
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function probeDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler o vídeo.'));
    };
  });
}

function uploadToR2(
  url: string,
  file: File,
  contentType: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Falha no upload (status ${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Falha de rede no upload.'));
    xhr.send(file);
  });
}

/**
 * Picks the best MediaRecorder MIME type the browser supports.
 * Safari supports MP4 natively; Chrome/Firefox typically only support WebM.
 * Returns undefined to let MediaRecorder pick its default.
 */
function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return undefined;
}

function formatRecordingTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
