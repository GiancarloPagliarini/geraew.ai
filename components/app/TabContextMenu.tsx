'use client';

import { useTranslations } from 'next-intl';
import { Copy, Pin, PinOff, X } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface TabContextMenuProps {
  children: React.ReactNode;
  pinned?: boolean;
  canClose: boolean;
  onDuplicate: () => void;
  onTogglePin: () => void;
  onClose: () => void;
}

const itemClass =
  'cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-app-text-2 focus:bg-app-surface focus:text-app-text [&_svg]:text-app-muted';

/**
 * Menu de contexto (clique-direito) das abas de geração — duplicar, fixar e
 * fechar. Compartilhado entre imagem, vídeo e áudio.
 */
export function TabContextMenu({
  children,
  pinned,
  canClose,
  onDuplicate,
  onTogglePin,
  onClose,
}: TabContextMenuProps) {
  const t = useTranslations('home');
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48 rounded-xl border-app-hairline-2 bg-app-card p-1.5 text-app-text shadow-[0_12px_30px_rgba(0,0,0,0.45)]">
        <ContextMenuItem className={itemClass} onSelect={onDuplicate}>
          <Copy className="size-4" strokeWidth={1.8} />
          {t('image.duplicateTab')}
        </ContextMenuItem>
        <ContextMenuItem className={itemClass} onSelect={onTogglePin}>
          {pinned ? (
            <PinOff className="size-4" strokeWidth={1.8} />
          ) : (
            <Pin className="size-4" strokeWidth={1.8} />
          )}
          {pinned ? t('image.unpinTab') : t('image.pinTab')}
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-app-hairline" />
        <ContextMenuItem
          disabled={!canClose}
          className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-red-400/70 focus:bg-app-surface focus:text-red-400/90"
          onSelect={onClose}
        >
          <X className="size-4 text-red-400/70" strokeWidth={1.8} />
          {t('image.closeTab')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
