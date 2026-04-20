'use client';

import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';

interface Props {
  hasMore: boolean;
  hasPrev: boolean;
  onNext: () => void;
  onPrev: () => void;
  onRefresh: () => void;
  loading: boolean;
  count: number;
}

export function StripePager({ hasMore, hasPrev, onNext, onPrev, onRefresh, loading, count }: Props) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-[#f3f0ed]/6 bg-[#f3f0ed]/2 px-3 py-2">
      <button
        onClick={onRefresh}
        disabled={loading}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#f3f0ed]/40 transition-colors hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 disabled:opacity-40"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      </button>
      <span className="text-xs text-[#f3f0ed]/40">{count} itens nesta página</span>
      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          disabled={!hasPrev || loading}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#f3f0ed]/40 transition-colors hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={onNext}
          disabled={!hasMore || loading}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#f3f0ed]/40 transition-colors hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
