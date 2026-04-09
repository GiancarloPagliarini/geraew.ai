'use client';

import { Flame, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TrendingProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrendingProductsDialog({ open, onOpenChange }: TrendingProductsDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); }
    else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => { setMounted(false); setClosing(false); }, 200);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!mounted) return null;

  return (
    <aside className={`${closing ? 'aside-out-left' : 'aside-in-left'} fixed inset-0 z-50 flex flex-col border-r border-[#f3f0ed]/[0.07] bg-[#1a2123] text-[#f3f0ed] overflow-hidden sm:static sm:h-full sm:w-xl sm:shrink-0`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#f3f0ed]/[0.05] bg-gradient-to-b from-[#f3f0ed]/[0.02] to-transparent px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#a2dd00]/10">
            <Flame className="h-3.5 w-3.5 text-[#a2dd00]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#f3f0ed]/60">Trending TikTok Shop</h2>
            <p className="text-xs text-[#f3f0ed]/30">Produtos que mais vendem agora</p>
          </div>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[#f3f0ed]/30 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden px-4 py-3 gap-3">
        <div className="flex items-center justify-center flex-1">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#a2dd00]/10">
              <Flame className="h-6 w-6 text-[#a2dd00]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#f3f0ed]/70">Em breve</p>
              <p className="text-xs text-[#f3f0ed]/30 mt-1">Os produtos mais vendidos do TikTok Shop<br />vão aparecer aqui em tempo real.</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
