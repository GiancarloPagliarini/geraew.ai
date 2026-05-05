'use client';

import { Type, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useEditor } from '@/lib/editor-context';
import { PanelDuplicateButton } from './PanelDuplicateButton';
import { StudioTextOutputHandle } from './studio/StudioHandles';

interface PromptSourcePanelProps {
  nodeId: string;
  onClose?: () => void;
  onDuplicate?: () => void;
}

export function PromptSourcePanel({ nodeId, onClose, onDuplicate }: PromptSourcePanelProps) {
  const { setNodeText } = useEditor();
  const storageKey = `geraew-panel-prompt-source-${nodeId}`;
  const [stored] = useState(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [text, setText] = useState<string>(stored?.text ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Publish text into editor context (debounced) so connected panels can read it
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setNodeText(nodeId, text);
      try { localStorage.setItem(storageKey, JSON.stringify({ text })); } catch { /* ignore */ }
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [text, nodeId, setNodeText, storageKey]);

  // First mount — make sure context has the stored value
  useEffect(() => {
    if (text) setNodeText(nodeId, text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative">
      <StudioTextOutputHandle />
      <div className="group/studio max-w-[calc(100vw-5rem)] overflow-hidden rounded-2xl bg-[#161a1c] shadow-2xl shadow-black/50" style={{ width: 280 }}>
        <div className="panel-drag-handle flex cursor-grab items-center justify-between px-3 py-2.5 active:cursor-grabbing">
          <div className="flex items-center gap-1.5">
            <Type className="h-3.5 w-3.5 text-[#f3f0ed]/40" />
            <span className="text-[11px] font-medium text-[#f3f0ed]/60">Input Text</span>
          </div>
          <div className="flex items-center gap-1">
            <PanelDuplicateButton onClick={onDuplicate} />
            <button
              onClick={() => { try { localStorage.removeItem(storageKey); } catch { /* ignore */ } onClose?.(); }}
              className="flex h-5 w-5 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/8 hover:text-[#f3f0ed]/80"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="px-3 pb-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva um prompt para enviar a outros painéis..."
            rows={5}
            className="min-h-[100px] w-full resize-none rounded-xl bg-[#0d1011] px-3 py-2.5 text-[12px] text-[#f3f0ed]/85 placeholder-[#f3f0ed]/30 outline-none"
          />
        </div>
      </div>
    </div>
  );
}
