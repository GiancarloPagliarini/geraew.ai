'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, MicVocal, Plus, Volume2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { api, InworldVoice, VoiceProfile } from '@/lib/api';
import {
  COUNTRY_PRIORITY,
  VoiceCard,
  countryLabel,
  parseGender,
  pickGradient,
} from './VoiceCard';

interface VoicePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVoiceId: string;
  savedVoices: VoiceProfile[];
  inworldVoices: InworldVoice[];
  loadingInworld: boolean;
  onPickVoice: (voiceId: string) => void;
  onAddVoice?: () => void;
}


export function VoicePickerModal({
  open,
  onOpenChange,
  selectedVoiceId,
  savedVoices,
  inworldVoices,
  loadingInworld,
  onPickVoice,
  onAddVoice,
}: VoicePickerModalProps) {
  const t = useTranslations('editorPanels.voicePicker');
  const availableCountries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of inworldVoices) {
      counts.set(v.langCode, (counts.get(v.langCode) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => {
      const ai = COUNTRY_PRIORITY.indexOf(a[0]);
      const bi = COUNTRY_PRIORITY.indexOf(b[0]);
      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }
      return countryLabel(a[0]).localeCompare(countryLabel(b[0]));
    });
  }, [inworldVoices]);

  // null means "all countries"
  const [country, setCountry] = useState<string | null>(null);

  const filteredInworld = useMemo(
    () =>
      country
        ? inworldVoices.filter((v) => v.langCode === country)
        : inworldVoices,
    [inworldVoices, country],
  );

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function resetPreviewState() {
    setPlayingId(null);
    setLoadingId(null);
    setProgress(0);
  }

  useEffect(() => {
    if (!open) {
      audioRef.current?.pause();
      audioRef.current = null;
      resetPreviewState();
    }
  }, [open]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      audioRef.current = null;
    },
    [],
  );

  function togglePreview(id: string, url: string) {
    if ((playingId === id || loadingId === id) && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      resetPreviewState();
      return;
    }

    audioRef.current?.pause();
    audioRef.current = null;
    resetPreviewState();

    const audio = new Audio(url);
    audio.preload = 'auto';
    audioRef.current = audio;
    setLoadingId(id);

    const onPlaying = () => {
      if (audioRef.current !== audio) return;
      setLoadingId(null);
      setPlayingId(id);
    };
    const onTime = () => {
      if (audioRef.current !== audio) return;
      const dur = audio.duration;
      if (Number.isFinite(dur) && dur > 0) {
        setProgress(Math.min(1, audio.currentTime / dur));
      }
    };
    const onEnded = () => {
      if (audioRef.current !== audio) return;
      audioRef.current = null;
      resetPreviewState();
    };
    const onError = () => {
      if (audioRef.current !== audio) return;
      audioRef.current = null;
      resetPreviewState();
    };

    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    audio.play().catch(() => {
      if (audioRef.current === audio) {
        audioRef.current = null;
        resetPreviewState();
      }
    });
  }

  function handlePick(id: string) {
    onPickVoice(id);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="bg-[#1a2123] border border-[#f3f0ed]/[0.08] sm:max-w-3xl p-0 gap-0 rounded-2xl shadow-2xl shadow-black/60"
      >
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-[#f3f0ed]/[0.05]">
          <div className="space-y-0.5">
            <DialogTitle className="text-lg font-semibold text-[#f3f0ed]/90">
              {t('title')}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#f3f0ed]/40">
              {t('description')}
            </DialogDescription>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1e494b]/40 text-[#f3f0ed]/50 transition-colors hover:bg-[#1e494b]/70 hover:text-[#f3f0ed]/90"
            aria-label={t('close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="sidebar-scroll max-h-[70vh] overflow-y-auto px-6 py-5 space-y-6">
          <section>
            <SectionHeader
              icon={MicVocal}
              label={t('myVoices')}
              count={savedVoices.length}
              accent
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {onAddVoice && (
                <button
                  type="button"
                  onClick={() => {
                    onAddVoice();
                    onOpenChange(false);
                  }}
                  className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#a2dd00]/30 bg-[#a2dd00]/5 p-4 text-[#a2dd00]/80 transition-all hover:border-[#a2dd00]/60 hover:bg-[#a2dd00]/10 hover:text-[#a2dd00] min-h-[150px]"
                >
                  <Plus className="h-6 w-6" strokeWidth={1.5} />
                  <span className="text-xs font-medium">{t('cloneVoice')}</span>
                </button>
              )}

              {savedVoices.length === 0 && !onAddVoice && (
                <div className="col-span-full rounded-2xl border border-dashed border-[#f3f0ed]/10 bg-[#0f1416]/50 px-4 py-8 text-center">
                  <p className="text-xs text-[#f3f0ed]/40">
                    {t('emptyMyVoices')}
                  </p>
                </div>
              )}

              {savedVoices.map((voice) => {
                const id = `clone:${voice.id}`;
                const url = voice.previewUrl ?? voice.sampleUrl;
                return (
                  <VoiceCard
                    key={id}
                    selected={selectedVoiceId === id}
                    gradient={pickGradient(voice.id)}
                    meta={t('personalized')}
                    name={voice.name}
                    playing={playingId === id}
                    loading={loadingId === id}
                    progress={playingId === id ? progress : 0}
                    hasPreview={!!url}
                    onPlay={url ? () => togglePreview(id, url) : undefined}
                    onSelect={() => handlePick(id)}
                  />
                );
              })}
            </div>
          </section>

          <section>
            <SectionHeader
              icon={Volume2}
              label={t('defaultVoices')}
              count={inworldVoices.length}
            />

            {availableCountries.length > 0 && (
              <div className="sidebar-scroll mb-3 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                <button
                  type="button"
                  onClick={() => setCountry(null)}
                  className={`flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium transition-colors ${country === null
                    ? 'bg-[#a2dd00]/15 text-[#a2dd00]'
                    : 'bg-[#1e494b]/30 text-[#f3f0ed]/55 hover:bg-[#1e494b]/50 hover:text-[#f3f0ed]/80'
                    }`}
                >
                  {t('all')}
                  <span className={country === null ? 'opacity-70' : 'opacity-50'}>
                    {inworldVoices.length}
                  </span>
                </button>
                {availableCountries.map(([code, count]) => {
                  const active = country === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setCountry(code)}
                      className={`flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium transition-colors ${active
                        ? 'bg-[#a2dd00]/15 text-[#a2dd00]'
                        : 'bg-[#1e494b]/30 text-[#f3f0ed]/55 hover:bg-[#1e494b]/50 hover:text-[#f3f0ed]/80'
                        }`}
                    >
                      {countryLabel(code)}
                      <span className={active ? 'opacity-70' : 'opacity-50'}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {loadingInworld ? (
              <div className="flex items-center justify-center py-12 text-[#f3f0ed]/40">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : filteredInworld.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#f3f0ed]/10 bg-[#0f1416]/50 px-4 py-8 text-center">
                <p className="text-xs text-[#f3f0ed]/40">
                  {country
                    ? t('noVoicesForCountry')
                    : t('noVoicesAvailable')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {filteredInworld.map((voice) => {
                  const id = `inworld:${voice.voiceId}`;
                  const previewUrl = api.inworld.previewUrl(voice.voiceId);
                  const gender = parseGender(voice.description);
                  const country = countryLabel(voice.langCode);
                  const genderLabel =
                    gender === 'F'
                      ? t('genderFemale')
                      : gender === 'M'
                        ? t('genderMale')
                        : null;
                  const meta = genderLabel ? `${country} · ${genderLabel}` : country;
                  return (
                    <VoiceCard
                      key={id}
                      selected={selectedVoiceId === id}
                      gradient={pickGradient(voice.voiceId)}
                      meta={meta}
                      name={voice.displayName}
                      playing={playingId === id}
                      loading={loadingId === id}
                      progress={playingId === id ? progress : 0}
                      hasPreview
                      onPlay={() => togglePreview(id, previewUrl)}
                      onSelect={() => handlePick(id)}
                    />
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionHeader({
  icon: Icon,
  label,
  count,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  accent?: boolean;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon
        className={`h-3.5 w-3.5 ${accent ? 'text-[#a2dd00]/80' : 'text-[#f3f0ed]/40'}`}
      />
      <span
        className={`text-[10px] font-bold uppercase tracking-[0.18em] ${accent ? 'text-[#a2dd00]/80' : 'text-[#f3f0ed]/45'
          }`}
      >
        {label}
      </span>
      <span
        className={`rounded-full px-1.5 py-px text-[9px] font-bold tabular-nums ${accent
          ? 'bg-[#a2dd00]/10 text-[#a2dd00]/80'
          : 'bg-[#f3f0ed]/[0.05] text-[#f3f0ed]/40'
          }`}
      >
        {count}
      </span>
    </div>
  );
}

