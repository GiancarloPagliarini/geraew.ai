'use client';

import { useEffect, useState } from 'react';

export function ClipFrames({ sourceUrl }: { sourceUrl: string }) {
  const [frames, setFrames] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 45;
    const ctx = canvas.getContext('2d')!;

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';
    video.src = sourceUrl;

    let retried = false;

    const extract = async () => {
      const duration = video.duration;
      if (!duration || !isFinite(duration)) {
        if (!cancelled) setFailed(true);
        return;
      }

      const frameCount = Math.min(8, Math.max(4, Math.ceil(duration * 1.5)));
      const interval = duration / frameCount;
      const extracted: string[] = [];

      for (let i = 0; i < frameCount; i++) {
        if (cancelled) return;
        video.currentTime = i * interval;
        await new Promise<void>((res) =>
          video.addEventListener('seeked', () => res(), { once: true }),
        );
        try {
          ctx.drawImage(video, 0, 0, 80, 45);
          extracted.push(canvas.toDataURL('image/jpeg', 0.5));
        } catch {
          if (!cancelled) setFailed(true);
          return;
        }
      }
      if (!cancelled) setFrames(extracted);
    };

    video.addEventListener('loadedmetadata', () => extract(), { once: true });
    video.addEventListener('error', () => {
      if (cancelled) return;
      if (!retried) {
        retried = true;
        video.crossOrigin = '';
        video.src = sourceUrl;
        return;
      }
      setFailed(true);
    });

    return () => {
      cancelled = true;
      video.src = '';
    };
  }, [sourceUrl]);

  if (failed || frames.length === 0) {
    return (
      <div className="absolute inset-0 bg-gradient-to-r from-[#1e494b]/50 via-[#1e494b]/30 to-[#1e494b]/50" />
    );
  }

  return (
    <div className="absolute inset-0 flex">
      {frames.map((frame, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={frame}
          alt=""
          className="h-full flex-1 object-cover"
          draggable={false}
        />
      ))}
    </div>
  );
}
