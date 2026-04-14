'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

export default function PromptAgentPage() {
  const [imageData, setImageData] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [modoVideo, setModoVideo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ json: any; compiledPrompt: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!ACCEPTED.includes(file.type)) {
      toast.error('Formato inválido. Use JPEG, PNG ou WebP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Imagem muito grande (máx 5MB).');
      return;
    }
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
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const analyze = async () => {
    if (!imageData) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/v1/prompt-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, modoVideo }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Falha na análise');
        return;
      }
      setResult(data);
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

  return (
    <div className="min-h-screen bg-[#1a2123] text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Image-to-Prompt Agent</h1>
          <p className="text-white/60 mt-1">Envie uma imagem e receba o prompt estruturado pronto pra usar em Flux, Nano Banana, SDXL ou Veo.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-4 bg-[#222a2c] border-white/10">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer rounded-lg border-2 border-dashed transition-colors ${dragOver ? 'border-lime-400 bg-lime-400/5' : 'border-white/20'} flex items-center justify-center min-h-[280px] overflow-hidden`}
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="preview" className="max-h-[400px] object-contain" />
              ) : (
                <div className="text-center p-8 text-white/60">
                  <p className="text-lg mb-2">Arraste uma imagem aqui</p>
                  <p className="text-sm">ou clique para selecionar (JPEG, PNG, WebP — máx 5MB)</p>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED.join(',')}
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>

            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={modoVideo}
                  onChange={(e) => setModoVideo(e.target.checked)}
                  className="size-4 accent-lime-400"
                />
                <span className="text-sm">Modo vídeo (Veo) — remove descrições físicas</span>
              </label>

              <Button
                onClick={analyze}
                disabled={!imageData || loading}
                className="w-full bg-lime-400 text-black hover:bg-lime-300"
              >
                {loading ? 'Analisando...' : 'Analisar imagem'}
              </Button>
            </div>
          </Card>

          <Card className="p-4 bg-[#222a2c] border-white/10 min-h-[280px]">
            {!result && !loading && (
              <div className="flex items-center justify-center h-full text-white/40 text-sm">
                O resultado aparecerá aqui.
              </div>
            )}
            {loading && (
              <div className="flex items-center justify-center h-full text-white/60 text-sm">
                Analisando imagem (pode levar 15-30s)...
              </div>
            )}
            {result && (
              <Tabs defaultValue="json" className="w-full">
                <TabsList className="bg-white/5">
                  <TabsTrigger value="json">JSON</TabsTrigger>
                  <TabsTrigger value="prompt">Prompt String</TabsTrigger>
                </TabsList>
                <TabsContent value="json">
                  <div className="flex justify-end mb-2">
                    <Button size="sm" variant="outline" onClick={() => copy(JSON.stringify(result.json, null, 2), 'JSON')}>
                      Copiar JSON
                    </Button>
                  </div>
                  <pre className="bg-black/40 text-xs p-3 rounded overflow-auto max-h-[500px] whitespace-pre-wrap">
                    {JSON.stringify(result.json, null, 2)}
                  </pre>
                </TabsContent>
                <TabsContent value="prompt">
                  <div className="flex justify-end mb-2">
                    <Button size="sm" variant="outline" onClick={() => copy(result.compiledPrompt, 'Prompt')}>
                      Copiar Prompt
                    </Button>
                  </div>
                  <div className="bg-black/40 text-sm p-3 rounded max-h-[500px] overflow-auto whitespace-pre-wrap">
                    {result.compiledPrompt}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
