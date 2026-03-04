'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronRight,
  ImagePlus,
  Info,
  Loader2,
  Sparkles,
  Video,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useEditor } from '@/lib/editor-context';

// ─── types ────────────────────────────────────────────────────────────────────

type GenState = 'idle' | 'generating' | 'done';

// SVG circle metrics
const RADIUS = 36;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const MOCK_IMAGE = '/mulher_escrevendo_carta.png';

// ─── component ────────────────────────────────────────────────────────────────

interface GenerateVideoPanelProps {
  nodeId: string;
  onClose?: () => void;
}

export function GenerateVideoPanel({ nodeId, onClose }: GenerateVideoPanelProps) {
  const { setNodeImage, consumeCredits } = useEditor();

  const [prompt, setPrompt] = useState('');
  const [enhance, setEnhance] = useState(true);
  const [audio, setAudio] = useState(true);
  const [model, setModel] = useState('kling-2.6');
  const [duration, setDuration] = useState('5s');
  const [proportion, setProportion] = useState('16-9');

  const [genState, setGenState] = useState<GenState>('idle');
  const [progress, setProgress] = useState(0);
  const [imageVisible, setImageVisible] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function handleGenerate() {
    consumeCredits(10);
    setGenState('generating');
    setProgress(0);
    setImageVisible(false);
    clearTimer();

    let current = 0;
    intervalRef.current = setInterval(() => {
      const remaining = 94 - current;
      const step = Math.max(1, Math.random() * (remaining * 0.12 + 1));
      current = Math.min(94, current + step);
      setProgress(Math.round(current));

      if (current >= 94) {
        clearTimer();
        setTimeout(() => {
          setProgress(100);
          setTimeout(() => {
            setGenState('done');
            setNodeImage(nodeId, MOCK_IMAGE);
            setTimeout(() => setImageVisible(true), 60);
          }, 380);
        }, 600);
      }
    }, 180);
  }

  function handleDiscard() {
    setGenState('idle');
    setProgress(0);
    setImageVisible(false);
  }

  useEffect(() => () => clearTimer(), []);

  const dashOffset = CIRCUMFERENCE * (1 - progress / 100);

  return (
    <div className="w-[320px] overflow-hidden rounded-2xl border border-[#f3f0ed]/[0.08] bg-[#1a2123] shadow-2xl shadow-black/50">
      {/* Header — drag handle */}
      <div className="panel-drag-handle flex cursor-grab items-center justify-between border-b border-[#f3f0ed]/[0.07] px-4 py-3 active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-[#a2dd00]" />
          <span className="text-xs font-bold tracking-[0.15em] text-[#f3f0ed]/90">
            GERAR VÍDEO
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/[0.08] hover:text-[#f3f0ed]/80"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-4 p-4">
        {/* ── Upload area (optional) ────────────────────────────────── */}
        <div className="relative">
          <span className="absolute right-2.5 top-2.5 rounded-md bg-[#f3f0ed]/[0.06] px-2 py-0.5 text-[8px] font-bold tracking-wider text-[#f3f0ed]/25">
            Opcional
          </span>
          <button className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-[#f3f0ed]/10 bg-[#1e494b]/10 px-4 py-6 transition-all hover:border-[#a2dd00]/30 hover:bg-[#1e494b]/20">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3f0ed]/[0.05]">
              <ImagePlus className="h-5 w-5 text-[#f3f0ed]/25" />
            </div>
            <div className="text-center">
              <p className="text-[11px] text-[#f3f0ed]/50">
                Envie uma imagem ou <span className="font-bold text-[#f3f0ed]/80">gere com IA</span>
              </p>
              <p className="mt-0.5 text-[9px] text-[#f3f0ed]/20">
                PNG, JPG ou Cole da área de transferência
              </p>
            </div>
          </button>
        </div>

        {/* ── Prompt ────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
            PROMPT
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Descreva a cena que você imagina, com detalhes."
            className="w-full resize-none rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 px-3 py-2.5 text-sm text-[#f3f0ed]/90 placeholder-[#f3f0ed]/25 outline-none transition-all focus:border-[#a2dd00]/40 focus:bg-[#1e494b]/30"
          />

          {/* Enhance toggle */}
          <button
            onClick={() => setEnhance(!enhance)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition-all"
            style={{
              background: enhance ? 'rgba(162,221,0,0.08)' : 'transparent',
            }}
          >
            <Sparkles className={`h-3 w-3 ${enhance ? 'text-[#a2dd00]' : 'text-[#f3f0ed]/25'}`} />
            <span className={`text-[10px] font-semibold ${enhance ? 'text-[#a2dd00]' : 'text-[#f3f0ed]/30'}`}>
              Enhance {enhance ? 'on' : 'off'}
            </span>
          </button>
        </div>

        {/* ── Generation area ───────────────────────────────────────── */}
        {genState === 'generating' && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-[#f3f0ed]/[0.06] bg-[#1e494b]/10 py-8">
            <div className="relative flex items-center justify-center">
              <svg width="90" height="90" viewBox="0 0 90 90" className="-rotate-90">
                <circle
                  cx="45" cy="45" r={RADIUS}
                  fill="none"
                  stroke="#f3f0ed"
                  strokeOpacity={0.07}
                  strokeWidth="4"
                />
                <circle
                  cx="45" cy="45" r={RADIUS}
                  fill="none"
                  stroke="#a2dd00"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  style={{ transition: 'stroke-dashoffset 0.18s ease-out' }}
                />
              </svg>
              <span className="absolute text-sm font-bold text-[#f3f0ed]/80">
                {progress}%
              </span>
            </div>
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#f3f0ed]/30">
              CRIANDO VÍDEO...
            </span>
          </div>
        )}

        {/* ── Generated preview ─────────────────────────────────────── */}
        {genState === 'done' && (
          <div
            className="group relative overflow-hidden rounded-xl border border-[#f3f0ed]/[0.08]"
            style={{
              opacity: imageVisible ? 1 : 0,
              transform: imageVisible ? 'scale(1)' : 'scale(0.96)',
              transition: 'opacity 0.4s ease, transform 0.4s ease',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={MOCK_IMAGE}
              alt="Vídeo gerado"
              className="h-auto w-full object-cover"
              draggable={false}
            />
            {/* Play icon overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1a2123]/70 backdrop-blur-sm">
                <Video className="h-5 w-5 text-[#a2dd00]" />
              </div>
            </div>
            {/* Hover actions */}
            <div className="absolute inset-0 flex items-start justify-end gap-1.5 bg-gradient-to-b from-black/50 via-transparent to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <button
                onClick={handleDiscard}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a2123]/80 text-[#f3f0ed]/70 backdrop-blur-sm transition-all hover:bg-[#1e494b] hover:text-[#a2dd00]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── Audio toggle ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/10 px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-[#f3f0ed]/60">Áudio</span>
            <Info className="h-3 w-3 text-[#f3f0ed]/20" />
          </div>
          <ToggleSwitch checked={audio} onChange={setAudio} />
        </div>

        {/* ── Model selector ────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
            MODELO
          </label>
          <PanelSelect
            value={model}
            onValueChange={setModel}
            options={[
              { value: 'kling-2.6', label: 'Kling 2.6' },
              { value: 'kling-2.0', label: 'Kling 2.0' },
              { value: 'runway-gen3', label: 'Runway Gen-3' },
              { value: 'pika-2.0', label: 'Pika 2.0' },
            ]}
          />
        </div>

        {/* ── Duration + Proportion ─────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Duration */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
              DURAÇÃO
            </label>
            <div className="flex gap-1.5">
              {['5s', '10s'].map((d) => {
                const active = duration === d;
                return (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className="flex-1 rounded-xl py-2 text-[11px] font-bold transition-all active:scale-95"
                    style={{
                      background: active ? 'rgba(162,221,0,0.1)' : 'rgba(30,73,75,0.15)',
                      color: active ? '#a2dd00' : 'rgba(243,240,237,0.3)',
                      border: `1px solid ${active ? 'rgba(162,221,0,0.28)' : 'rgba(243,240,237,0.06)'}`,
                      boxShadow: active ? '0 0 12px rgba(162,221,0,0.08)' : 'none',
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Proportion */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
              PROPORÇÃO
            </label>
            <div className="flex gap-1.5">
              {['16:9', '9:16', '1:1'].map((p) => {
                const val = p.replace(':', '-');
                const active = proportion === val;
                return (
                  <button
                    key={p}
                    onClick={() => setProportion(val)}
                    className="flex-1 rounded-xl py-2 text-[11px] font-bold transition-all active:scale-95"
                    style={{
                      background: active ? 'rgba(162,221,0,0.1)' : 'rgba(30,73,75,0.15)',
                      color: active ? '#a2dd00' : 'rgba(243,240,237,0.3)',
                      border: `1px solid ${active ? 'rgba(162,221,0,0.28)' : 'rgba(243,240,237,0.06)'}`,
                      boxShadow: active ? '0 0 12px rgba(162,221,0,0.08)' : 'none',
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Generate button ───────────────────────────────────────── */}
        <button
          onClick={handleGenerate}
          disabled={genState === 'generating'}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: genState === 'generating' ? 'rgba(162,221,0,0.12)' : '#a2dd00',
            color: genState === 'generating' ? '#a2dd00' : '#1a2123',
            border: genState === 'generating' ? '1px solid rgba(162,221,0,0.2)' : 'none',
          }}
        >
          {genState === 'generating' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              GERANDO...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {genState === 'done' ? 'GERAR NOVAMENTE' : 'GERAR'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative h-5 w-9 rounded-full transition-colors"
      style={{
        background: checked ? '#a2dd00' : 'rgba(243,240,237,0.12)',
      }}
    >
      <div
        className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform"
        style={{
          transform: checked ? 'translateX(17px)' : 'translateX(2px)',
        }}
      />
    </button>
  );
}

// ─── Select helper ────────────────────────────────────────────────────────────

function PanelSelect({
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
      <SelectTrigger className="h-9 w-full rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 px-3 text-xs text-[#f3f0ed]/80 outline-none transition-all focus:border-[#a2dd00]/40 focus:ring-0 data-[placeholder]:text-[#f3f0ed]/35 [&>svg]:text-[#f3f0ed]/30">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-xl border border-[#f3f0ed]/[0.08] bg-[#1a2123] p-1 shadow-2xl shadow-black/60 backdrop-blur-md">
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
