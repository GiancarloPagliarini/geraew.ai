'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, MicVocal, Pause, Play, Sparkles, Trash2, Volume2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError, VoiceProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useEditor } from '@/lib/editor-context';
import { useLoginModal } from '@/lib/login-modal-context';
import { VOICE_OPTIONS, VoiceOption } from '@/lib/voice-options';

interface VoicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VoicesDialog({ open, onOpenChange }: VoicesDialogProps) {
  const t = useTranslations('editorDialogs.voices');
  const { user, accessToken } = useAuth();
  const { openLoginModal } = useLoginModal();
  const { requestPanelWithPrompt } = useEditor();

  const [voices, setVoices] = useState<VoiceProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      const data = await api.voices.list(accessToken);
      if (id === fetchRef.current) {
        setVoices(data.voices);
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
      setPlayingId(null);
    }
  }, [open]);

  useEffect(() => () => {
    audioRef.current?.pause();
    audioRef.current = null;
  }, []);

  function togglePreview(id: string, url: string) {
    if (playingId === id && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingId(null);
      return;
    }

    audioRef.current?.pause();
    const audio = new Audio(url);
    audio.onended = () => {
      if (audioRef.current === audio) {
        audioRef.current = null;
        setPlayingId(null);
      }
    };
    audio.onerror = () => {
      if (audioRef.current === audio) {
        audioRef.current = null;
        setPlayingId(null);
      }
      toast.error(t('previewError'));
    };
    audioRef.current = audio;
    setPlayingId(id);
    audio.play().catch(() => {
      if (audioRef.current === audio) {
        audioRef.current = null;
        setPlayingId(null);
      }
    });
  }

  async function handleDelete(voice: VoiceProfile) {
    if (!accessToken) return;
    setDeletingId(voice.id);
    try {
      await api.voices.delete(accessToken, voice.id);
      setVoices((prev) => prev.filter((v) => v.id !== voice.id));
      if (playingId === voice.id) {
        audioRef.current?.pause();
        audioRef.current = null;
        setPlayingId(null);
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

  function handleUseDefaultVoice(opt: VoiceOption) {
    if (!user || !accessToken) {
      openLoginModal();
      return;
    }
    requestPanelWithPrompt({
      panelType: 'generate-audio',
      prompt: '',
      voiceId: opt.value,
    });
    onOpenChange(false);
  }

  if (!mounted) return null;

  return (
    <aside
      className={`${closing ? 'aside-out-left' : 'aside-in-left'} fixed inset-0 z-50 flex flex-col bg-[#171f21] text-[#f3f0ed] overflow-hidden sm:static sm:h-full sm:w-xl sm:shrink-0 border-r border-white/[0.06]`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold tracking-tight text-white/85">{t('title')}</span>
          {!loading && (
            <span className="text-[10px] font-bold text-[#a2dd00]/80 bg-[#a2dd00]/[0.08] px-2 py-0.5 rounded-full tabular-nums">
              {voices.length + VOICE_OPTIONS.length}
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
          <div className="flex items-center justify-center py-12 text-white/40">
            <Loader2 className="h-5 w-5 animate-spin" />
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
            <div className="px-1 pt-2 pb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#a2dd00]/75">
              <MicVocal className="h-3 w-3" />
              {t('myVoices')}
            </div>

            {voices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/[0.07] bg-white/[0.015] px-4 py-6 text-center">
                <p className="text-xs text-white/45 leading-relaxed">{t('emptyMyVoices')}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {voices.map((voice) => {
                  const isPlaying = playingId === voice.id;
                  const isConfirming = confirmDeleteId === voice.id;
                  const isDeleting = deletingId === voice.id;
                  const previewUrl = voice.previewUrl ?? voice.sampleUrl;
                  const subtitle = voice.previewText?.trim() || voice.language;

                  return (
                    <div
                      key={voice.id}
                      className="group flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] px-2.5 py-2 transition-colors hover:border-white/[0.1] hover:bg-white/[0.035]"
                    >
                      <button
                        type="button"
                        onClick={() => togglePreview(voice.id, previewUrl)}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          isPlaying
                            ? 'bg-[#a2dd00]/20 text-[#a2dd00] ring-1 ring-[#a2dd00]/30'
                            : 'bg-[#1e494b]/30 text-[#a2dd00]/70 hover:bg-[#1e494b]/50 hover:text-[#a2dd00]'
                        }`}
                        title={isPlaying ? t('pausePreview') : t('playPreview')}
                      >
                        {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </button>

                      <div className="flex flex-1 min-w-0 flex-col">
                        <span className="truncate text-xs font-medium text-white/85">{voice.name}</span>
                        <span className="truncate text-[10px] text-white/35" title={subtitle}>{subtitle}</span>
                      </div>

                      {isConfirming ? (
                        <div className="flex items-center gap-1 shrink-0">
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
                            className="flex h-7 w-7 items-center justify-center rounded-md text-white/40 hover:bg-white/5 hover:text-white/80 disabled:opacity-60"
                            title={t('cancel')}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUseSavedVoice(voice)}
                            className="flex h-7 items-center gap-1 rounded-md bg-[#a2dd00]/15 px-2 text-[10px] font-bold text-[#a2dd00] ring-1 ring-[#a2dd00]/25 hover:bg-[#a2dd00]/25"
                          >
                            <Sparkles className="h-3 w-3" />
                            {t('useVoice')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(voice.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-red-400/55 hover:bg-red-500/10 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                            title={t('delete')}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Default voices */}
            <div className="mt-5 px-1 pb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
              <Volume2 className="h-3 w-3" />
              {t('defaultVoices')}
            </div>

            <div className="flex flex-col gap-1.5">
              {VOICE_OPTIONS.map((opt) => (
                <div
                  key={opt.value}
                  className="group flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.015] px-2.5 py-2 transition-colors hover:border-white/[0.1] hover:bg-white/[0.035]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-white/40">
                    <Volume2 className="h-3.5 w-3.5" />
                  </div>

                  <div className="flex flex-1 min-w-0 flex-col">
                    <span className="truncate text-xs font-medium text-white/80">{opt.label}</span>
                    <span className="text-[10px] uppercase tracking-wider text-white/30">
                      {opt.language} · {opt.gender === 'F' ? t('genderF') : t('genderM')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUseDefaultVoice(opt)}
                    className="flex h-7 items-center gap-1 rounded-md bg-white/[0.04] px-2 text-[10px] font-bold text-white/70 hover:bg-white/[0.08] hover:text-white/90"
                  >
                    <Sparkles className="h-3 w-3" />
                    {t('useVoice')}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
