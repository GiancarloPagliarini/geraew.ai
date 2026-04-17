'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { GalleryDialog } from './GalleryDialog';
import { PromptsDialog } from './PromptsDialog';
import { TrendingProductsDialog } from './TrendingProductsDialog';
import { TutorialDialog } from './TutorialDialog';
import { VideoEditorDialog } from './VideoEditorDialog';
import { ImageToPromptDialog } from './ImageToPromptDialog';
import { ChevronDown, Flame, FolderOpen, GraduationCap, Image as ImageIcon, Menu, Star, Type, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useEditor } from '@/lib/editor-context';
import Image from 'next/image';

export function LeftSidebar() {
  const t = useTranslations('editorChrome.leftSidebar');
  const navItems: Array<{ id: string; icon: typeof FolderOpen; label: string; tooltip?: string; isNew?: boolean }> = [
    { id: 'gallery', icon: FolderOpen, label: t('gallery') },
    { id: 'tutorial', icon: GraduationCap, label: t('tutorial') },
    { id: 'prompts', icon: Type, label: t('prompts'), tooltip: t('promptsTooltip'), isNew: true },
    { id: 'trending', icon: Flame, label: t('trending'), tooltip: t('trendingTooltip'), isNew: true },
    { id: 'imageToPrompt', icon: ImageIcon, label: 'Clone', tooltip: 'Clone de prompt', isNew: true },
  ];
  const { galleryPickerRequest, setLeftPanelOpen } = useEditor();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [videoEditorOpen, setVideoEditorOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [promptsOpen, setPromptsOpen] = useState(false);
  const [trendingOpen, setTrendingOpen] = useState(false);
  const [imageToPromptOpen, setImageToPromptOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const CLOSE_DURATION = 250;
  const switchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openDialog = useCallback((id: string) => {
    setGalleryOpen(id === 'gallery');
    setVideoEditorOpen(id === 'videoEditor');
    setTutorialOpen(id === 'tutorial');
    setPromptsOpen(id === 'prompts');
    setTrendingOpen(id === 'trending');
    setImageToPromptOpen(id === 'imageToPrompt');
  }, []);

  const anyOpen = galleryOpen || videoEditorOpen || tutorialOpen || promptsOpen || trendingOpen || imageToPromptOpen;

  const activeItem = navItems.find(({ id }) =>
    (id === 'gallery' && galleryOpen) ||
    (id === 'tutorial' && tutorialOpen) ||
    (id === 'prompts' && promptsOpen) ||
    (id === 'trending' && trendingOpen) ||
    (id === 'imageToPrompt' && imageToPromptOpen)
  );

  useEffect(() => {
    setLeftPanelOpen(anyOpen);
    if (anyOpen) setMobileMenuOpen(false);
  }, [anyOpen, setLeftPanelOpen]);

  useEffect(() => {
    if (galleryPickerRequest) openDialog('gallery');
  }, [galleryPickerRequest, openDialog]);

  useEffect(() => () => { if (switchTimerRef.current) clearTimeout(switchTimerRef.current); }, []);

  // Close mobile menu on outside click
  useEffect(() => {
    if (!mobileMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (!mobileMenuRef.current?.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick, true);
    return () => document.removeEventListener('mousedown', handleClick, true);
  }, [mobileMenuOpen]);

  function handleNavClick(id: string) {
    if (switchTimerRef.current) clearTimeout(switchTimerRef.current);
    setMobileMenuOpen(false);

    const currentlyOpen =
      (id !== 'gallery' && galleryOpen) ||
      (id !== 'videoEditor' && videoEditorOpen) ||
      (id !== 'tutorial' && tutorialOpen) ||
      (id !== 'prompts' && promptsOpen) ||
      (id !== 'trending' && trendingOpen) ||
      (id !== 'imageToPrompt' && imageToPromptOpen);

    const isToggleOff =
      (id === 'gallery' && galleryOpen) ||
      (id === 'videoEditor' && videoEditorOpen) ||
      (id === 'tutorial' && tutorialOpen) ||
      (id === 'prompts' && promptsOpen) ||
      (id === 'trending' && trendingOpen) ||
      (id === 'imageToPrompt' && imageToPromptOpen);

    if (isToggleOff) {
      openDialog('none');
      return;
    }

    if (currentlyOpen) {
      openDialog('none');
      switchTimerRef.current = setTimeout(() => openDialog(id), CLOSE_DURATION);
    } else {
      openDialog(id);
    }
  }

  return (
    <>
      <aside className="shrink-0 bg-[#1a2123] border-b border-[#f3f0ed]/[0.07] md:border-b-0 md:border-r md:h-full md:w-[72px]">

        {/* ── Mobile: dropdown button ── */}
        <div ref={mobileMenuRef} className="relative md:hidden">
          <button
            onClick={() => {
              if (anyOpen) {
                openDialog('none');
              } else {
                setMobileMenuOpen((v) => !v);
              }
            }}
            className={`flex h-10 w-full items-center gap-2 px-3 transition-colors ${
              anyOpen || mobileMenuOpen
                ? 'text-[#a2dd00]'
                : 'text-[#f3f0ed]/50 hover:text-[#f3f0ed]/80'
            }`}
          >
            {activeItem ? (
              <>
                <activeItem.icon className="h-4 w-4 shrink-0" />
                <span className="text-xs font-semibold">{activeItem.label}</span>
              </>
            ) : (
              <>
                <Menu className="h-4 w-4 shrink-0" />
                <span className="text-xs font-semibold">{t('menuLabel')}</span>
              </>
            )}
            <ChevronDown
              className={`ml-auto h-3.5 w-3.5 transition-transform duration-200 ${anyOpen ? 'rotate-180' : mobileMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown */}
          {mobileMenuOpen && (
            <div className="absolute left-0 top-full z-[100] w-52 overflow-hidden rounded-b-xl border border-t-0 border-[#f3f0ed]/[0.08] bg-[#1a2123]/95 shadow-2xl backdrop-blur-md">
              {navItems.map(({ id, icon: Icon, label, isNew }) => {
                const isActive =
                  (id === 'gallery' && galleryOpen) ||
                  (id === 'tutorial' && tutorialOpen) ||
                  (id === 'prompts' && promptsOpen) ||
                  (id === 'trending' && trendingOpen) ||
                  (id === 'imageToPrompt' && imageToPromptOpen);
                return (
                  <button
                    key={id}
                    id={id === 'tutorial' ? 'tour-tutorial-btn' : undefined}
                    onClick={() => handleNavClick(id)}
                    className={`relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isActive
                        ? 'bg-[#a2dd00]/10 text-[#a2dd00]'
                        : 'text-[#f3f0ed]/60 hover:bg-[#f3f0ed]/[0.04] hover:text-[#f3f0ed]'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-semibold">{label}</span>
                    {isNew && (
                      <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 text-black">
                        <Star className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
              <div className="mx-3 my-1 h-px bg-[#f3f0ed]/[0.08]" />
              <button
                onClick={() => { setMobileMenuOpen(false); window.open('https://wa.me/5511943735978?text=Ol%C3%A1%21%20Preciso%20de%20ajuda%20com%20a%20Geraew.', '_blank'); }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-[#f3f0ed]/60 transition-colors hover:bg-[#f3f0ed]/[0.04] hover:text-[#f3f0ed]"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                <span className="text-xs font-semibold">Suporte</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Desktop: vertical sidebar ── */}
        <div className="hidden md:flex md:h-full md:flex-col md:items-stretch md:gap-1.5 md:py-3 md:px-1.5">
          {navItems.map(({ id, icon: Icon, label, tooltip, isNew }) => {
            const isActive =
              (id === 'gallery' && galleryOpen) ||
              (id === 'videoEditor' && videoEditorOpen) ||
              (id === 'tutorial' && tutorialOpen) ||
              (id === 'prompts' && promptsOpen) ||
              (id === 'trending' && trendingOpen) ||
              (id === 'imageToPrompt' && imageToPromptOpen);
            return (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <button
                    id={id === 'tutorial' ? 'tour-tutorial-btn' : undefined}
                    onClick={() => handleNavClick(id)}
                    className={`group relative flex w-full flex-col items-center gap-0.5 rounded-md py-1.5 px-1 transition-all ${
                      isActive
                        ? 'bg-[#a2dd00]/15 text-[#a2dd00]'
                        : 'text-[#f3f0ed]/30 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    <span className="text-[10px] font-bold tracking-wide text-center leading-tight">{label}</span>
                    {isNew && (
                      <div className="absolute group-hover:animate-pulse -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 text-black select-none">
                        <Star className="h-2.5 w-2.5" />
                      </div>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  sideOffset={10}
                  className="border border-[#f3f0ed]/8 bg-[#1a2123] px-2.5 py-1.5 text-[10px] font-bold tracking-widest text-[#f3f0ed]/90 shadow-2xl backdrop-blur-md"
                >
                  {(tooltip ?? label).toUpperCase()}
                </TooltipContent>
              </Tooltip>
            );
          })}

          <div className="my-1 h-px w-full bg-landing-text/[0.07]" />

          <div className="mt-auto flex items-center justify-center pb-1">
            <Image src="/logo_2.svg" alt={t('logoAlt')} width={28} height={28} className="opacity-30" />
          </div>
        </div>
      </aside>

      <GalleryDialog open={galleryOpen} onOpenChange={setGalleryOpen} />
      <VideoEditorDialog open={videoEditorOpen} onOpenChange={setVideoEditorOpen} />
      <TutorialDialog open={tutorialOpen} onOpenChange={setTutorialOpen} />
      <PromptsDialog open={promptsOpen} onOpenChange={setPromptsOpen} />
      <TrendingProductsDialog open={trendingOpen} onOpenChange={setTrendingOpen} />
      <ImageToPromptDialog open={imageToPromptOpen} onOpenChange={setImageToPromptOpen} />
    </>
  );
}
