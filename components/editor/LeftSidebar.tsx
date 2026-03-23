'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { GalleryDialog } from './GalleryDialog';
import { PromptsDialog } from './PromptsDialog';
import { TutorialDialog } from './TutorialDialog';
import { VideoEditorDialog } from './VideoEditorDialog';
import { Film, FolderOpen, GraduationCap, Type } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useEditor } from '@/lib/editor-context';

const navItems = [
  { id: 'gallery', icon: FolderOpen, label: 'Galeria' },
  // { id: 'videoEditor', icon: Film, label: 'Editor de Video' },
  { id: 'tutorial', icon: GraduationCap, label: 'Tutorial' },
  { id: 'prompts', icon: Type, label: 'Fábrica de Prompts' },
];

export function LeftSidebar() {
  const { galleryPickerRequest, setLeftPanelOpen } = useEditor();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [videoEditorOpen, setVideoEditorOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [promptsOpen, setPromptsOpen] = useState(false);

  const anyOpen = galleryOpen || videoEditorOpen || tutorialOpen || promptsOpen;
  useEffect(() => {
    setLeftPanelOpen(anyOpen);
  }, [anyOpen, setLeftPanelOpen]);

  useEffect(() => {
    if (galleryPickerRequest) {
      setGalleryOpen(true);
      setVideoEditorOpen(false);
      setTutorialOpen(false);
      setPromptsOpen(false);
    }
  }, [galleryPickerRequest]);

  function handleNavClick(id: string) {
    if (id === 'gallery') {
      setGalleryOpen((v) => !v);
      setVideoEditorOpen(false);
      setTutorialOpen(false);
      setPromptsOpen(false);
    }
    if (id === 'videoEditor') {
      setVideoEditorOpen((v) => !v);
      setGalleryOpen(false);
      setTutorialOpen(false);
      setPromptsOpen(false);
    }
    if (id === 'tutorial') {
      setTutorialOpen((v) => !v);
      setGalleryOpen(false);
      setVideoEditorOpen(false);
      setPromptsOpen(false);
    }
    if (id === 'prompts') {
      setPromptsOpen((v) => !v);
      setGalleryOpen(false);
      setVideoEditorOpen(false);
      setTutorialOpen(false);
    }
  }

  return (
    <>
      <aside className="flex shrink-0 items-center justify-center gap-1.5 bg-[#1a2123] z-50 flex-row w-full h-10 border-b border-[#f3f0ed]/[0.07] px-3 md:justify-start md:flex-col md:h-full md:w-12 md:border-b-0 md:border-r md:py-3 md:px-0">
        {navItems.map(({ id, icon: Icon, label }) => {
          const isActive = (id === 'gallery' && galleryOpen) || (id === 'videoEditor' && videoEditorOpen) || (id === 'tutorial' && tutorialOpen) || (id === 'prompts' && promptsOpen);
          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <button
                  id={id === 'tutorial' ? 'tour-tutorial-btn' : undefined}
                  onClick={() => handleNavClick(id)}
                  className={`flex h-8 items-center justify-center rounded-md transition-all gap-1.5 px-2 w-auto md:w-8 md:px-0 ${isActive
                    ? 'bg-[#a2dd00]/15 text-[#a2dd00]'
                    : 'text-[#f3f0ed]/30 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70'
                    }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-[10px] font-bold tracking-wide md:hidden">{label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={10}
                className="border border-[#f3f0ed]/8 bg-[#1a2123] px-2.5 py-1.5 text-[10px] font-bold tracking-widest text-[#f3f0ed]/90 shadow-2xl backdrop-blur-md"
              >
                {label.toUpperCase()}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Separator */}
        <div className="hidden md:block md:my-1 md:h-px md:w-6 md:bg-[#f3f0ed]/[0.07]" />
      </aside>
      <GalleryDialog open={galleryOpen} onOpenChange={setGalleryOpen} />
      <VideoEditorDialog open={videoEditorOpen} onOpenChange={setVideoEditorOpen} />
      <TutorialDialog open={tutorialOpen} onOpenChange={setTutorialOpen} />
      <PromptsDialog open={promptsOpen} onOpenChange={setPromptsOpen} />
    </>
  );
}
