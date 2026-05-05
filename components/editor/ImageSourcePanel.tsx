'use client';

import { FolderOpen, Image as ImageIcon, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { idbDelete, idbLoad, idbSave } from '@/lib/panel-idb';
import { useEditor } from '@/lib/editor-context';
import { PanelDuplicateButton } from './PanelDuplicateButton';
import { StudioImageOutputHandle } from './studio/StudioHandles';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1920;
const IMAGE_QUALITY = 0.9;

async function compressImage(dataUrl: string, mimeType: string): Promise<{ dataUrl: string; mimeType: string }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(w, h));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const outMime = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
      const compressed = canvas.toDataURL(outMime, IMAGE_QUALITY);
      resolve({ dataUrl: compressed, mimeType: outMime });
    };
    img.onerror = () => resolve({ dataUrl, mimeType });
    img.src = dataUrl;
  });
}

interface ImageSourcePanelProps {
  nodeId: string;
  onClose?: () => void;
  onDuplicate?: () => void;
}

export function ImageSourcePanel({ nodeId, onClose, onDuplicate }: ImageSourcePanelProps) {
  const { setNodeImage, openGalleryPicker } = useEditor();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const storageKey = `geraew-panel-image-source-${nodeId}`;
  const [preview, setPreview] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Restore from IDB on mount
  useEffect(() => {
    idbLoad<{ preview: string }>(`${storageKey}-image`)
      .then((data) => {
        if (data?.preview) {
          setPreview(data.preview);
          setNodeImage(nodeId, data.preview);
        }
      })
      .catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function processFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    if (file.size > MAX_IMAGE_SIZE) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const rawDataUrl = ev.target?.result as string;
      const { dataUrl } = await compressImage(rawDataUrl, file.type);
      setPreview(dataUrl);
      setNodeImage(nodeId, dataUrl);
      idbSave(`${storageKey}-image`, { preview: dataUrl }).catch(() => { });
    };
    reader.readAsDataURL(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
    if (file) processFile(file);
  }

  function handleClear() {
    setPreview(null);
    setNodeImage(nodeId, '');
    idbDelete(`${storageKey}-image`).catch(() => { });
  }

  async function addFromUrl(url: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const rawDataUrl = ev.target?.result as string;
        const { dataUrl } = await compressImage(rawDataUrl, blob.type || 'image/jpeg');
        setPreview(dataUrl);
        setNodeImage(nodeId, dataUrl);
        idbSave(`${storageKey}-image`, { preview: dataUrl }).catch(() => { });
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('[image-source] failed to load gallery image', err);
    }
  }

  function openGallery() {
    openGalleryPicker({
      nodeId,
      remaining: 1,
      onSelect: (url) => { addFromUrl(url); },
    });
  }

  return (
    <div className="relative">
      <StudioImageOutputHandle />
      <div
        className={`group/studio max-w-[calc(100vw-5rem)] overflow-hidden rounded-2xl bg-[#161a1c] shadow-2xl shadow-black/50 ${isDraggingOver ? 'ring-2 ring-[#a2dd00]/30' : ''}`}
        style={{ width: 240 }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); }}
        onDrop={handleDrop}
      >
        <div className="panel-drag-handle flex cursor-grab items-center justify-between px-3 py-2.5 active:cursor-grabbing">
          <div className="flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-[#f3f0ed]/40" />
            <span className="text-[11px] font-medium text-[#f3f0ed]/60">Input Image</span>
          </div>
          <div className="flex items-center gap-1">
            <PanelDuplicateButton onClick={onDuplicate} />
            <button
              onClick={() => { idbDelete(`${storageKey}-image`).catch(() => { }); onClose?.(); }}
              className="flex h-5 w-5 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/8 hover:text-[#f3f0ed]/80"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="px-3 pb-3">
          {preview ? (
            <div className="group/slot relative aspect-square overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="h-full w-full object-cover" />
              <button
                onClick={handleClear}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-[#f3f0ed]/80 opacity-0 transition-opacity hover:text-[#f3f0ed] group-hover/slot:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="group/slot relative aspect-square w-full overflow-hidden rounded-xl bg-[#0d1011] transition-all hover:bg-[#0f1416]">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-[#f3f0ed]/40 transition-colors hover:text-[#a2dd00]"
              >
                <Plus className="h-5 w-5" />
                <span className="text-[11px] font-medium">Anexar imagem</span>
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openGallery(); }}
                title="Escolher da galeria"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#1a2123]/80 text-[#f3f0ed]/60 backdrop-blur-sm transition-all hover:bg-[#1e494b] hover:text-[#a2dd00]"
              >
                <FolderOpen className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
        </div>
      </div>
    </div>
  );
}
