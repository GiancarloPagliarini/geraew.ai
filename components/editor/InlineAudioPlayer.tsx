'use client';

import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function InlineAudioPlayer({
  src,
  actions,
}: {
  src: string;
  actions?: React.ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [seeking, setSeeking] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = muted ? 0 : volume;
  }, [volume, muted]);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setPlaying(false);
  }, [src]);

  function togglePlay() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => { });
    } else {
      el.pause();
    }
  }

  function handleLoadedMetadata() {
    const el = audioRef.current;
    if (!el) return;
    if (Number.isFinite(el.duration)) setDuration(el.duration);
  }

  function handleTimeUpdate() {
    if (seeking) return;
    const el = audioRef.current;
    if (!el) return;
    setCurrentTime(el.currentTime);
  }

  function handleSeek(clientX: number) {
    const bar = progressBarRef.current;
    const el = audioRef.current;
    if (!bar || !el || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    el.currentTime = pct * duration;
    setCurrentTime(el.currentTime);
  }

  const progressPct = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 p-2">
      <button
        onClick={togglePlay}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#a2dd00]/15 text-[#a2dd00] transition-all hover:bg-[#a2dd00]/25"
      >
        {playing ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5 translate-x-0.5" />
        )}
      </button>

      <div
        ref={progressBarRef}
        onMouseDown={(e) => {
          setSeeking(true);
          handleSeek(e.clientX);
        }}
        onMouseMove={(e) => {
          if (e.buttons !== 1) return;
          handleSeek(e.clientX);
        }}
        onMouseUp={() => setSeeking(false)}
        onMouseLeave={() => setSeeking(false)}
        className="group relative h-1.5 min-w-0 flex-1 cursor-pointer overflow-hidden rounded-full bg-[#f3f0ed]/8"
      >
        <div
          className="h-full bg-[#a2dd00] transition-[width] duration-75"
          style={{ width: `${progressPct}%` }}
        />
        <div
          className="pointer-events-none absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#a2dd00] opacity-0 transition-opacity group-hover:opacity-100"
          style={{ left: `${progressPct}%` }}
        />
      </div>

      <span className="shrink-0 font-mono text-[10px] tabular-nums text-[#f3f0ed]/50">
        {formatPlayerTime(currentTime)}/{formatPlayerTime(duration)}
      </span>

      <button
        onClick={() => setMuted((m) => !m)}
        className="flex h-5 w-5 shrink-0 items-center justify-center text-[#f3f0ed]/40 transition-colors hover:text-[#a2dd00]"
      >
        {muted || volume === 0 ? (
          <VolumeX className="h-3.5 w-3.5" />
        ) : (
          <Volume2 className="h-3.5 w-3.5" />
        )}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={muted ? 0 : volume}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          setVolume(v);
          if (v > 0 && muted) setMuted(false);
        }}
        className="h-1 w-10 shrink-0 cursor-pointer accent-[#a2dd00]"
      />

      {actions}

      <audio
        ref={audioRef}
        src={src}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
        }}
        preload="metadata"
        hidden
      />
    </div>
  );
}

export function formatPlayerTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
