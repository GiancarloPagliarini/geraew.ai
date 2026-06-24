'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Resultado do recorte — mesmo formato de UploadedImage. */
export interface CropResult {
  base64: string;
  mime_type: string;
  preview: string;
}

interface ImageCropModalProps {
  /** dataURL da imagem a recortar */
  src: string;
  /** mime de saída (default: image/png) */
  mimeType?: string;
  onClose: () => void;
  onCrop: (result: CropResult) => void;
}

type Rect = { x: number; y: number; w: number; h: number };
type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move';

const MIN = 24; // tamanho mínimo do recorte em px (no espaço exibido)

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const CURSOR: Record<Handle, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  move: 'move',
};

/** Mini-editor de recorte de imagem (free-form). Saída via canvas em pixels nativos. */
export function ImageCropModal({ src, mimeType = 'image/png', onClose, onCrop }: ImageCropModalProps) {
  const t = useTranslations('home');
  const [closing, setClosing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null); // tamanho exibido da img
  const [crop, setCrop] = useState<Rect | null>(null);
  const drag = useRef<{ handle: Handle; startX: number; startY: number; orig: Rect } | null>(null);
  const boxRef = useRef(box);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    boxRef.current = box;
  }, [box]);

  const close = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 180);
  }, [onClose]);

  // mede a imagem exibida e inicia o recorte cobrindo tudo
  const measure = useCallback((resetCrop: boolean) => {
    const el = imgRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (!w || !h) return;
    setBox((prev) => {
      // reescala o recorte proporcionalmente quando a área muda (resize de janela)
      if (prev && !resetCrop) {
        setCrop((c) =>
          c ? { x: (c.x * w) / prev.w, y: (c.y * h) / prev.h, w: (c.w * w) / prev.w, h: (c.h * h) / prev.h } : c,
        );
      }
      return { w, h };
    });
    if (resetCrop) setCrop({ x: 0, y: 0, w, h });
  }, []);

  useEffect(() => {
    const onResize = () => measure(false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measure]);

  // ESC fecha
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // handlers estáveis: leem `box` via ref; AbortController remove os dois listeners de uma vez
  const onMove = useCallback((e: PointerEvent) => {
    const d = drag.current;
    const b = boxRef.current;
    if (!d || !b) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    let { x, y, w, h } = d.orig;
    const H = d.handle;
    if (H === 'move') {
      x = clamp(x + dx, 0, b.w - w);
      y = clamp(y + dy, 0, b.h - h);
    } else {
      let left = x;
      let top = y;
      let right = x + w;
      let bottom = y + h;
      if (H.includes('w')) left = clamp(x + dx, 0, right - MIN);
      if (H.includes('e')) right = clamp(right + dx, left + MIN, b.w);
      if (H.includes('n')) top = clamp(y + dy, 0, bottom - MIN);
      if (H.includes('s')) bottom = clamp(bottom + dy, top + MIN, b.h);
      x = left;
      y = top;
      w = right - left;
      h = bottom - top;
    }
    setCrop({ x, y, w, h });
  }, []);

  const endDrag = useCallback(() => {
    drag.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const startDrag = (handle: Handle) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!crop) return;
    drag.current = { handle, startX: e.clientX, startY: e.clientY, orig: { ...crop } };
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    window.addEventListener('pointermove', onMove, { signal: ctrl.signal });
    window.addEventListener('pointerup', endDrag, { signal: ctrl.signal });
  };

  useEffect(() => () => abortRef.current?.abort(), []);

  const apply = () => {
    const el = imgRef.current;
    if (!el || !crop || !box) return;
    const scaleX = el.naturalWidth / box.w;
    const scaleY = el.naturalHeight / box.h;
    const sx = Math.round(crop.x * scaleX);
    const sy = Math.round(crop.y * scaleY);
    const sw = Math.max(1, Math.round(crop.w * scaleX));
    const sh = Math.max(1, Math.round(crop.h * scaleY));
    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(el, sx, sy, sw, sh, 0, 0, sw, sh);
    const out = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
    const dataUrl = canvas.toDataURL(out, 0.92);
    onCrop({ base64: dataUrl.split(',')[1], mime_type: out, preview: dataUrl });
    close();
  };

  const HANDLES: { h: Handle; cls: string }[] = [
    { h: 'nw', cls: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2' },
    { h: 'n', cls: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2' },
    { h: 'ne', cls: 'right-0 top-0 translate-x-1/2 -translate-y-1/2' },
    { h: 'e', cls: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2' },
    { h: 'se', cls: 'right-0 bottom-0 translate-x-1/2 translate-y-1/2' },
    { h: 's', cls: 'left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2' },
    { h: 'sw', cls: 'left-0 bottom-0 -translate-x-1/2 translate-y-1/2' },
    { h: 'w', cls: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2' },
  ];

  return (
    <div
      className={cn(
        'fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[rgba(8,10,11,0.7)] p-4 backdrop-blur-[6px]',
        closing ? 'pointer-events-none animate-overlay-out' : 'animate-overlay-in',
      )}
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('image.cropTitle')}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'flex max-h-[90vh] w-[min(720px,calc(100vw-32px))] flex-col overflow-hidden rounded-[18px] border border-app-hairline-2 bg-app-card shadow-[0_30px_80px_rgba(0,0,0,0.6)]',
          closing ? 'animate-dialog-out' : 'animate-dialog-in',
        )}
      >
        {/* cabeçalho */}
        <div className="flex items-center gap-3 border-b border-app-hairline px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-bold text-app-text">{t('image.cropTitle')}</h2>
            <p className="mt-0.5 truncate text-[12.5px] text-app-text-2">{t('image.cropHint')}</p>
          </div>
          <button
            type="button"
            aria-label={t('palette.close')}
            onClick={close}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-app-text-2 transition-colors duration-200 ease-app hover:bg-app-surface hover:text-app-text"
          >
            <X className="size-[18px]" strokeWidth={1.8} />
          </button>
        </div>

        {/* área de recorte */}
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#0d1011] p-5">
          <div className="relative inline-block leading-[0]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              onLoad={() => measure(true)}
              className="block max-h-[60vh] max-w-full select-none rounded-md"
            />

            {crop && box && (
              <div className="absolute inset-0 touch-none">
                {/* escurece a área fora do recorte */}
                <div
                  className="pointer-events-none absolute"
                  style={{
                    left: crop.x,
                    top: crop.y,
                    width: crop.w,
                    height: crop.h,
                    boxShadow: '0 0 0 9999px rgba(8,10,11,0.62)',
                  }}
                />
                {/* caixa de recorte */}
                <div
                  className="absolute border border-app-lime"
                  style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h, cursor: 'move' }}
                  onPointerDown={startDrag('move')}
                >
                  {/* grade rule-of-thirds */}
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-y-0 left-1/3 w-px bg-app-lime/25" />
                    <div className="absolute inset-y-0 left-2/3 w-px bg-app-lime/25" />
                    <div className="absolute inset-x-0 top-1/3 h-px bg-app-lime/25" />
                    <div className="absolute inset-x-0 top-2/3 h-px bg-app-lime/25" />
                  </div>
                  {/* alças */}
                  {HANDLES.map(({ h, cls }) => (
                    <span
                      key={h}
                      onPointerDown={startDrag(h)}
                      style={{ cursor: CURSOR[h] }}
                      className={cn(
                        'absolute size-3 rounded-full border-2 border-app-lime bg-app-card shadow-[0_1px_4px_rgba(0,0,0,0.5)]',
                        cls,
                      )}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* rodapé */}
        <div className="flex items-center justify-between gap-3 border-t border-app-hairline px-5 py-4">
          <button
            type="button"
            onClick={() => measure(true)}
            className="flex h-10 items-center gap-2 rounded-[10px] border border-app-hairline px-4 text-[13.5px] font-semibold text-app-text-2 transition-colors duration-200 ease-app hover:border-app-hairline-2 hover:text-app-text"
          >
            <RotateCcw className="size-4" strokeWidth={1.8} />
            {t('image.cropReset')}
          </button>
          <button
            type="button"
            onClick={apply}
            className="flex h-10 items-center gap-2 rounded-[10px] bg-app-lime px-5 text-[13.5px] font-semibold text-app-lime-ink transition-colors duration-200 ease-app hover:bg-app-lime-hover"
          >
            <Check className="size-4" strokeWidth={2.2} />
            {t('image.cropApply')}
          </button>
        </div>
      </div>
    </div>
  );
}
