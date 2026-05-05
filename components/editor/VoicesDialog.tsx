'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, MicVocal, Plus, Trash2, Volume2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError, InworldVoice, VoiceProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useEditor } from '@/lib/editor-context';
import { useLoginModal } from '@/lib/login-modal-context';
import {
  COUNTRY_PRIORITY,
  VoiceCard,
  countryLabel,
  parseGender,
  pickGradient,
} from './VoiceCard';

interface VoicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VoicesDialog({ open, onOpenChange }: VoicesDialogProps) {
  const t = useTranslations('editorDialogs.voices');
  const { user, accessToken } = useAuth();
  const { openLoginModal } = useLoginModal();
  const { requestPanelWithPrompt, voicesVersion, bumpVoicesVersion, studioMode } = useEditor();

  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [inworldVoices, setInworldVoices] = useState<InworldVoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [country, setCountry] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function resetPreviewState() {
    setPlayingId(null);
    setPreviewLoadingId(null);
    setPreviewProgress(0);
  }

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

  const filteredInworld = useMemo(
    () =>
      country
        ? inworldVoices.filter((v) => v.langCode === country)
        : inworldVoices,
    [inworldVoices, country],
  );

  const hasFetchedRef = useRef(false);
  const fetchRef = useRef(0);

  // Mount / unmount animation
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); }
    else if (mounted) {
      setClosing(true);
      const timer = setTimeout(() => { setMounted(false); setClosing(false); }, 200);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function fetchVoices() {
    if (!user || !accessToken) return;
    const id = ++fetchRef.current;
    try {
      setLoading(true);
      setError(false);
      const [own, inworld] = await Promise.all([
        api.voices.list(accessToken),
        api.inworld.listVoices().catch(() => ({ voices: [] as InworldVoice[] })),
      ]);
      if (id === fetchRef.current) {
        setVoices(own.voices);
        setInworldVoices(inworld.voices.filter((v) => v.source !== 'PVC'));
        hasFetchedRef.current = true;
      }
    } catch {
      if (id === fetchRef.current) setError(true);
    } finally {
      if (id === fetchRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    if (!user || !accessToken) return;
    if (hasFetchedRef.current) return;
    fetchVoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user, accessToken]);

  // Re-fetch when voices version bumps (after save/delete elsewhere).
  // Skip the initial mount (already handled by the open-effect above).
  const skipFirstVersionEffect = useRef(true);
  useEffect(() => {
    if (skipFirstVersionEffect.current) {
      skipFirstVersionEffect.current = false;
      return;
    }
    // Mark cache as stale so a future open re-fetches.
    hasFetchedRef.current = false;
    // If currently open, fetch right now.
    if (open && user && accessToken) {
      fetchVoices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voicesVersion]);

  useEffect(() => {
    if (!user) {
      hasFetchedRef.current = false;
      setVoices([]);
      setError(false);
    }
  }, [user]);

  // Stop preview audio whenever the dialog closes/unmounts
  useEffect(() => {
    if (!open && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      resetPreviewState();
    }
  }, [open]);

  useEffect(() => () => {
    audioRef.current?.pause();
    audioRef.current = null;
  }, []);

  function togglePreview(id: string, url: string) {
    if ((playingId === id || previewLoadingId === id) && audioRef.current) {
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
    setPreviewLoadingId(id);

    const onPlaying = () => {
      if (audioRef.current !== audio) return;
      setPreviewLoadingId(null);
      setPlayingId(id);
    };
    const onTime = () => {
      if (audioRef.current !== audio) return;
      const dur = audio.duration;
      if (Number.isFinite(dur) && dur > 0) {
        setPreviewProgress(Math.min(1, audio.currentTime / dur));
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
      toast.error(t('previewError'));
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

  async function handleDelete(voice: VoiceProfile) {
    if (!accessToken) return;
    setDeletingId(voice.id);
    try {
      await api.voices.delete(accessToken, voice.id);
      setVoices((prev) => prev.filter((v) => v.id !== voice.id));
      bumpVoicesVersion();
      if (playingId === voice.id || previewLoadingId === voice.id) {
        audioRef.current?.pause();
        audioRef.current = null;
        resetPreviewState();
      }
      toast.success(t('deleteSuccess'));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('deleteError');
      toast.error(msg);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  function handleUseSavedVoice(voice: VoiceProfile) {
    if (!user || !accessToken) {
      openLoginModal();
      return;
    }
    requestPanelWithPrompt({
      panelType: 'generate-audio',
      prompt: '',
      voiceId: `clone:${voice.id}`,
    });
    onOpenChange(false);
  }

  function handleUseInworldVoice(voice: InworldVoice) {
    if (!user || !accessToken) {
      openLoginModal();
      return;
    }
    requestPanelWithPrompt({
      panelType: 'generate-audio',
      prompt: '',
      voiceId: `inworld:${voice.voiceId}`,
    });
    onOpenChange(false);
  }

  function handleStartClone() {
    if (!user || !accessToken) {
      openLoginModal();
      return;
    }
    requestPanelWithPrompt({
      panelType: 'generate-audio',
      prompt: '',
      audioMode: 'clone',
    });
    onOpenChange(false);
  }

  if (!mounted) return null;

  return (
    <aside
      className={`${closing ? 'aside-out-left' : 'aside-in-left'} fixed inset-0 z-50 flex flex-col ${studioMode ? 'bg-[#0d1011]' : 'bg-[#171f21]'} text-[#f3f0ed] overflow-hidden sm:static sm:h-full sm:w-xl sm:shrink-0 border-r border-white/[0.06]`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold tracking-tight text-white/85">{t('title')}</span>
          {!loading && (
            <span className="text-[10px] font-bold text-[#a2dd00]/80 bg-[#a2dd00]/[0.08] px-2 py-0.5 rounded-full tabular-nums">
              {voices.length + inworldVoices.length}
            </span>
          )}
        </div>
        <button
          onClick={() => onOpenChange(false)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto sidebar-scroll px-3 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-white/15" />
              <span className="animate-pulse text-xs font-semibold text-white/50">
                {t('loading')}
              </span>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-white/40">
            <span className="text-xs">{t('loadError')}</span>
            <button
              onClick={fetchVoices}
              className="rounded-md bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/[0.08]"
            >
              {t('retry')}
            </button>
          </div>
        ) : (
          <>
            {/* My voices */}
            <div className="px-1 pt-2 pb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#a2dd00]/75">
              <MicVocal className="h-3 w-3" />
              {t('myVoices')}
              <span className="ml-auto rounded-full bg-[#a2dd00]/[0.08] px-1.5 py-px text-[9px] font-bold tabular-nums text-[#a2dd00]/80">
                {voices.length}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Clonar voz card */}
              <button
                type="button"
                onClick={handleStartClone}
                className="group flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#a2dd00]/30 bg-[#a2dd00]/5 p-4 text-[#a2dd00]/80 transition-all hover:border-[#a2dd00]/60 hover:bg-[#a2dd00]/10 hover:text-[#a2dd00]"
              >
                <Plus className="h-6 w-6" strokeWidth={1.5} />
                <span className="text-xs font-medium">{t('cloneVoice')}</span>
              </button>

              {voices.map((voice) => {
                const isPlaying = playingId === voice.id;
                const isConfirming = confirmDeleteId === voice.id;
                const isDeleting = deletingId === voice.id;
                const previewUrl = voice.previewUrl ?? voice.sampleUrl;
                return (
                  <div key={voice.id} className="group relative">
                    <VoiceCard
                      selected={false}
                      gradient={pickGradient(voice.id)}
                      meta="Personalizada"
                      name={voice.name}
                      playing={isPlaying}
                      loading={previewLoadingId === voice.id}
                      progress={isPlaying ? previewProgress : 0}
                      hasPreview={!!previewUrl}
                      onPlay={previewUrl ? () => togglePreview(voice.id, previewUrl) : undefined}
                      onSelect={() => handleUseSavedVoice(voice)}
                    />
                    {isConfirming ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-red-400/30 bg-[#1a2123]/95 p-3 backdrop-blur-sm">
                        <p className="text-center text-[11px] font-semibold text-white/80">
                          Excluir voz?
                        </p>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handleDelete(voice)}
                            className="flex h-7 items-center gap-1 rounded-md bg-red-500/20 px-2 text-[10px] font-bold text-red-400 hover:bg-red-500/30 disabled:opacity-60"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                            {t('delete')}
                          </button>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => setConfirmDeleteId(null)}
                            className="flex h-7 items-center rounded-md px-2 text-[10px] font-bold text-white/60 hover:bg-white/[0.06] hover:text-white/90 disabled:opacity-60"
                          >
                            {t('cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(voice.id);
                        }}
                        className="absolute right-9 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[#1e494b]/40 text-red-400/70 transition-all hover:bg-red-500/20 hover:text-red-400 sm:opacity-0 group-hover:opacity-100"
                        title={t('delete')}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {voices.length === 0 && (
              <div className="mt-2 rounded-xl border border-dashed border-white/[0.07] bg-white/[0.015] px-4 py-3 text-center">
                <p className="text-[11px] text-white/45 leading-relaxed">
                  {t('emptyMyVoices')}
                </p>
              </div>
            )}

            {/* Default voices */}
            <div className="mt-5 px-1 pb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
              <Volume2 className="h-3 w-3" />
              {t('defaultVoices')}
              <span className="ml-auto rounded-full bg-white/[0.04] px-1.5 py-px text-[9px] font-bold tabular-nums text-white/40">
                {inworldVoices.length}
              </span>
            </div>

            {availableCountries.length > 0 && (
              <div className="sidebar-scroll mb-2 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1.5">
                <button
                  type="button"
                  onClick={() => setCountry(null)}
                  className={`flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2 text-[10px] font-medium transition-colors ${
                    country === null
                      ? 'bg-[#a2dd00]/15 text-[#a2dd00]'
                      : 'bg-white/[0.04] text-white/55 hover:bg-white/[0.08] hover:text-white/80'
                  }`}
                >
                  Todos
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
                      className={`flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2 text-[10px] font-medium transition-colors ${
                        active
                          ? 'bg-[#a2dd00]/15 text-[#a2dd00]'
                          : 'bg-white/[0.04] text-white/55 hover:bg-white/[0.08] hover:text-white/80'
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

            {filteredInworld.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/[0.07] bg-white/[0.015] px-4 py-6 text-center">
                <p className="text-xs text-white/45">
                  {country
                    ? t('noVoicesForCountry')
                    : t('noVoicesAvailable')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredInworld.map((voice) => {
                  const id = `inworld:${voice.voiceId}`;
                  const previewUrl = api.inworld.previewUrl(voice.voiceId);
                  const gender = parseGender(voice.description);
                  const countryName = countryLabel(voice.langCode);
                  const genderLabel =
                    gender === 'F'
                      ? t('genderF')
                      : gender === 'M'
                        ? t('genderM')
                        : null;
                  const meta = genderLabel ? `${countryName} · ${genderLabel}` : countryName;
                  return (
                    <VoiceCard
                      key={id}
                      selected={false}
                      gradient={pickGradient(voice.voiceId)}
                      meta={meta}
                      name={voice.displayName}
                      playing={playingId === id}
                      loading={previewLoadingId === id}
                      progress={playingId === id ? previewProgress : 0}
                      hasPreview
                      onPlay={() => togglePreview(id, previewUrl)}
                      onSelect={() => handleUseInworldVoice(voice)}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
