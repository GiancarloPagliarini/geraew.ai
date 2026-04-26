'use client';

import { useEffect, useState } from 'react';
import { ANNOUNCEMENTS, type AnnouncementAction } from '@/lib/announcements';
import { AnnouncementModal } from './AnnouncementModal';
import { useEditor } from '@/lib/editor-context';

const STORAGE_PREFIX = 'geraew-announcement-';

function isSeen(id: string): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(STORAGE_PREFIX + id) === '1';
}

function markSeen(id: string): void {
  localStorage.setItem(STORAGE_PREFIX + id, '1');
}

/** Remove flags do localStorage cujos ids não existem mais no array. */
function cleanupOrphanedFlags(): void {
  if (typeof window === 'undefined') return;
  const validIds = new Set(ANNOUNCEMENTS.map((a) => a.id));
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(STORAGE_PREFIX)) continue;
    const id = key.slice(STORAGE_PREFIX.length);
    if (!validIds.has(id)) toRemove.push(key);
  }
  toRemove.forEach((key) => localStorage.removeItem(key));
}

export function AnnouncementsManager() {
  const [currentId, setCurrentId] = useState<string | null>(null);
  const { requestPanelWithPrompt } = useEditor();

  useEffect(() => {
    cleanupOrphanedFlags();
    const first = ANNOUNCEMENTS.find((a) => !isSeen(a.id));
    if (first) setCurrentId(first.id);
  }, []);

  const current = ANNOUNCEMENTS.find((a) => a.id === currentId);
  if (!current) return null;

  function handleDismiss() {
    if (!current) return;
    markSeen(current.id);
    const next = ANNOUNCEMENTS.find(
      (a) => a.id !== current.id && !isSeen(a.id),
    );
    setCurrentId(next?.id ?? null);
  }

  function dispatchAction(action: AnnouncementAction) {
    switch (action.type) {
      case 'open-image-panel':
        requestPanelWithPrompt({ panelType: 'generate-image', prompt: '' });
        break;
      case 'open-video-panel':
        requestPanelWithPrompt({ panelType: 'generate-video', prompt: '' });
        break;
      case 'href':
        window.open(action.url, '_blank', 'noopener,noreferrer');
        break;
    }
  }

  return (
    <AnnouncementModal
      announcement={current}
      open={true}
      onClose={handleDismiss}
      onCta={current.ctaAction ? () => dispatchAction(current.ctaAction!) : undefined}
    />
  );
}
