'use client';

import { useEffect } from 'react';
import { Gift, Sparkles, X, Image, Video, ArrowRight, CheckCircle2 } from 'lucide-react';

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
      <div className="relative mx-4 flex w-full max-w-lg max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-[#f3f0ed]/8 bg-[#1a2123] shadow-2xl">

        {/* Top gradient banner + icon */}
        <div className="relative shrink-0 pb-8">
          <div className="h-20 bg-gradient-to-br from-[#a2dd00]/20 via-[#a2dd00]/5 to-transparent">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#a2dd00]/[0.07] blur-2xl" />
            <div className="absolute -left-4 top-8 h-20 w-20 rounded-full bg-[#a2dd00]/[0.05] blur-xl" />
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/20 text-[#f3f0ed]/50 backdrop-blur-sm transition-all hover:bg-black/40 hover:text-[#f3f0ed]/90"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Floating icon */}
          <div className="absolute inset-x-0 bottom-0 flex justify-center">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1a2123] ring-4 ring-[#1a2123] shadow-lg">
              <div className="flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-[#a2dd00] to-[#7ab800]">
                <Gift className="h-6 w-6 text-[#1a2123]" />
              </div>
              <Sparkles className="absolute -right-2 -top-2 h-4 w-4 text-[#a2dd00] drop-shadow-[0_0_6px_rgba(162,221,0,0.5)]" />
            </div>
          </div>
        </div>

        <div className="sidebar-scroll flex-1 overflow-y-auto px-6 pb-6 pt-9">
          {/* Heading */}
          <div className="text-center">
            <h2 className="text-xl font-bold text-[#f3f0ed]">Poste e Ganhe</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[#f3f0ed]/50">
              Compartilhe suas criações em <span className="font-semibold text-[#a2dd00]">collab</span> com <span className="font-semibold text-[#a2dd00]">@geraew.ai</span> e dobre suas gerações!
            </p>
          </div>

          {/* Reward cards */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            {/* Image reward */}
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#f3f0ed]/[0.05] to-[#f3f0ed]/[0.02] p-4 ring-1 ring-[#f3f0ed]/[0.08] transition-all hover:ring-[#a2dd00]/25">
              <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[#a2dd00]/[0.04] blur-xl transition-all group-hover:bg-[#a2dd00]/[0.08]" />
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#a2dd00]/10 ring-1 ring-[#a2dd00]/20">
                  <Image className="h-5 w-5 text-[#a2dd00]" />
                </div>
                <p className="mt-3 text-sm font-semibold text-[#f3f0ed]/90">Poste uma imagem</p>
                <p className="mt-0.5 text-[11px] text-[#f3f0ed]/35">Em collab com @geraew.ai</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-[#a2dd00]">+2</span>
                  <span className="text-[10px] font-semibold text-[#a2dd00]/50">gerações</span>
                </div>
                <span className="mt-0.5 inline-block text-[10px] text-[#f3f0ed]/30">de imagem</span>
              </div>
            </div>

            {/* Video reward */}
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#f3f0ed]/[0.05] to-[#f3f0ed]/[0.02] p-4 ring-1 ring-[#f3f0ed]/[0.08] transition-all hover:ring-[#a2dd00]/25">
              <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[#a2dd00]/[0.04] blur-xl transition-all group-hover:bg-[#a2dd00]/[0.08]" />
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#a2dd00]/10 ring-1 ring-[#a2dd00]/20">
                  <Video className="h-5 w-5 text-[#a2dd00]" />
                </div>
                <p className="mt-3 text-sm font-semibold text-[#f3f0ed]/90">Poste um vídeo</p>
                <p className="mt-0.5 text-[11px] text-[#f3f0ed]/35">Em collab com @geraew.ai</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-[#a2dd00]">+2</span>
                  <span className="text-[10px] font-semibold text-[#a2dd00]/50">gerações</span>
                </div>
                <span className="mt-0.5 inline-block text-[10px] text-[#f3f0ed]/30">de vídeo</span>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="mt-5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#f3f0ed]/25">Como funciona</span>
            <div className="mt-2.5 flex flex-col gap-2">
              {[
                { step: '1', text: 'Crie sua imagem ou vídeo na geraew.ai' },
                { step: '2', text: 'Poste em collab com @geraew.ai no Instagram' },
                { step: '3', text: 'Envie seu e-mail de cadastro na DM do nosso Instagram' },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-center gap-3 rounded-xl bg-[#f3f0ed]/[0.02] px-3.5 py-2.5 ring-1 ring-[#f3f0ed]/[0.05]">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#a2dd00]/15 text-[11px] font-bold text-[#a2dd00]">
                    {step}
                  </div>
                  <span className="text-xs text-[#f3f0ed]/60">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Receive confirmation */}
          <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-[#a2dd00]/[0.06] px-4 py-3 ring-1 ring-[#a2dd00]/15">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#a2dd00]/70" />
            <p className="text-[11px] leading-relaxed text-[#f3f0ed]/50">
              Seus créditos serão adicionados após a verificação do post.
            </p>
          </div>

          {/* Buttons */}
          <div className="mt-5 flex flex-col gap-2">
            <a
              href="https://www.instagram.com/geraew.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-[#a2dd00] to-[#8bc700] py-3 text-sm font-bold text-[#1a2123] shadow-lg shadow-[#a2dd00]/15 transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <IgIcon className="h-4.5 w-4.5" />
              Seguir @geraew.ai
              <ArrowRight className="h-4 w-4" />
            </a>
            <button
              onClick={onClose}
              className="w-full rounded-xl border border-[#f3f0ed]/[0.08] bg-[#f3f0ed]/[0.03] py-2.5 text-sm font-semibold text-[#f3f0ed]/60 transition-all hover:border-[#f3f0ed]/15 hover:text-[#f3f0ed]/80 active:scale-[0.98]"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
