'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Settings2, Wand2, X } from 'lucide-react';
import { PanelDuplicateButton } from './PanelDuplicateButton';
import { useState } from 'react';
import { useEditor } from '@/lib/editor-context';

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
  const [model, setModel] = useState('gpt-4o');
  const [temperature, setTemperature] = useState('0.7');
  const [maxTokens, setMaxTokens] = useState('1024');

  const [genState, setGenState] = useState<GenState>('idle');
  const [result, setResult] = useState('');

  function handleGenerate() {
    if (!prompt.trim()) return;

    consumeCredits(5);
    setGenState('generating');
    setResult('');

    // Simulated generation (mock)
    setTimeout(() => {
      setResult(
        'Este é um resultado simulado para o prompt fornecido. ' +
        'Em produção, este painel enviará o prompt para a API configurada e retornará o resultado real.'
      );
      setGenState('done');
    }, 2000);
  }

  function handleClear() {
    setGenState('idle');
    setResult('');
  }

  return (
    <div className="w-[340px] overflow-hidden rounded-2xl border border-[#f3f0ed]/[0.08] bg-[#1a2123] shadow-2xl shadow-black/50">
      {/* Header — drag handle */}
      <div className="panel-drag-handle flex cursor-grab items-center justify-between border-b border-[#f3f0ed]/[0.07] px-4 py-3 active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-[#a2dd00]" />
          <span className="text-xs font-bold tracking-[0.15em] text-[#f3f0ed]/90">
            PAINEL CUSTOMIZÁVEL
          </span>
        </div>
        <div className="flex items-center gap-1">
          <PanelDuplicateButton onClick={onDuplicate} />
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/8 hover:text-[#f3f0ed]/80"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Prompt */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
            PROMPT
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="Digite seu prompt aqui..."
            className="w-full resize-none rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 px-3 py-2.5 text-sm text-[#f3f0ed]/90 placeholder-[#f3f0ed]/25 outline-none transition-all focus:border-[#a2dd00]/40 focus:bg-[#1e494b]/30"
          />
        </div>

        {/* Configurations */}
        <div className="grid grid-cols-2 gap-3">
          {/* Model */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
              MODELO
            </label>
            <PanelSelect
              value={model}
              onValueChange={setModel}
              options={[
                { value: 'gpt-4o', label: 'GPT-4o' },
                { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
                { value: 'claude-sonnet', label: 'Claude Sonnet' },
                { value: 'claude-haiku', label: 'Claude Haiku' },
              ]}
            />
          </div>

          {/* Temperature */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
              TEMPERATURA
            </label>
            <PanelSelect
              value={temperature}
              onValueChange={setTemperature}
              options={[
                { value: '0', label: '0 - Preciso' },
                { value: '0.3', label: '0.3 - Baixa' },
                { value: '0.7', label: '0.7 - Balanceada' },
                { value: '1.0', label: '1.0 - Criativa' },
              ]}
            />
          </div>
        </div>

        {/* Max Tokens */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
            MÁXIMO DE TOKENS
          </label>
          <PanelSelect
            value={maxTokens}
            onValueChange={setMaxTokens}
            options={[
              { value: '256', label: '256 tokens' },
              { value: '512', label: '512 tokens' },
              { value: '1024', label: '1024 tokens' },
              { value: '2048', label: '2048 tokens' },
            ]}
          />
        </div>

        {/* Result area */}
        {genState === 'generating' && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-[#f3f0ed]/[0.06] bg-[#1e494b]/10 py-6">
            <Loader2 className="h-8 w-8 animate-spin text-[#a2dd00]" />
            <span className="text-[10px] font-bold tracking-[0.2em] text-[#f3f0ed]/30">
              PROCESSANDO...
            </span>
          </div>
        )}

        {genState === 'done' && result && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
                RESULTADO
              </label>
              <button
                onClick={handleClear}
                className="text-[10px] font-bold tracking-[0.1em] text-[#f3f0ed]/25 transition-colors hover:text-[#f3f0ed]/50"
              >
                LIMPAR
              </button>
            </div>
            <div className="max-h-[200px] overflow-y-auto rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 px-3 py-2.5 text-sm leading-relaxed text-[#f3f0ed]/80">
              {result}
            </div>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={genState === 'generating' || !prompt.trim()}
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
              PROCESSANDO...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" />
              {genState === 'done' ? 'EXECUTAR NOVAMENTE' : 'EXECUTAR'}
            </>
          )}
        </button>
      </div>
    </div>
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
