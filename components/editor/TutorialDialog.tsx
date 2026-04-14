'use client';

import { GraduationCap, ImageIcon, VideoIcon, UserRound, PlayCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

const tutorialMeta = [
  {
    id: 'image' as const,
    icon: ImageIcon,
    showVideo: true,
    videoUrl: 'https://cdn.geraew.com.br/storage/v1/object/public/ai-generations/utils/Design%20sem%20nome.mp4',
  },
  {
    id: 'video' as const,
    icon: VideoIcon,
    showVideo: true,
    videoUrl: 'https://cdn.geraew.com.br/storage/v1/object/public/ai-generations/utils/video_geracao.mp4',
  },
  {
    id: 'influencer' as const,
    icon: UserRound,
    showVideo: false,
    videoUrl: null,
  },
];

interface TutorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TutorialDialog({ open, onOpenChange }: TutorialDialogProps) {
  const t = useTranslations('editorDialogs.tutorial');
  const [selected, setSelected] = useState<string | null>(null);

  const selectedTutorial = tutorialMeta.find((tu) => tu.id === selected);
  const selectedSteps = selectedTutorial
    ? (t.raw(`items.${selectedTutorial.id}.steps`) as string[])
    : [];

  function handleBack() {
    setSelected(null);
  }

  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); }
    else if (mounted) {
      setClosing(true);
      const ti = setTimeout(() => { setMounted(false); setClosing(false); }, 200);
      return () => clearTimeout(ti);
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
            <GraduationCap className="h-3.5 w-3.5 text-[#a2dd00]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#f3f0ed]/60">{t('title')}</h2>
            <p className="text-xs text-[#f3f0ed]/30">{t('subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => { onOpenChange(false); setSelected(null); }}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[#f3f0ed]/30 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden px-4 py-3 gap-3">
        <div className="flex overflow-y-auto sidebar-scroll flex-1">
          {selected && selectedTutorial ? (
            <div className="flex flex-col gap-4">
              <button
                onClick={handleBack}
                className="self-start text-xs font-medium text-[#a2dd00] hover:text-[#a2dd00]/80 transition-colors"
              >
                {t('back')}
              </button>

              {/* Video */}
              {selectedTutorial.showVideo && (
                selectedTutorial.videoUrl ? (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black ring-1 ring-[#f3f0ed]/[0.07]">
                    <video
                      src={selectedTutorial.videoUrl}
                      controls
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#f3f0ed]/3 ring-1 ring-[#f3f0ed]/[0.07] flex flex-col items-center justify-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#a2dd00]/10 ring-1 ring-[#a2dd00]/20">
                      <PlayCircle className="h-7 w-7 text-[#a2dd00]" />
                    </div>
                    <p className="text-xs text-[#f3f0ed]/30 font-medium">{t('comingSoon')}</p>
                  </div>
                )
              )}

              {/* Info */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <selectedTutorial.icon className="h-4 w-4 text-[#a2dd00]" />
                  <h3 className="text-md font-semibold text-[#f3f0ed]">{t(`items.${selectedTutorial.id}.title`)}</h3>
                </div>
                <p className="text-sm text-[#f3f0ed]/50 leading-relaxed">{t(`items.${selectedTutorial.id}.description`)}</p>
              </div>

              {/* Steps */}
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-bold tracking-widest text-[#f3f0ed]/30 uppercase">{t('stepByStep')}</p>
                <ol className="flex flex-col gap-2">
                  {selectedSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex text-sm h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#a2dd00]/10 text-[10px] font-bold text-[#a2dd00]">
                        {i + 1}
                      </span>
                      <span className="text-sm text-[#f3f0ed]/60 leading-relaxed pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {tutorialMeta.map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setSelected(id)}
                  className="group flex items-start gap-4 rounded-xl bg-[#f3f0ed]/3 ring-[#f3f0ed]/6 hover:ring-[#a2dd00]/30 hover:bg-[#a2dd00]/4 p-4 text-left transition-all"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#a2dd00]/10 ring-1 ring-[#a2dd00]/20 group-hover:bg-[#a2dd00]/15 transition-colors">
                    <Icon className="h-5 w-5 text-[#a2dd00]" />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[#f3f0ed]">{t(`items.${id}.title`)}</span>
                    </div>
                    <span className="text-xs text-[#f3f0ed]/40 leading-relaxed">{t(`items.${id}.description`)}</span>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                    <PlayCircle className="h-5 w-5 text-[#f3f0ed]/20 group-hover:text-[#a2dd00]/60 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {!selected && (
          <div className="flex items-center justify-between border-t border-[#f3f0ed]/[0.07] pt-3">
            <span className="text-[10px] font-medium tracking-wider text-[#f3f0ed]/30 uppercase">
              {t('availableCount', { count: tutorialMeta.length })}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
