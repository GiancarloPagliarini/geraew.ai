'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowUp, Image, ImagePlus, Loader2, Settings2, Trash, Trash2, X } from 'lucide-react';
import { PanelDuplicateButton } from './PanelDuplicateButton';
import { useEffect, useRef, useState } from 'react';
import { useEditor } from '@/lib/editor-context';
import { GenerationPreview, PROPORTION_ASPECT } from './GenerationPreview';

// ─── types ────────────────────────────────────────────────────────────────────

type GenState = 'idle' | 'generating' | 'done';

// ─── component ────────────────────────────────────────────────────────────────

interface GenericPanelProps {
  nodeId: string;
  onClose?: () => void;
  onDuplicate?: () => void;
}

export function GenericPanel({ nodeId, onClose, onDuplicate }: GenericPanelProps) {
  const { consumeCredits } = useEditor();

  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('gemini-3.1-flash-image-preview');
  const [proportion, setProportion] = useState('16-9');
  const [quality, setQuality] = useState('hd');
  const [attachedImages, setAttachedImages] = useState<{ preview: string }[]>([]);

  const [genState, setGenState] = useState<GenState>('idle');
  const [result, setResult] = useState('');
  const [imageVisible, setImageVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Block wheel from reaching ReactFlow when scrolling inside the textarea
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const onWheel = (e: WheelEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'TEXTAREA') e.stopPropagation();
    };
    panel.addEventListener('wheel', onWheel, { capture: true });
    return () => panel.removeEventListener('wheel', onWheel, { capture: true });
  }, []);

  const isGenerating = genState === 'generating';

  function handleGenerate() {
    if (!prompt.trim()) return;
    consumeCredits(5);
    setGenState('generating');
    setResult('');
    setImageVisible(false);
    setProgress(0);
    progressRef.current = setInterval(() => {
      setProgress((p) => (p >= 80 ? 80 : p + 3));
    }, 100);
    setTimeout(() => {
      if (progressRef.current) clearInterval(progressRef.current);
      setProgress(100);
      setResult(
        'Este é um resultado simulado para o prompt fornecido. ' +
        'Em produção, este painel enviará o prompt para a API configurada e retornará o resultado real.'
      );
      setGenState('done');
      setTimeout(() => setImageVisible(true), 60);
    }, 2000);
  }

  function handleClear() {
    if (progressRef.current) clearInterval(progressRef.current);
    setGenState('idle');
    setResult('');
    setImageVisible(false);
    setProgress(0);
  }

  function handleAddImage(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    files.slice(0, 4 - attachedImages.length).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const preview = ev.target?.result as string;
        setAttachedImages((prev) => [...prev, { preview }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  function removeImage(i: number) {
    setAttachedImages((prev) => prev.filter((_, idx) => idx !== i));
  }

  const MODEL_LABELS: Record<string, string> = {
    'gemini-3.1-flash-image-preview': 'Nano Banana 2',
    'gemini-3-pro-image-preview': 'Nano Banana Pro',
  };

  return (
    <div ref={panelRef} className="panel-drag-handle cursor-grab active:cursor-grabbing flex flex-col items-center gap-2">

      {/* ── horizontal: [images column] + [header + card + pill] ── */}
      <div className="flex items-end gap-2">

        {/* images column — visible only when images are attached */}
        {attachedImages.length > 0 && (
          <div className="flex flex-col gap-1.5 mb-18">
            {attachedImages.map((img, i) => (
              <div key={i} className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[#f3f0ed]/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.preview} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute inset-0 flex items-center justify-center bg-black/70 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* card column: header + card + pill */}
        <div className="flex flex-col items-center gap-2">

          {/* header */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5">
              <Image className="h-3.5 w-3.5 text-[#f3f0ed]/40" />
              <span className="text-[11px] font-semibold text-[#f3f0ed]/40">Imagem</span>
            </div>
            <span className="text-[11px] font-semibold text-[#a2dd00]/70">
              {MODEL_LABELS[model]}
            </span>
          </div>

          {/* main card */}
          <div className="w-lg overflow-hidden rounded-2xl border border-[#f3f0ed]/8 bg-[#1a2123] shadow-2xl shadow-black/50">
            {/* Preview area */}
            {genState === 'idle' ? (
              <div
                className="relative flex w-full items-center justify-center bg-[#111819]"
                style={{ aspectRatio: PROPORTION_ASPECT[proportion] ?? '16 / 9' }}
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <Image className="h-8 w-8 text-[#f3f0ed] opacity-25" />
                  <span className="text-xs text-[#f3f0ed]/25">Sua geração aparecerá aqui</span>
                </div>
              </div>
            ) : (
              <GenerationPreview
                genState={genState}
                imageVisible={imageVisible}
                progress={progress}
                proportion={proportion}
                renderMedia={result ? () => (
                  <div className="sidebar-scroll h-full w-full overflow-y-auto bg-[#111819] p-4">
                    <div className="flex items-center justify-between pb-2">
                      <span className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">RESULTADO</span>
                      <button
                        onClick={handleClear}
                        className="text-[10px] font-bold tracking-widest text-[#f3f0ed]/25 transition-colors hover:text-[#f3f0ed]/50"
                      >
                        LIMPAR
                      </button>
                    </div>
                    <p className="text-sm leading-relaxed text-[#f3f0ed]/80">{result}</p>
                  </div>
                ) : undefined}
              />
            )}

            {/* Prompt bar */}
            <div className="flex items-end gap-2 border-t border-[#f3f0ed]/[0.07] bg-[#161d1f] px-3 py-2.5">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="Digite seu prompt aqui..."
                disabled={isGenerating}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                className="flex-1 resize-none bg-transparent text-sm text-[#f3f0ed]/90 placeholder-[#f3f0ed]/25 outline-none disabled:opacity-50"
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="mb-0.5 flex items-center gap-1.5 rounded-full px-3 py-3 text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                style={{
                  background: isGenerating ? 'rgba(162,221,0,0.12)' : '#a2dd00',
                  color: isGenerating ? '#a2dd00' : '#1a2123',
                  border: isGenerating ? '1px solid rgba(162,221,0,0.2)' : 'none',
                }}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>{/* end main card */}

          {/* ── Floating options pill ── */}
          <div
            className="flex items-center gap-3 rounded-lg border border-[#f3f0ed]/8 bg-[#1a2123]/90 px-3 py-1.5 shadow-xl backdrop-blur-md"
            style={{ opacity: isGenerating ? 0.4 : 1, pointerEvents: isGenerating ? 'none' : undefined }}
          >
            <BarSelect
              value={model}
              onValueChange={setModel}
              options={[
                { value: 'gemini-3.1-flash-image-preview', label: 'Nano Banana 2' },
                { value: 'gemini-3-pro-image-preview', label: 'Nano Banana Pro' },
              ]}
            />

            <BarSelect
              value={proportion}
              onValueChange={setProportion}
              options={[
                { value: '16-9', label: '16:9' },
                { value: '9-16', label: '9:16' },
                { value: '1-1', label: '1:1' },
                { value: '4-3', label: '4:3' },
              ]}
            />

            <BarSelect
              value={quality}
              onValueChange={setQuality}
              options={[
                { value: '4k', label: '4K' },
                { value: 'hd', label: '2K' },
                { value: 'sd', label: '1K' },
              ]}
            />

            <div className="h-3 w-px shrink-0 bg-[#f3f0ed]/10" />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleAddImage}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={attachedImages.length >= 4}
              title="Adicionar imagem de referência"
              className="flex h-6 w-6 items-center justify-center rounded-full text-[#f3f0ed]/35 transition-all hover:text-[#f3f0ed]/70 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ImagePlus className="h-4 w-4" />
            </button>

            <PanelDuplicateButton onClick={onDuplicate} />

            <button
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded-full text-red-500/30 transition-all hover:bg-red-500/8 hover:text-red-500/80"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>{/* end pill */}

        </div>{/* end card column */}

      </div>{/* end flex items-end */}

    </div>
  );
}

// ─── Compact bar select ───────────────────────────────────────────────────────

function BarSelect({
  value,
  onValueChange,
  options,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-auto w-auto border-none bg-transparent p-0 text-[11px] font-semibold text-[#f3f0ed]/50 shadow-none outline-none ring-0 transition-colors hover:text-[#f3f0ed]/80 focus:ring-0 [&>svg]:ml-0.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-[#f3f0ed]/25">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-xl border border-[#f3f0ed]/8 bg-[#1a2123] p-1 shadow-2xl shadow-black/60 backdrop-blur-md">
        {options.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            className="cursor-pointer rounded-lg px-3 py-2 text-xs text-[#f3f0ed]/70 transition-all focus:bg-[#1e494b]/40 focus:text-[#f3f0ed] data-[state=checked]:text-[#a2dd00] [&>span:last-child>svg]:text-[#a2dd00]"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
