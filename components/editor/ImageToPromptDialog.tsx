'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Upload, Loader2, Copy, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

export function ImageToPromptDialog({ open, onOpenChange }: Props) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ json: any; compiledPrompt: string } | null>(null);
  const [tab, setTab] = useState<'json' | 'prompt'>('prompt');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); }
    else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => { setMounted(false); setClosing(false); }, 200);
      return () => clearTimeout(t);
    }
  }, [open, mounted]);

  const handleFile = useCallback((file: File) => {
    if (!ACCEPTED.includes(file.type)) { toast.error('Formato inválido. Use JPEG, PNG ou WebP.'); return; }
    if (file.size > MAX_BYTES) { toast.error('Imagem muito grande (máx 5MB).'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImageData(dataUrl);
      setPreviewUrl(dataUrl);
      setResult(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const analyze = async () => {
    if (!imageData) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch('/api/v1/prompt-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Falha na análise'); return; }
      setResult(data);
      setTab('prompt');
    } catch (err: any) {
      toast.error(err?.message || 'Erro de rede');
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const reset = () => { setImageData(null); setPreviewUrl(null); setResult(null); };

  if (!mounted) return null;

  return (
    <aside
      className={`${closing ? 'aside-out-left' : 'aside-in-left'} fixed inset-0 z-50 flex flex-col bg-[#171f21] text-[#f3f0ed] overflow-hidden sm:static sm:h-full sm:w-xl sm:shrink-0 border-r border-white/[0.06]`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <ImageIcon className="h-4 w-4 text-[#a2dd00]" />
          <span className="text-sm font-semibold tracking-tight text-white/85">CLONE DE PROMPT</span>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className="text-xs text-white/50 leading-relaxed">
          Envie uma imagem e receba o prompt estruturado pronto pra usar em Flux, Nano Banana, SDXL ou Veo.
        </p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-lg border-2 border-dashed transition-colors ${dragOver ? 'border-[#a2dd00] bg-[#a2dd00]/5' : 'border-white/15 hover:border-white/30'} flex items-center justify-center min-h-[200px] overflow-hidden`}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="preview" className="max-h-[300px] object-contain" />
          ) : (
            <div className="text-center p-6 text-white/50">
              <Upload className="h-6 w-6 mx-auto mb-2 text-white/30" />
              <p className="text-sm">Arraste uma imagem ou clique</p>
              <p className="text-[10px] mt-1 text-white/30">JPEG, PNG ou WebP — máx 5MB</p>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={analyze}
            disabled={!imageData || loading}
            className="flex-1 h-9 rounded-lg bg-[#a2dd00] text-black text-xs font-bold tracking-wide hover:bg-[#b6f000] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> ANALISANDO...</>) : 'ANALISAR IMAGEM'}
          </button>
          {imageData && !loading && (
            <button
              onClick={reset}
              className="h-9 px-3 rounded-lg bg-white/[0.05] text-white/70 text-xs font-bold hover:bg-white/[0.1] transition-colors"
            >
              LIMPAR
            </button>
          )}
        </div>

        {result && (
          <div className="space-y-3 pt-2 border-t border-white/[0.06]">
            <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-1">
              <button
                onClick={() => setTab('prompt')}
                className={`flex-1 h-7 rounded-md text-[10px] font-bold tracking-wide transition-colors ${tab === 'prompt' ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/70'}`}
              >
                PROMPT STRING
              </button>
              <button
                onClick={() => setTab('json')}
                className={`flex-1 h-7 rounded-md text-[10px] font-bold tracking-wide transition-colors ${tab === 'json' ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/70'}`}
              >
                JSON
              </button>
            </div>

            {tab === 'prompt' ? (
              <div>
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => copy(result.compiledPrompt, 'Prompt')}
                    className="flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-[#a2dd00]/15 text-[#a2dd00] text-[10px] font-bold hover:bg-[#a2dd00]/25 transition-colors"
                  >
                    <Copy className="h-3 w-3" /> COPIAR PROMPT
                  </button>
                </div>
                <div className="bg-black/40 text-xs p-3 rounded-lg max-h-[400px] overflow-auto whitespace-pre-wrap text-white/80 leading-relaxed">
                  {result.compiledPrompt}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => copy(JSON.stringify(result.json, null, 2), 'JSON')}
                    className="flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-[#a2dd00]/15 text-[#a2dd00] text-[10px] font-bold hover:bg-[#a2dd00]/25 transition-colors"
                  >
                    <Copy className="h-3 w-3" /> COPIAR JSON
                  </button>
                </div>
                <pre className="bg-black/40 text-[11px] p-3 rounded-lg max-h-[400px] overflow-auto whitespace-pre-wrap text-white/80 leading-relaxed">
                  {JSON.stringify(result.json, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
