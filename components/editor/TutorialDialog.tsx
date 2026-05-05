'use client';

import { ArrowLeft, ChevronRight, GraduationCap, ImageIcon, PersonStanding, PlayCircle, Shirt, Video, X, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useEditor } from '@/lib/editor-context';

interface TutorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TutorialId = 'image' | 'video' | 'influencer' | 'virtualTryOn';

const TUTORIAL_VIDEO_URLS: Record<TutorialId, string> = {
  image: 'https://cdn.geraew.com.br/storage/v1/object/public/ai-generations/admin_assets/misc/cb711735-fff4-4eb6-84dc-ddedf78353b9/imagem.mp4',
  video: 'https://cdn.geraew.com.br/storage/v1/object/public/ai-generations/admin_assets/misc/a16399a9-85f1-4ce1-932c-c648a7ec315b/video.mp4',
  influencer: 'https://cdn.geraew.com.br/storage/v1/object/public/ai-generations/admin_assets/misc/a2482c42-47e6-4ad2-a5e9-deddb9b0152f/influencer.mp4',
  virtualTryOn: 'https://cdn.geraew.com.br/storage/v1/object/public/ai-generations/admin_assets/misc/9dfe343d-4b16-4534-a888-c0ddd9c5b6e7/provador.mp4',
};

const TUTORIAL_ICONS: Record<TutorialId, LucideIcon> = {
  image: ImageIcon,
  video: Video,
  influencer: PersonStanding,
  virtualTryOn: Shirt,
};

const TUTORIAL_IDS: TutorialId[] = ['image', 'video', 'influencer', 'virtualTryOn'];

export function TutorialDialog({ open, onOpenChange }: TutorialDialogProps) {
  const t = useTranslations('editorDialogs.tutorial');
  const { studioMode } = useEditor();

  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [selected, setSelected] = useState<TutorialId | null>(null);

  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); }
    else if (mounted) {
      setClosing(true);
      const ti = setTimeout(() => { setMounted(false); setClosing(false); setSelected(null); }, 200);
      return () => clearTimeout(ti);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!mounted) return null;

  return (
    <aside className={`${closing ? 'aside-out-left' : 'aside-in-left'} fixed inset-0 z-50 flex flex-col border-r border-[#f3f0ed]/[0.07] ${studioMode ? 'bg-[#0d1011]' : 'bg-[#1a2123]'} text-[#f3f0ed] overflow-hidden sm:static sm:h-full sm:w-xl sm:shrink-0`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#f3f0ed]/[0.05] bg-gradient-to-b from-[#f3f0ed]/[0.02] to-transparent px-4 py-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#a2dd00]/10">
            <GraduationCap className="h-3.5 w-3.5 text-[#a2dd00]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[#f3f0ed]/60 truncate">{t('title')}</h2>
            <p className="text-xs text-[#f3f0ed]/30 truncate">{t('subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#f3f0ed]/30 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {selected === null ? (
        <TutorialList
          onSelect={setSelected}
          countLabel={t('availableCount', { count: TUTORIAL_IDS.length })}
          t={t}
        />
      ) : (
        <TutorialDetail
          id={selected}
          onBack={() => setSelected(null)}
          t={t}
        />
      )}
    </aside>
  );
}

type TutorialT = ReturnType<typeof useTranslations>;

function TutorialList({ onSelect, countLabel, t }: {
  onSelect: (id: TutorialId) => void;
  countLabel: string;
  t: TutorialT;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <ul className="flex flex-col gap-2">
          {TUTORIAL_IDS.map((id) => {
            const Icon = TUTORIAL_ICONS[id];
            const hasVideo = Boolean(TUTORIAL_VIDEO_URLS[id]);
            return (
              <li key={id}>
                <button
                  onClick={() => onSelect(id)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-[#f3f0ed]/[0.06] bg-[#f3f0ed]/[0.02] px-3 py-3 text-left transition-all hover:border-[#a2dd00]/30 hover:bg-[#a2dd00]/[0.04]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#a2dd00]/10 ring-1 ring-[#a2dd00]/20 group-hover:bg-[#a2dd00]/15">
                    <Icon className="h-4.5 w-4.5 text-[#a2dd00]" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[#f3f0ed] truncate">
                        {t(`items.${id}.title`)}
                      </h3>
                      {!hasVideo && (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-[#f3f0ed]/[0.06] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-[#f3f0ed]/40">
                          {t('comingSoon')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#f3f0ed]/50 line-clamp-2">
                      {t(`items.${id}.description`)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#f3f0ed]/30 transition-colors group-hover:text-[#a2dd00]" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="border-t border-[#f3f0ed]/[0.05] px-4 py-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-[#f3f0ed]/30">
          {countLabel}
        </p>
      </div>
    </div>
  );
}

function TutorialDetail({ id, onBack, t }: {
  id: TutorialId;
  onBack: () => void;
  t: TutorialT;
}) {
  const Icon = TUTORIAL_ICONS[id];
  const videoUrl = TUTORIAL_VIDEO_URLS[id];
  const steps = t.raw(`items.${id}.steps`) as string[];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-[#f3f0ed]/[0.05] bg-gradient-to-b from-[#f3f0ed]/[0.015] to-transparent px-4 py-2.5">
        <button
          onClick={onBack}
          className="group inline-flex items-center gap-1.5 rounded-lg border border-[#f3f0ed]/[0.06] bg-[#f3f0ed]/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-[#f3f0ed]/60 transition-all hover:border-[#a2dd00]/25 hover:bg-[#a2dd00]/[0.06] hover:text-[#a2dd00]"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          {t('back')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          {/* Hero */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#a2dd00]/10 ring-1 ring-[#a2dd00]/20">
              <Icon className="h-4 w-4 text-[#a2dd00]" />
            </div>
            <div className="flex min-w-0 flex-col">
              <h3 className="text-sm font-semibold leading-tight text-[#f3f0ed]">
                {t(`items.${id}.title`)}
              </h3>
              <p className="text-[11px] leading-snug text-[#f3f0ed]/45">
                {t(`items.${id}.description`)}
              </p>
            </div>
          </div>

          {/* Video */}
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-[#f3f0ed]/[0.06]">
            {videoUrl ? (
              <video
                key={videoUrl}
                src={videoUrl}
                controls
                playsInline
                preload="metadata"
                className="h-full w-full"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#f3f0ed]/[0.02] text-[#f3f0ed]/40">
                <PlayCircle className="h-10 w-10" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  {t('comingSoon')}
                </span>
              </div>
            )}
          </div>

          {/* Steps */}
          <div className="flex flex-col gap-2">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#f3f0ed]/40">
              {t('stepByStep')}
            </h4>
            <ol className="flex flex-col gap-2">
              {steps.map((step, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-[#f3f0ed]/[0.05] bg-[#f3f0ed]/[0.02] px-3 py-2.5"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#a2dd00]/15 text-[10px] font-bold text-[#a2dd00]">
                    {i + 1}
                  </span>
                  <span className="text-xs leading-relaxed text-[#f3f0ed]/80">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
