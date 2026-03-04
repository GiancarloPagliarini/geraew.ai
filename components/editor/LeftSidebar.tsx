'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { GalleryDialog } from './GalleryDialog';
import { FolderOpen } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { id: 'gallery', icon: FolderOpen, label: 'Galeria' },
];

export function LeftSidebar() {
  const [galleryOpen, setGalleryOpen] = useState(false);

  function handleNavClick() {
    setGalleryOpen(true);
  }

  return (
    <>
      <aside className="flex h-full w-12 shrink-0 flex-col items-center gap-1.5 border-r border-[#f3f0ed]/[0.07] bg-[#1a2123] py-3 z-50">
        {navItems.map(({ id, icon: Icon, label }) => (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <button
                onClick={handleNavClick}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-all ${galleryOpen
                  ? 'bg-[#a2dd00]/15 text-[#a2dd00]'
                  : 'text-[#f3f0ed]/30 hover:bg-[#f3f0ed]/[0.05] hover:text-[#f3f0ed]/70'
                  }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={10}
              className="border border-[#f3f0ed]/[0.08] bg-[#1a2123] px-2.5 py-1.5 text-[10px] font-bold tracking-widest text-[#f3f0ed]/90 shadow-2xl backdrop-blur-md"
            >
              {label.toUpperCase()}
            </TooltipContent>
          </Tooltip>
        ))}

        {/* Separator */}
        <div className="my-1 h-px w-6 bg-[#f3f0ed]/[0.07]" />
      </aside>
      <GalleryDialog open={galleryOpen} onOpenChange={setGalleryOpen} />
    </>
  );
}
