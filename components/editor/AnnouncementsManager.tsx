'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Announcement, AnnouncementAction } from '@/lib/announcements';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useEditor } from '@/lib/editor-context';
import { AnnouncementModal } from './AnnouncementModal';

const STORAGE_PREFIX = 'geraew-announcement-';

function isSeen(slug: string): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(STORAGE_PREFIX + slug) === '1';
}

function markSeen(slug: string): void {
  localStorage.setItem(STORAGE_PREFIX + slug, '1');
}

/** Remove flags do localStorage cujos slugs não existem mais nos avisos atuais. */
function cleanupOrphanedFlags(validSlugs: Set<string>): void {
  if (typeof window === 'undefined') return;
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(STORAGE_PREFIX)) continue;
    const slug = key.slice(STORAGE_PREFIX.length);
    if (!validSlugs.has(slug)) toRemove.push(key);
  }
  toRemove.forEach((key) => localStorage.removeItem(key));
}

export function AnnouncementsManager() {
  const { user, accessToken } = useAuth();
  const { requestPanelWithPrompt, requestWeeklyClaim } = useEditor();
  /** Snapshot dos avisos não-vistos no momento que abriu o carousel. Não muda durante a navegação. */
  const [carousel, setCarousel] = useState<Announcement[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: announcements } = useQuery({
    queryKey: ['announcements', 'active'],
    queryFn: () => api.announcements.active(accessToken!),
    enabled: !!user && !!accessToken,
    staleTime: 5 * 60_000,
  });

  const list = useMemo(() => announcements ?? [], [announcements]);

  useEffect(() => {
    if (!list.length) return;
    cleanupOrphanedFlags(new Set(list.map((a) => a.slug)));
    if (carousel) return; // already showing
    const unseen = list.filter((a) => !isSeen(a.slug));
    if (unseen.length) {
      setCarousel(unseen);
      setCurrentIndex(0);
      markSeen(unseen[0].slug);
    }
  }, [list, carousel]);

  if (!carousel || carousel.length === 0) return null;

  const current = carousel[currentIndex];
  const total = carousel.length;

  function close() {
    setCarousel(null);
    setCurrentIndex(0);
  }

  function jumpTo(index: number) {
    if (index < 0 || index >= total) return;
    if (!carousel) return;
    markSeen(carousel[index].slug);
    setCurrentIndex(index);
  }

  function next() {
    jumpTo(currentIndex + 1);
  }

  function dispatchAction(action: AnnouncementAction) {
    switch (action.type) {
      case 'open-image-panel':
        requestPanelWithPrompt({ panelType: 'generate-image', prompt: '' });
        break;
      case 'open-video-panel':
        requestPanelWithPrompt({ panelType: 'generate-video', prompt: '' });
        break;
      case 'open-audio-panel':
        requestPanelWithPrompt({ panelType: 'generate-audio', prompt: '' });
        break;
      case 'open-weekly-claim':
        requestWeeklyClaim();
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
      onClose={close}
      onCta={current.ctaAction ? () => dispatchAction(current.ctaAction!) : undefined}
      currentIndex={currentIndex}
      total={total}
      onJumpTo={jumpTo}
      onNext={next}
    />
  );
}
