'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Plus, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEFAULT_MAX_MB = 5;

export interface UploadedImage {
  /** base64 cru (sem prefixo dataURL) — formato esperado pela API */
  base64: string;
  mime_type: string;
  /** dataURL para exibir o preview */
  preview: string;
}

interface ImageDropTileProps {
  label: string;
  value: UploadedImage | null;
  onChange: (image: UploadedImage | null) => void;
  /** ícone do estado vazio (default: +) */
  icon?: LucideIcon;
  /** mime types aceitos (default: jpeg/png/webp) */
  accept?: string[];
  /** tamanho máximo em MB (default: 5) */
  maxMB?: number;
  className?: string;
}

/** Tile de upload de uma imagem: clique ou arraste; preview com remover. */
export function ImageDropTile({
  label,
  value,
  onChange,
  icon: Icon = Plus,
  accept = ['image/jpeg', 'image/png', 'image/webp'],
  maxMB = DEFAULT_MAX_MB,
  className,
}: ImageDropTileProps) {
  const t = useTranslations('home');
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!accept.includes(file.type)) {
      toast.error(t('clone.invalidFormat'));
      return;
    }
    if (file.size > maxMB * 1024 * 1024) {
      toast.error(t('clone.tooLarge', { max: maxMB }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onChange({ base64: dataUrl.split(',')[1], mime_type: file.type, preview: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept.join(',')}
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {value ? (
        <div className="group relative h-full min-h-[96px] overflow-hidden rounded-xl border border-app-hairline bg-app-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.preview} alt={label} className="size-full object-cover" />
          <span className="absolute bottom-1.5 left-1.5 rounded-full bg-[rgba(13,16,17,0.7)] px-2 py-0.5 text-[10.5px] font-semibold text-app-text backdrop-blur-sm">
            {label}
          </span>
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
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            'flex h-full min-h-[96px] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed text-app-text-2 transition-colors duration-200 ease-app',
            dragOver
              ? 'border-[rgba(162,221,0,0.6)] bg-[rgba(162,221,0,0.05)] text-app-text'
              : 'border-app-hairline-2 hover:border-[rgba(162,221,0,0.4)] hover:text-app-text',
          )}
        >
          <Icon className="size-[19px]" strokeWidth={1.8} />
          <span className="px-2 text-center text-[12px] font-semibold">{label}</span>
        </button>
      )}
    </div>
  );
}
