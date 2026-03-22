'use client';

import { useEditor } from '@/lib/editor-context';
import {
  CheckCircle2,
  Loader2,
  Maximize2,
  ScanFace,
  Settings2,
  User,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Section } from './Section';
import { InfluencerSidebar } from './InfluencerSidebar';

// ─── UpscaleSection ───────────────────────────────────────────────────────────

const MODELS = [
  { value: 'real-esrgan-x4', name: 'Real-ESRGAN', tag: 'x4', desc: 'Melhor qualidade', recommended: true },
  { value: 'real-esrgan-x2', name: 'Real-ESRGAN', tag: 'x2', desc: 'Mais rápido' },
  { value: 'esrgan-pro', name: 'ESRGAN', tag: 'Pro', desc: 'Detalhes nítidos' },
  { value: 'swinir-ultra', name: 'SwinIR', tag: 'Ultra', desc: 'Preserva texturas' },
];

function UpscaleSection({ generatedImage, nodeId }: { generatedImage: string; nodeId: string }) {
  const { nodeUpscaleStates, setNodeUpscaleState } = useEditor();
  const upscaleState = nodeUpscaleStates[nodeId] ?? 'idle';
  const [model, setModel] = useState('real-esrgan-x4');
  const [scale, setScale] = useState('4×');

  function handleApply() {
    if (upscaleState === 'upscaling') return;
    setNodeUpscaleState(nodeId, 'upscaling');
    setTimeout(() => setNodeUpscaleState(nodeId, 'done'), 2500);
  }

  function resetIfDone() {
    if (upscaleState === 'done') setNodeUpscaleState(nodeId, 'idle');
  }

  return (
    <div className="mt-1 space-y-4">
      {/* Image preview */}
      <div className="relative overflow-hidden rounded-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={generatedImage}
          alt="Preview"
          className="h-32 w-full object-cover"
          draggable={false}
          style={{
            transition: 'filter 0.8s ease',
            filter:
              upscaleState === 'done'
                ? 'brightness(1.06) contrast(1.04) saturate(1.12)'
                : 'none',
          }}
        />
        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#1a2123]/80 to-transparent" />

        {upscaleState === 'done' && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-[#a2dd00] px-2 py-0.5">
            <CheckCircle2 className="h-2.5 w-2.5 text-[#1a2123]" />
            <span className="text-[8px] font-black tracking-wide text-[#1a2123]">
              UPSCALE APLICADO
            </span>
          </div>
        )}
      </div>

      {/* Model cards 2×2 */}
      <div className="space-y-1.5">
        <p className="text-[9px] font-bold tracking-[0.15em] text-[#f3f0ed]/30">MODELO</p>
        <div className="grid grid-cols-2 gap-1.5">
          {MODELS.map((m) => {
            const active = model === m.value;
            return (
              <button
                key={m.value}
                onClick={() => { setModel(m.value); resetIfDone(); }}
                className="flex flex-col gap-1 rounded-xl p-2.5 text-left transition-all active:scale-[0.97]"
                style={{
                  background: active ? 'rgba(162,221,0,0.07)' : 'rgba(30,73,75,0.15)',
                  border: `1px solid ${active ? 'rgba(162,221,0,0.28)' : 'rgba(243,240,237,0.06)'}`,
                  boxShadow: active ? '0 0 0 1px rgba(162,221,0,0.06) inset' : 'none',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold leading-none ${active ? 'text-[#f3f0ed]/80' : 'text-[#f3f0ed]/45'}`}>
                    {m.name}
                  </span>
                  <span
                    className="rounded-md px-1 py-0.5 text-[8px] font-black leading-none"
                    style={{
                      background: active ? 'rgba(162,221,0,0.18)' : 'rgba(243,240,237,0.06)',
                      color: active ? '#a2dd00' : 'rgba(243,240,237,0.3)',
                    }}
                  >
                    {m.tag}
                  </span>
                </div>
                <span className={`text-[9px] leading-tight ${active ? 'text-[#f3f0ed]/40' : 'text-[#f3f0ed]/20'}`}>
                  {m.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scale pills */}
      <div className="space-y-1.5">
        <p className="text-[9px] font-bold tracking-[0.15em] text-[#f3f0ed]/30">FATOR DE ESCALA</p>
        <div className="flex gap-1.5">
          {['2×', '4×', '8×'].map((s) => {
            const active = scale === s;
            return (
              <button
                key={s}
                onClick={() => { setScale(s); resetIfDone(); }}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold transition-all active:scale-95"
                style={{
                  background: active ? 'rgba(162,221,0,0.1)' : 'rgba(30,73,75,0.15)',
                  color: active ? '#a2dd00' : 'rgba(243,240,237,0.3)',
                  border: `1px solid ${active ? 'rgba(162,221,0,0.28)' : 'rgba(243,240,237,0.06)'}`,
                  boxShadow: active ? '0 0 12px rgba(162,221,0,0.08)' : 'none',
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Apply button */}
      <button
        onClick={handleApply}
        disabled={upscaleState === 'upscaling'}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[11px] font-bold tracking-[0.08em] transition-all active:scale-[0.98] disabled:cursor-not-allowed"
        style={
          upscaleState === 'idle'
            ? {
              background: 'linear-gradient(135deg, #a2dd00 0%, #85b800 100%)',
              color: '#1a2123',
              boxShadow: '0 4px 16px rgba(162,221,0,0.22)',
            }
            : {
              background: 'rgba(162,221,0,0.07)',
              color: 'rgba(162,221,0,0.55)',
              border: '1px solid rgba(162,221,0,0.14)',
            }
        }
      >
        {upscaleState === 'upscaling' ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" />PROCESSANDO...</>
        ) : upscaleState === 'done' ? (
          <><CheckCircle2 className="h-3.5 w-3.5" />APLICAR NOVAMENTE</>
        ) : (
          <><Maximize2 className="h-3.5 w-3.5" />APLICAR UPSCALE</>
        )}
      </button>
    </div>
  );
}

// ─── FaceSwapSection ──────────────────────────────────────────────────────────

function FaceSwapSection({ generatedImage }: { generatedImage: string }) {
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFacePhoto(URL.createObjectURL(file));
  }

  return (
    <div className="mt-1 space-y-4">
      {/* Split panel */}
      <div className="grid grid-cols-2 gap-1.5">
        {/* Left — target image */}
        <div className="flex flex-col gap-2 rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/10 p-2.5">
          <span className="text-[9px] font-bold tracking-[0.1em] text-[#f3f0ed]/35">
            IMAGEM ALVO
          </span>
          <div className="overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={generatedImage}
              alt="Imagem alvo"
              className="h-auto w-full object-cover"
              draggable={false}
            />
          </div>
          <p className="text-[8px] leading-snug text-[#f3f0ed]/20">
            Rosto a ser substituído
          </p>
        </div>

        {/* Right — upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="group flex flex-col gap-2 rounded-xl border p-2.5 text-left transition-all"
          style={{
            background: facePhoto ? 'rgba(30,73,75,0.1)' : 'transparent',
            borderColor: facePhoto
              ? 'rgba(243,240,237,0.07)'
              : 'rgba(243,240,237,0.07)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(162,221,0,0.25)';
            e.currentTarget.style.background = 'rgba(162,221,0,0.03)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = facePhoto
              ? 'rgba(243,240,237,0.07)'
              : 'rgba(243,240,237,0.07)';
            e.currentTarget.style.background = facePhoto ? 'rgba(30,73,75,0.1)' : 'transparent';
          }}
        >
          <span className="text-[9px] font-bold tracking-[0.1em] text-[#f3f0ed]/35">
            SEU ROSTO
          </span>

          {facePhoto ? (
            <div className="overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={facePhoto}
                alt="Seu rosto"
                className="h-auto w-full object-cover"
                draggable={false}
              />
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#f3f0ed]/[0.1] py-5 transition-all group-hover:border-[#a2dd00]/25">
              <ScanFace className="h-5 w-5 text-[#f3f0ed]/15 transition-colors group-hover:text-[#a2dd00]/40" />
              <span className="text-center text-[8px] leading-snug text-[#f3f0ed]/20 transition-colors group-hover:text-[#f3f0ed]/35">
                Clique para enviar
              </span>
            </div>
          )}

          <p className="text-[8px] leading-snug text-[#f3f0ed]/20">
            Rosto a ser inserido
          </p>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Apply button */}
      <button
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[11px] font-bold tracking-[0.08em] transition-all active:scale-[0.98]"
        style={
          facePhoto
            ? {
              background: 'linear-gradient(135deg, #a2dd00 0%, #85b800 100%)',
              color: '#1a2123',
              boxShadow: '0 4px 16px rgba(162,221,0,0.22)',
            }
            : {
              background: 'rgba(162,221,0,0.07)',
              color: 'rgba(162,221,0,0.4)',
              border: '1px solid rgba(162,221,0,0.12)',
            }
        }
      >
        <ScanFace className="h-3.5 w-3.5" />
        APLICAR FACE SWAP
      </button>
    </div>
  );
}

// ─── RightSidebar ─────────────────────────────────────────────────────────────

export function RightSidebar() {
  const { selectedNodeId, setSelectedNodeId, nodeImages, nodeUpscaleStates, nodePanelTypes } = useEditor();
  const panelType = selectedNodeId ? nodePanelTypes[selectedNodeId] : null;
  const selectedImage = selectedNodeId ? nodeImages[selectedNodeId] : null;
  const upscaleDone = selectedNodeId
    ? (nodeUpscaleStates[selectedNodeId] ?? 'idle') === 'done'
    : false;

  // Influencer builder sidebar
  if (panelType === 'create-influencer') {
    return (
      <aside className="aside-in fixed inset-0 z-50 flex flex-col border-l border-[#f3f0ed]/[0.07] bg-[#1a2123] sm:static sm:h-full sm:w-96 sm:shrink-0">
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-[#f3f0ed]/[0.05] bg-gradient-to-b from-[#f3f0ed]/[0.02] to-transparent px-4 py-3.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#f3f0ed]/[0.05]">
            <User className="h-3.5 w-3.5 text-[#f3f0ed]/35" />
          </div>
          <h2 className="flex-1 text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/40">
            INFLUENCER BUILDER
          </h2>
          <button onClick={() => setSelectedNodeId(null)} className="flex h-6 w-6 items-center justify-center rounded-lg text-[#f3f0ed]/30 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/60 sm:hidden">
            <X className="h-4 w-4" />
          </button>
        </div>

        <InfluencerSidebar />
      </aside>
    );
  }

  // Generate image sidebar (only when image exists)
  if (!selectedImage) return null;

  return (
    <aside className="aside-in fixed inset-0 z-50 flex flex-col border-l border-[#f3f0ed]/[0.07] bg-[#1a2123] sm:static sm:h-full sm:w-72 sm:shrink-0">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-[#f3f0ed]/[0.05] bg-gradient-to-b from-[#f3f0ed]/[0.02] to-transparent px-4 py-3.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#f3f0ed]/[0.05]">
          <Settings2 className="h-3.5 w-3.5 text-[#f3f0ed]/35" />
        </div>
        <h2 className="flex-1 text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/40">
          CONFIGURAÇÕES
        </h2>
        <button onClick={() => setSelectedNodeId(null)} className="flex h-6 w-6 items-center justify-center rounded-lg text-[#f3f0ed]/30 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/60 sm:hidden">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="sidebar-scroll flex-1 overflow-y-auto">
        <Section title="UPSCALE" icon={Maximize2} done={upscaleDone}>
          <UpscaleSection generatedImage={selectedImage} nodeId={selectedNodeId!} />
        </Section>

        <Section title="FACE SWAP" icon={ScanFace}>
          <FaceSwapSection generatedImage={selectedImage} />
        </Section>
      </div>
    </aside>
  );
}
