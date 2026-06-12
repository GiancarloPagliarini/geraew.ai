'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Check, Headphones, Loader2, MicVocal, Pause, Play, Search, X } from 'lucide-react';
import { cn, normalizeSearch } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export interface VoiceOption {
  /** valor enviado como voice_id: `inworld:{id}` ou `clone:{id}` */
  id: string;
  name: string;
  /** etiqueta secundária (idioma/tags) */
  hint?: string;
  cloned?: boolean;
  /** prévia tocável da voz */
  previewUrl?: string;
}

interface VoicePickerModalProps {
  selected: string | null;
  closing: boolean;
  onSelect: (voice: VoiceOption) => void;
  onClose: () => void;
}

/** Modal de escolha de voz: vozes clonadas do usuário + locutores Inworld. */
export function VoicePickerModal({ selected, closing, onSelect, onClose }: VoicePickerModalProps) {
  const t = useTranslations('home');
  const { user, accessToken } = useAuth();
  const [query, setQuery] = useState('');

  // prévia de áudio (mesma mecânica do painel do workspace)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const stopPreview = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingId(null);
    setLoadingId(null);
  };

  useEffect(() => stopPreview, []);

  const togglePreview = (id: string, url: string) => {
    if (playingId === id || loadingId === id) {
      stopPreview();
      return;
    }
    stopPreview();
    const audio = new Audio(url);
    audio.preload = 'auto';
    audioRef.current = audio;
    setLoadingId(id);
    audio.addEventListener('playing', () => {
      if (audioRef.current !== audio) return;
      setLoadingId(null);
      setPlayingId(id);
    });
    const reset = () => {
      if (audioRef.current !== audio) return;
      audioRef.current = null;
      setPlayingId(null);
      setLoadingId(null);
    };
    audio.addEventListener('ended', reset);
    audio.addEventListener('error', reset);
    audio.play().catch(reset);
  };

  // locutores predefinidos (endpoint público; PVC ficam de fora, como no workspace)
  const inworldQuery = useQuery({
    queryKey: ['inworld-voices'],
    queryFn: () => api.inworld.listVoices(),
    staleTime: 60 * 60_000,
  });

  // vozes clonadas salvas do usuário
  const savedQuery = useQuery({
    queryKey: ['saved-voices'],
    queryFn: () => api.voices.list(accessToken!),
    enabled: !!accessToken && !!user,
    staleTime: 60_000,
  });

  const groups = useMemo(() => {
    const q = normalizeSearch(query.trim());
    const matches = (name: string) => !q || normalizeSearch(name).includes(q);

    const cloned: VoiceOption[] = (savedQuery.data?.voices ?? [])
      .filter((v) => v.status === 'READY' && matches(v.name))
      .map((v) => ({
        id: `clone:${v.id}`,
        name: v.name,
        hint: v.language,
        cloned: true,
        previewUrl: v.previewUrl ?? v.sampleUrl,
      }));

    const presets: VoiceOption[] = (inworldQuery.data?.voices ?? [])
      .filter((v) => v.source !== 'PVC' && matches(v.displayName))
      .map((v) => ({
        id: `inworld:${v.voiceId}`,
        name: v.displayName,
        hint: [v.langCode, ...(v.tags ?? [])].filter(Boolean).slice(0, 3).join(' · '),
        previewUrl: api.inworld.previewUrl(v.voiceId),
      }));

    return [
      { key: 'myVoices', label: t('voice.myVoices'), voices: cloned },
      { key: 'presets', label: t('voice.presets'), voices: presets },
    ].filter((g) => g.voices.length > 0);
  }, [savedQuery.data, inworldQuery.data, query, t]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-[rgba(8,10,11,0.7)] backdrop-blur-[6px]',
        closing ? 'pointer-events-none animate-overlay-out' : 'animate-overlay-in',
      )}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('voice.pickerTitle')}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'mx-auto mt-[11vh] flex max-h-[72vh] w-[min(560px,calc(100vw-32px))] flex-col overflow-hidden rounded-[18px] border border-app-hairline-2 bg-app-card shadow-[0_30px_80px_rgba(0,0,0,0.6)]',
          closing ? 'animate-dialog-out' : 'animate-dialog-in',
        )}
      >
        {/* busca */}
        <div className="flex items-center gap-3 border-b border-app-hairline px-5 py-4">
          <Search className="size-[18px] shrink-0 text-app-muted" strokeWidth={1.8} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('voice.searchVoice')}
            className="w-full bg-transparent text-[15px] text-app-text outline-none placeholder:text-app-muted"
          />
          <button
            type="button"
            aria-label={t('palette.close')}
            onClick={onClose}
            className="text-app-muted transition-colors duration-200 ease-app hover:text-app-text"
          >
            <X className="size-[18px]" strokeWidth={1.8} />
          </button>
        </div>

        {/* lista */}
        <div className="min-h-0 flex-1 overflow-y-auto p-2.5 scrollbar-app">
          {inworldQuery.isPending && savedQuery.isPending ? (
            <div className="flex flex-col gap-2 p-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-12 skeleton-app rounded-xl bg-app-surface" style={{ animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <p className="px-3 py-8 text-center text-[14px] text-app-muted">{t('palette.empty')}</p>
          ) : (
            groups.map((group) => (
              <div key={group.key} className="mb-1">
                <p className="px-3 pb-1.5 pt-2.5 text-[11px] font-bold uppercase tracking-[0.9px] text-app-muted">
                  {group.label}
                </p>
                <div className="flex flex-col gap-1.5">
                {group.voices.map((voice) => {
                  const isSelected = voice.id === selected;
                  return (
                    <button
                      key={voice.id}
                      type="button"
                      onClick={() => onSelect(voice)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors duration-150 ease-app hover:bg-app-surface',
                        isSelected && 'bg-app-surface ring-1 ring-inset ring-app-hairline-2',
                      )}
                    >
                      <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] border border-[rgba(162,221,0,0.2)] bg-[rgba(162,221,0,0.07)]">
                        {voice.cloned ? (
                          <MicVocal className="size-[16px] text-app-lime" strokeWidth={1.8} />
                        ) : (
                          <Headphones className="size-[16px] text-app-lime" strokeWidth={1.8} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold text-app-text">
                          {voice.name}
                        </span>
                        {voice.hint && (
                          <span className="block truncate font-mono text-[11px] text-app-muted">
                            {voice.hint}
                          </span>
                        )}
                      </span>
                      {/* prévia */}
                      {voice.previewUrl && (
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={
                            playingId === voice.id ? t('voice.pausePreview') : t('voice.playPreview')
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePreview(voice.id, voice.previewUrl!);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              togglePreview(voice.id, voice.previewUrl!);
                            }
                          }}
                          className={cn(
                            'flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors duration-200 ease-app',
                            playingId === voice.id || loadingId === voice.id
                              ? 'border-[rgba(162,221,0,0.5)] text-app-lime'
                              : 'border-app-hairline-2 text-app-text-2 hover:text-app-text',
                          )}
                        >
                          {loadingId === voice.id ? (
                            <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
                          ) : playingId === voice.id ? (
                            <Pause className="size-3.5" fill="currentColor" strokeWidth={0} />
                          ) : (
                            <Play className="size-3.5 translate-x-px" fill="currentColor" strokeWidth={0} />
                          )}
                        </span>
                      )}
                      {isSelected && <Check className="size-4 shrink-0 text-app-lime" strokeWidth={2} />}
                    </button>
                  );
                })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
