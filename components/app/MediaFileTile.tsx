'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { X, type LucideIcon } from 'lucide-react';

export interface MediaFile {
  base64: string;
  mime_type: string;
  duration: number;
  filename: string;
}

/** Lê a duração de um vídeo/áudio local via metadata. */
export function readMediaDuration(file: File | Blob, kind: 'video' | 'audio'): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement(kind);
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(el.duration);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    el.src = url;
  });
}

interface MediaFileTileProps {
  label: string;
  icon: LucideIcon;
  kind: 'video' | 'audio';
  value: MediaFile | null;
  onChange: (file: MediaFile | null) => void;
  maxMB: number;
  /** duração máxima em segundos (sem limite quando omitido) */
  maxSeconds?: number;
  /** acima disso o backend corta automaticamente (só avisa, não bloqueia) */
  truncateAfterSeconds?: number;
}

/** Tile de upload de vídeo/áudio de referência (mesmos limites do workspace). */
export function MediaFileTile({
  label,
  icon: Icon,
  kind,
  value,
  onChange,
  maxMB,
  maxSeconds,
  truncateAfterSeconds,
}: MediaFileTileProps) {
  const t = useTranslations('home');
  const inputRef = useRef<HTMLInputElement>(null);

  const process = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith(`${kind}/`)) {
      toast.error(kind === 'video' ? t('video.mustBeVideo') : t('video.mustBeAudio'));
      return;
    }
    if (file.size > maxMB * 1024 * 1024) {
      toast.error(t('video.mediaTooLarge', { max: maxMB }));
      return;
    }
    const duration = await readMediaDuration(file, kind);
    if (maxSeconds !== undefined && duration > maxSeconds) {
      toast.error(t('video.mediaTooLong', { max: maxSeconds }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onChange({
        base64: dataUrl.split(',')[1],
        mime_type: file.type,
        duration,
        filename: file.name,
      });
      if (truncateAfterSeconds && duration > truncateAfterSeconds) {
        toast.info(t('video.videoTruncated', { max: truncateAfterSeconds }));
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={`${kind}/*`}
        className="hidden"
        onChange={(e) => {
          void process(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {value ? (
        <div className="group relative flex h-full min-h-[76px] flex-col items-center justify-center gap-1 rounded-xl border border-[rgba(162,221,0,0.3)] bg-app-surface px-2">
          <Icon className="size-[18px] text-app-lime" strokeWidth={1.8} />
          <span className="w-full truncate text-center text-[10.5px] font-semibold text-app-text">
            {value.filename}
          </span>
          <span className="font-mono text-[10px] text-app-muted">{Math.round(value.duration)}s</span>
          <button
            type="button"
            aria-label={t('clone.remove')}
            onClick={() => onChange(null)}
            className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-[rgba(13,16,17,0.75)] text-app-text-2 opacity-0 backdrop-blur-sm transition-opacity duration-200 ease-app hover:text-app-text group-hover:opacity-100"
          >
            <X className="size-3" strokeWidth={2} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-full min-h-[76px] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-app-hairline-2 text-app-text-2 transition-colors duration-200 ease-app hover:border-[rgba(162,221,0,0.4)] hover:text-app-text"
        >
          <Icon className="size-[19px]" strokeWidth={1.8} />
          <span className="px-1 text-center text-[12px] font-semibold leading-tight">{label}</span>
        </button>
      )}
    </>
  );
}
