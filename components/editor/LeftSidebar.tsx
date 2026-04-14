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
import { Flame, FolderOpen, GraduationCap, Image as ImageIcon, Star, Type } from 'lucide-react';
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
    { id: 'imageToPrompt', icon: ImageIcon, label: 'Print', tooltip: 'Prompt do print', isNew: true },
  ];
  const { galleryPickerRequest, setLeftPanelOpen } = useEditor();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [videoEditorOpen, setVideoEditorOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [promptsOpen, setPromptsOpen] = useState(false);
  const [trendingOpen, setTrendingOpen] = useState(false);
  const [imageToPromptOpen, setImageToPromptOpen] = useState(false);

  const CLOSE_DURATION = 250; // slightly above the 250ms aside-out-left animation to avoid overlap
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
  useEffect(() => {
    setLeftPanelOpen(anyOpen);
  }, [anyOpen, setLeftPanelOpen]);

  useEffect(() => {
    if (galleryPickerRequest) openDialog('gallery');
  }, [galleryPickerRequest, openDialog]);

  useEffect(() => () => { if (switchTimerRef.current) clearTimeout(switchTimerRef.current); }, []);

  function handleNavClick(id: string) {
    if (switchTimerRef.current) clearTimeout(switchTimerRef.current);

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
      // Just close the current one
      openDialog('none');
      return;
    }

    if (currentlyOpen) {
      // Close current first, then open new after animation completes
      openDialog('none');
      switchTimerRef.current = setTimeout(() => openDialog(id), CLOSE_DURATION);
    } else {
      openDialog(id);
    }
  }

  return (
    <>
      <aside className="flex shrink-0 items-center justify-center gap-1.5 bg-[#1a2123] z-50 flex-row w-full h-10 border-b border-[#f3f0ed]/[0.07] px-3 md:justify-start md:flex-col md:h-full md:w-[72px] md:border-b-0 md:border-r md:py-3 md:px-1.5 md:items-stretch">
        {navItems.map(({ id, icon: Icon, label, tooltip, isNew }) => {
          const isActive = (id === 'gallery' && galleryOpen) || (id === 'videoEditor' && videoEditorOpen) || (id === 'tutorial' && tutorialOpen) || (id === 'prompts' && promptsOpen) || (id === 'trending' && trendingOpen) || (id === 'imageToPrompt' && imageToPromptOpen);
          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <button
                  id={id === 'tutorial' ? 'tour-tutorial-btn' : undefined}
                  onClick={() => handleNavClick(id)}
                  className={`group relative flex h-8 items-center justify-center rounded-md transition-all gap-1.5 px-2 w-auto md:w-full md:flex-col md:h-auto md:py-1.5 md:gap-0.5 md:px-1 ${isActive
                    ? 'bg-[#a2dd00]/15 text-[#a2dd00]'
                    : 'text-[#f3f0ed]/30 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70'
                    }`}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span className="text-[10px] font-bold tracking-wide md:text-center md:leading-tight">{label}</span>
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

        {/* Separator */}
        <div className="hidden md:block md:my-1 md:h-px md:w-full md:bg-landing-text/[0.07]" />

        {/* Logo */}
        <div className="hidden md:flex md:mt-auto md:items-center md:justify-center md:pb-1">
          <Image src="/logo_2.svg" alt={t('logoAlt')} width={28} height={28} className="opacity-30" />
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
