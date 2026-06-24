'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Pencil, Plus, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageCropModal } from '@/components/image/ImageCropModal';

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
  const [cropOpen, setCropOpen] = useState(false);

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
          <div className="absolute right-1.5 top-1.5 flex items-center gap-1 opacity-0 transition-opacity duration-200 ease-app group-hover:opacity-100">
            <button
              type="button"
              aria-label={t('image.cropEdit')}
              title={t('image.cropEdit')}
              onClick={() => setCropOpen(true)}
              className="flex size-5 items-center justify-center rounded-full bg-[rgba(13,16,17,0.75)] text-app-text-2 backdrop-blur-sm transition-colors duration-200 ease-app hover:text-app-lime"
            >
              <Pencil className="size-3" strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label={t('clone.remove')}
              onClick={() => onChange(null)}
              className="flex size-5 items-center justify-center rounded-full bg-[rgba(13,16,17,0.75)] text-app-text-2 backdrop-blur-sm transition-colors duration-200 ease-app hover:text-app-text"
            >
              <X className="size-3" strokeWidth={2} />
            </button>
          </div>
          {cropOpen && (
            <ImageCropModal
              src={value.preview}
              mimeType={value.mime_type}
              onClose={() => setCropOpen(false)}
              onCrop={(result) => onChange(result)}
            />
          )}
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
