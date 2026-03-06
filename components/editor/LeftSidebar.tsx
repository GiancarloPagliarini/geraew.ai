'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { GalleryDialog } from './GalleryDialog';
import { TutorialDialog } from './TutorialDialog';
import { FolderOpen, GraduationCap } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { id: 'gallery', icon: FolderOpen, label: 'Galeria' },
  { id: 'tutorial', icon: GraduationCap, label: 'Tutorial' },
];

export function LeftSidebar() {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  function handleNavClick(id: string) {
    if (id === 'gallery') setGalleryOpen(true);
    if (id === 'tutorial') setTutorialOpen(true);
  }

  return (
    <>
      <aside className="flex h-full w-12 shrink-0 flex-col items-center gap-1.5 border-r border-[#f3f0ed]/[0.07] bg-[#1a2123] py-3 z-50">
        {navItems.map(({ id, icon: Icon, label }) => {
          const isActive = (id === 'gallery' && galleryOpen) || (id === 'tutorial' && tutorialOpen);
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
      <TutorialDialog open={tutorialOpen} onOpenChange={setTutorialOpen} />
    </>
  );
}
