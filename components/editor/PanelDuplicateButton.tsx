'use client';

import { CopyPlus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface PanelDuplicateButtonProps {
  onClick?: () => void;
}

export function PanelDuplicateButton({ onClick }: PanelDuplicateButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className="flex h-6.5 w-6.5 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/8 hover:text-[#f3f0ed]/80"
        >
          <CopyPlus className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>Duplicar painel</TooltipContent>
    </Tooltip>
  );
}
