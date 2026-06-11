'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CopyPromptButtonProps {
  prompt: string;
  className?: string;
  withLabel?: boolean;
}

/** Botão de copiar prompt com feedback "Copiado!" (1,5s). */
export function CopyPromptButton({ prompt, className, withLabel = false }: CopyPromptButtonProps) {
  const t = useTranslations('home');
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={t('library.copy')}
      title={t('library.copy')}
      className={cn(
        'flex shrink-0 items-center justify-center gap-2 text-app-muted transition-colors duration-200 ease-app hover:text-app-text',
        className,
      )}
    >
      {copied ? (
        <Check className="size-[15px] text-app-lime" strokeWidth={2} />
      ) : (
        <Copy className="size-[15px]" strokeWidth={1.8} />
      )}
      {withLabel && (copied ? t('library.copied') : t('library.copy'))}
    </button>
  );
}
