'use client';

import { CopyPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface PanelDuplicateButtonProps {
  onClick?: () => void;
  disabled?: boolean;
}

export function PanelDuplicateButton({ onClick, disabled }: PanelDuplicateButtonProps) {
  const t = useTranslations('editorChrome.buttons');
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          className="flex h-6.5 w-6.5 items-center justify-center rounded-full text-[#f3f0ed]/30 transition-all hover:bg-[#f3f0ed]/8 hover:text-[#f3f0ed]/80 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[#f3f0ed]/30"
        >
          <CopyPlus className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6}>{t('duplicatePanel')}</TooltipContent>
    </Tooltip>
  );
}
