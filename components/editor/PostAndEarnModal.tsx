'use client';

import { useEffect } from 'react';
import { Gift, Sparkles, X, Clock } from 'lucide-react';

function IgIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

interface PostAndEarnModalProps {
  onClose: () => void;
}

export function PostAndEarnModal({ onClose }: PostAndEarnModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative mx-4 w-full max-w-sm rounded-2xl border border-[#f3f0ed]/8 bg-[#1a2123] p-6 shadow-2xl">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/[0.08] hover:text-[#f3f0ed]/80"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[#a2dd00]/10 ring-1 ring-[#a2dd00]/20">
            <Gift className="h-8 w-8 text-[#a2dd00]" />
            <Sparkles className="absolute -right-1.5 -top-1.5 h-4 w-4 text-[#a2dd00]/60" />
          </div>
        </div>

        {/* Heading */}
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[#a2dd00]" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#a2dd00]">
              Em breve
            </span>
          </div>
          <h2 className="mt-2 text-lg font-bold text-[#f3f0ed]">Poste e Ganhe</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#f3f0ed]/50">
            Estamos preparando uma campanha especial onde você vai ganhar créditos postando suas criações nas redes sociais.
          </p>
        </div>

        {/* Preview cards */}
        <div className="mt-5 flex flex-col gap-2">
          {[
            { label: 'Poste uma imagem gerada', network: 'Instagram / TikTok' },
            { label: 'Marque @geraew.ai', network: '@geraew.ai' },
            { label: 'Ganhe créditos', network: 'Em breve' },
          ].map(({ label, network }) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-xl bg-[#f3f0ed]/[0.03] px-4 py-3 ring-1 ring-[#f3f0ed]/[0.06]"
            >
              <div className="flex items-center gap-2.5">
                <IgIcon className="h-3.5 w-3.5 text-[#f3f0ed]/30" />
                <span className="text-xs text-[#f3f0ed]/60">{label}</span>
              </div>
              <span className="text-[10px] font-semibold text-[#a2dd00]/70">{network}</span>
            </div>
          ))}
        </div>

        {/* Instagram CTA */}
        <a
          href="https://www.instagram.com/geraew.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex items-center justify-center gap-2 w-full rounded-xl border border-[#f3f0ed]/10 bg-[#f3f0ed]/[0.03] py-2.5 text-sm font-semibold text-[#f3f0ed]/70 transition-all hover:border-[#a2dd00]/30 hover:text-[#f3f0ed] active:scale-95"
        >
          <IgIcon className="h-4 w-4" />
          Seguir @geraew.ai
        </a>

        {/* Footer */}
        <button
          onClick={onClose}
          className="mt-2 w-full rounded-xl bg-[#a2dd00] py-2.5 text-sm font-bold text-[#1a2123] transition-all hover:brightness-110 active:scale-95"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
