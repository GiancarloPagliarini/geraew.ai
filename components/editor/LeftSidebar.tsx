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
  { id: 'videoEditor', icon: Film, label: 'Editor de Video' },
  { id: 'tutorial', icon: GraduationCap, label: 'Tutorial' },
  { id: 'prompts', icon: Type, label: 'Fábrica de Prompts' },
];

export function LeftSidebar() {
  const { galleryPickerRequest } = useEditor();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [videoEditorOpen, setVideoEditorOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [promptsOpen, setPromptsOpen] = useState(false);

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
      <aside className="flex h-full w-12 shrink-0 flex-col items-center gap-1.5 border-r border-[#f3f0ed]/[0.07] bg-[#1a2123] py-3 z-50">
        {navItems.map(({ id, icon: Icon, label }) => {
          const isActive = (id === 'gallery' && galleryOpen) || (id === 'videoEditor' && videoEditorOpen) || (id === 'tutorial' && tutorialOpen) || (id === 'prompts' && promptsOpen);
          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <button
                  id={id === 'tutorial' ? 'tour-tutorial-btn' : undefined}
                  onClick={() => handleNavClick(id)}
                  className={`flex h-8 w-8 items-center justify-center rounded-md transition-all ${isActive
                    ? 'bg-[#a2dd00]/15 text-[#a2dd00]'
                    : 'text-[#f3f0ed]/30 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70'
                    }`}
                >
                  <Icon className="h-4 w-4" />
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
        <div className="my-1 h-px w-6 bg-[#f3f0ed]/[0.07]" />
      </aside>
      <GalleryDialog open={galleryOpen} onOpenChange={setGalleryOpen} />
      <VideoEditorDialog open={videoEditorOpen} onOpenChange={setVideoEditorOpen} />
      <TutorialDialog open={tutorialOpen} onOpenChange={setTutorialOpen} />
      <PromptsDialog open={promptsOpen} onOpenChange={setPromptsOpen} />
    </>
  );
}
