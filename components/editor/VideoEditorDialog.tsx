'use client';

import {
  ArrowLeft,
  Clock,
  Download,
  Film,
  GripVertical,
  Loader2,
  Pause,
  Pencil,
  Play,
  Plus,
  SkipBack,
  SkipForward,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import {
  api,
  Generation,
  VideoClip,
  VideoProject,
} from '@/lib/api';

// ─── types ────────────────────────────────────────────────────────────────────

type RenderStatus = 'idle' | 'rendering' | 'done' | 'error';

interface ClipRange {
  clip: VideoClip;
  index: number;
  globalStart: number;
  globalEnd: number;
  trimStart: number;
  trimEnd: number;
  trimmed: number;
}

interface VideoEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── component ────────────────────────────────────────────────────────────────

export function VideoEditorDialog({ open, onOpenChange }: VideoEditorDialogProps) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const switchingRef = useRef(false);

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [renderStatus, setRenderStatus] = useState<RenderStatus>('idle');
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [globalTimeMs, setGlobalTimeMs] = useState(0);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setActiveProjectId(null);
      setSelectedClipId(null);
      setShowGalleryPicker(false);
      setRenderStatus('idle');
      setIsPlaying(false);
      setActiveClipIndex(0);
      setGlobalTimeMs(0);
    }
  }, [open]);

  // ── Projects list query ─────────────────────────────────────────────────────

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['videoEditor', 'projects'],
    queryFn: () => api.videoEditor.listProjects(accessToken!),
    enabled: !!accessToken && open,
    staleTime: 30_000,
  });

  // ── Single project query ────────────────────────────────────────────────────

  const { data: project } = useQuery({
    queryKey: ['videoEditor', 'project', activeProjectId],
    queryFn: () => api.videoEditor.getProject(accessToken!, activeProjectId!),
    enabled: !!accessToken && !!activeProjectId,
    staleTime: 10_000,
  });

  // ── Mutations ───────────────────────────────────────────────────────────────

  const createProjectMutation = useMutation({
    mutationFn: (name?: string) => api.videoEditor.createProject(accessToken!, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoEditor', 'projects'] });
      setNewProjectName('');
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.videoEditor.updateProject(accessToken!, id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoEditor', 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['videoEditor', 'project', activeProjectId] });
      setEditingProjectId(null);
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => api.videoEditor.deleteProject(accessToken!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoEditor', 'projects'] });
      if (activeProjectId) setActiveProjectId(null);
    },
  });

  const addClipMutation = useMutation({
    mutationFn: (clip: { sourceUrl: string; thumbnailUrl?: string; durationMs: number }) =>
      api.videoEditor.addClip(accessToken!, activeProjectId!, clip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoEditor', 'project', activeProjectId] });
      setShowGalleryPicker(false);
    },
  });

  const updateClipMutation = useMutation({
    mutationFn: ({ clipId, data }: { clipId: string; data: { startMs?: number; endMs?: number } }) =>
      api.videoEditor.updateClip(accessToken!, activeProjectId!, clipId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoEditor', 'project', activeProjectId] });
    },
  });

  const removeClipMutation = useMutation({
    mutationFn: (clipId: string) =>
      api.videoEditor.removeClip(accessToken!, activeProjectId!, clipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoEditor', 'project', activeProjectId] });
      if (selectedClipId) setSelectedClipId(null);
    },
  });

  const reorderClipsMutation = useMutation({
    mutationFn: (clipIds: string[]) =>
      api.videoEditor.reorderClips(accessToken!, activeProjectId!, clipIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoEditor', 'project', activeProjectId] });
    },
  });

  const renderMutation = useMutation({
    mutationFn: () => api.videoEditor.render(accessToken!, activeProjectId!),
    onMutate: () => setRenderStatus('rendering'),
    onSuccess: () => {
      setRenderStatus('done');
      queryClient.invalidateQueries({ queryKey: ['videoEditor', 'project', activeProjectId] });
      queryClient.invalidateQueries({ queryKey: ['videoEditor', 'projects'] });
    },
    onError: () => setRenderStatus('error'),
  });

  // ── Drag-and-drop reorder ───────────────────────────────────────────────────

  const dragIndexRef = useRef<number | null>(null);

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    const dragIndex = dragIndexRef.current;
    if (dragIndex === null || dragIndex === dropIndex || !project) return;

    const sorted = [...project.clips].sort((a, b) => a.order - b.order);
    const [moved] = sorted.splice(dragIndex, 1);
    sorted.splice(dropIndex, 0, moved);
    reorderClipsMutation.mutate(sorted.map((c) => c.id));
    dragIndexRef.current = null;
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const clips = project?.clips?.slice().sort((a, b) => a.order - b.order) ?? [];

  const clipRanges: ClipRange[] = useMemo(() => {
    let offset = 0;
    return clips.map((c, i) => {
      const trimStart = c.startMs ?? 0;
      const trimEnd = c.endMs ?? c.durationMs;
      const trimmed = Math.max(0, trimEnd - trimStart);
      const range: ClipRange = {
        clip: c,
        index: i,
        globalStart: offset,
        globalEnd: offset + trimmed,
        trimStart,
        trimEnd,
        trimmed,
      };
      offset += trimmed;
      return range;
    });
  }, [clips]);

  const totalMs = clipRanges.length > 0 ? clipRanges[clipRanges.length - 1].globalEnd : 0;

  // ── Player: timeupdate → global time ──────────────────────────────────────

  const handleTimeUpdate = useCallback(() => {
    if (switchingRef.current) return;
    const video = videoRef.current;
    if (!video || clipRanges.length === 0) return;

    const range = clipRanges[activeClipIndex];
    if (!range) return;

    const currentMs = video.currentTime * 1000;

    // Check if we've passed the clip's trim end
    if (currentMs >= range.trimEnd) {
      const nextIndex = activeClipIndex + 1;
      if (nextIndex < clipRanges.length) {
        switchToClip(nextIndex, true);
      } else {
        // End of timeline
        video.pause();
        setIsPlaying(false);
        setGlobalTimeMs(totalMs);
      }
      return;
    }

    setGlobalTimeMs(range.globalStart + (currentMs - range.trimStart));
  }, [activeClipIndex, clipRanges, totalMs]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [handleTimeUpdate]);

  // ── Player: switch to clip ────────────────────────────────────────────────

  const switchToClip = useCallback((index: number, autoplay: boolean) => {
    const video = videoRef.current;
    const range = clipRanges[index];
    if (!video || !range) return;

    switchingRef.current = true;
    setActiveClipIndex(index);

    const isSameSource = video.src === range.clip.sourceUrl ||
      video.currentSrc === range.clip.sourceUrl;

    if (isSameSource) {
      video.currentTime = range.trimStart / 1000;
      switchingRef.current = false;
      if (autoplay) video.play().catch(() => { });
    } else {
      video.src = range.clip.sourceUrl;
      video.load();

      const onCanPlay = () => {
        video.removeEventListener('canplay', onCanPlay);
        video.currentTime = range.trimStart / 1000;
        switchingRef.current = false;
        if (autoplay) video.play().catch(() => { });
      };
      video.addEventListener('canplay', onCanPlay);
    }

    setGlobalTimeMs(range.globalStart);
  }, [clipRanges]);

  // ── Player: play/pause ────────────────────────────────────────────────────

  function togglePlay() {
    const video = videoRef.current;
    if (!video || clips.length === 0) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      // If at the end, restart from beginning
      if (globalTimeMs >= totalMs && totalMs > 0) {
        switchToClip(0, true);
        setIsPlaying(true);
        return;
      }
      // If no source loaded yet, load first clip
      if (!video.src || video.src === '') {
        switchToClip(activeClipIndex, true);
        setIsPlaying(true);
        return;
      }
      video.play().catch(() => { });
      setIsPlaying(true);
    }
  }

  function skipPrev() {
    if (activeClipIndex > 0) {
      switchToClip(activeClipIndex - 1, isPlaying);
    } else {
      switchToClip(0, isPlaying);
    }
  }

  function skipNext() {
    if (activeClipIndex < clipRanges.length - 1) {
      switchToClip(activeClipIndex + 1, isPlaying);
    }
  }

  // ── Player: seek to global time ───────────────────────────────────────────

  const seekToGlobal = useCallback((ms: number) => {
    const clamped = Math.max(0, Math.min(ms, totalMs));
    // Find which clip range contains this time
    let targetRange = clipRanges[0];
    for (const r of clipRanges) {
      if (clamped >= r.globalStart && clamped < r.globalEnd) {
        targetRange = r;
        break;
      }
      if (clamped >= r.globalEnd) {
        targetRange = r; // fallback to last
      }
    }
    if (!targetRange) return;

    const localMs = targetRange.trimStart + (clamped - targetRange.globalStart);
    const video = videoRef.current;
    if (!video) return;

    if (targetRange.index !== activeClipIndex) {
      switchingRef.current = true;
      setActiveClipIndex(targetRange.index);

      const isSameSource = video.currentSrc === targetRange.clip.sourceUrl;
      if (isSameSource) {
        video.currentTime = localMs / 1000;
        switchingRef.current = false;
      } else {
        video.src = targetRange.clip.sourceUrl;
        video.load();
        const onCanPlay = () => {
          video.removeEventListener('canplay', onCanPlay);
          video.currentTime = localMs / 1000;
          switchingRef.current = false;
        };
        video.addEventListener('canplay', onCanPlay);
      }
    } else {
      video.currentTime = localMs / 1000;
    }
    setGlobalTimeMs(clamped);
  }, [clipRanges, totalMs, activeClipIndex]);

  // ── Init first clip on project load ───────────────────────────────────────

  useEffect(() => {
    if (clips.length > 0 && videoRef.current && !videoRef.current.src) {
      switchToClip(0, false);
    }
  }, [clips.length, switchToClip]);

  // ── Timeline: click/drag to seek ──────────────────────────────────────────

  function handleTimelinePointerDown(e: React.PointerEvent) {
    const tl = timelineRef.current;
    if (!tl || totalMs === 0) return;

    // Only handle clicks directly on the timeline container (not on clip actions)
    const target = e.target as HTMLElement;
    if (target.closest('[data-clip-action]')) return;

    e.preventDefault();
    const rect = tl.getBoundingClientRect();

    const seekFromX = (clientX: number) => {
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      // Subtract the "+" button width (40px) from available timeline space
      const addBtnWidth = 40;
      const timelineWidth = rect.width - addBtnWidth;
      const ratio = Math.max(0, Math.min(x / timelineWidth, 1));
      seekToGlobal(Math.round(ratio * totalMs));
    };

    seekFromX(e.clientX);

    const onMove = (me: PointerEvent) => seekFromX(me.clientX);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function formatMs(ms: number): string {
    const totalSec = Math.round(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${String(sec).padStart(2, '0')}`;
  }

  function statusBadge(status: VideoProject['status']) {
    const map: Record<string, { label: string; cls: string }> = {
      DRAFT: { label: 'Rascunho', cls: 'bg-[#f3f0ed]/10 text-[#f3f0ed]/50' },
      PROCESSING: { label: 'Processando', cls: 'bg-yellow-500/15 text-yellow-400' },
      COMPLETED: { label: 'Concluido', cls: 'bg-[#a2dd00]/15 text-[#a2dd00]' },
      FAILED: { label: 'Falhou', cls: 'bg-red-500/15 text-red-400' },
    };
    const s = map[status] ?? map.DRAFT;
    return (
      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${s.cls}`}>
        {s.label}
      </span>
    );
  }

  if (!open) return null;

  return (
    <aside className="aside-in-left flex h-full w-2xl shrink-0 flex-col border-r border-[#f3f0ed]/[0.07] bg-[#1a2123] text-[#f3f0ed] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#f3f0ed]/[0.05] bg-gradient-to-b from-[#f3f0ed]/[0.02] to-transparent px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          {activeProjectId ? (
            <button
              onClick={() => { setActiveProjectId(null); setSelectedClipId(null); setRenderStatus('idle'); setIsPlaying(false); setActiveClipIndex(0); setGlobalTimeMs(0); }}
              className="flex items-center gap-1.5 text-sm font-medium text-[#a2dd00] hover:text-[#a2dd00]/80 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Projetos
            </button>
          ) : (
            <>
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#a2dd00]/10">
                <Film className="h-3.5 w-3.5 text-[#a2dd00]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#f3f0ed]/60">Editor de Vídeo</h2>
                <p className="text-xs text-[#f3f0ed]/30">Crie e gerencie seus projetos</p>
              </div>
            </>
          )}
          {activeProjectId && project && (
            <span className="text-[#f3f0ed]/60 text-sm font-normal">/ {project.name}</span>
          )}
        </div>
        <button
          onClick={() => onOpenChange(false)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[#f3f0ed]/30 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden px-4 py-3 gap-3">
        {!activeProjectId && (
          <div className="flex flex-col gap-3 overflow-y-auto flex-1 min-h-0">
            {/* Create project */}
            <div className="flex gap-2 shrink-0">
              <input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newProjectName.trim()) {
                    createProjectMutation.mutate(newProjectName.trim());
                  }
                }}
                placeholder="Nome do novo projeto..."
                className="flex-1 rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/20 px-3 py-2.5 text-sm text-[#f3f0ed]/90 placeholder-[#f3f0ed]/25 outline-none transition-all focus:border-[#a2dd00]/40"
              />
              <button
                onClick={() => {
                  if (newProjectName.trim()) createProjectMutation.mutate(newProjectName.trim());
                }}
                disabled={!newProjectName.trim() || createProjectMutation.isPending}
                className="flex items-center gap-1.5 rounded-xl bg-[#a2dd00] px-4 py-2.5 text-xs font-bold text-[#1a2123] transition-all hover:bg-[#a2dd00]/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createProjectMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Criar
              </button>
            </div>

            {/* Projects grid */}
            {projectsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-28 rounded-xl bg-[#f3f0ed]/5 animate-pulse" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-[#f3f0ed]/30">
                <Film className="h-10 w-10" />
                <p className="text-sm">Nenhum projeto ainda</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setActiveProjectId(p.id)}
                    className="group relative flex flex-col gap-2 rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/10 p-3 cursor-pointer transition-all hover:border-[#a2dd00]/30 hover:bg-[#1e494b]/20"
                  >
                    <div className="aspect-video rounded-lg bg-black/30 flex items-center justify-center overflow-hidden">
                      {p.outputThumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.outputThumbnailUrl} alt="" className="h-full w-full object-cover" />
                      ) : p.clips?.[0]?.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.clips[0].thumbnailUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Film className="h-6 w-6 text-[#f3f0ed]/15" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      {editingProjectId === p.id ? (
                        <input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => {
                            if (editingName.trim() && editingName !== p.name) {
                              updateProjectMutation.mutate({ id: p.id, name: editingName.trim() });
                            } else {
                              setEditingProjectId(null);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            if (e.key === 'Escape') setEditingProjectId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          className="text-xs font-semibold text-[#f3f0ed]/90 bg-transparent border-b border-[#a2dd00]/40 outline-none"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-[#f3f0ed]/90 truncate">{p.name}</span>
                      )}
                      <div className="flex items-center gap-2">
                        {statusBadge(p.status)}
                        <span className="text-[10px] text-[#f3f0ed]/30">
                          {p.clips?.length ?? 0} clipe{(p.clips?.length ?? 0) !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProjectId(p.id);
                          setEditingName(p.name);
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1a2123]/80 text-[#f3f0ed]/50 hover:text-[#a2dd00] transition-colors"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteProjectMutation.mutate(p.id);
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1a2123]/80 text-[#f3f0ed]/50 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Editor view ─────────────────────────────────────────────────── */}
        {activeProjectId && project && (
          <div className="flex flex-col gap-3 overflow-y-auto flex-1 min-h-0">

            {/* ── Sequential Player ─────────────────────────────────────────── */}
            <div className="shrink-0 rounded-xl border border-[#f3f0ed]/8 bg-black/30 overflow-hidden">
              {renderStatus === 'done' && project.outputUrl ? (
                <video
                  key="rendered"
                  src={project.outputUrl}
                  controls
                  preload="metadata"
                  className="w-full max-h-[280px] bg-black"
                />
              ) : clips.length > 0 ? (
                <>
                  <video
                    ref={videoRef}
                    preload="auto"
                    muted={false}
                    playsInline
                    className="w-full max-h-[280px] bg-black"
                    onPause={() => setIsPlaying(false)}
                    onPlay={() => setIsPlaying(true)}
                  />
                  {/* Custom controls */}
                  <div className="flex items-center gap-3 px-3 py-2 bg-black/50">
                    <button
                      onClick={skipPrev}
                      className="text-[#f3f0ed]/50 hover:text-[#f3f0ed] transition-colors"
                    >
                      <SkipBack className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={togglePlay}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-[#a2dd00] text-[#1a2123] hover:bg-[#a2dd00]/90 transition-colors"
                    >
                      {isPlaying ? (
                        <Pause className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5 ml-0.5" />
                      )}
                    </button>
                    <button
                      onClick={skipNext}
                      className="text-[#f3f0ed]/50 hover:text-[#f3f0ed] transition-colors"
                    >
                      <SkipForward className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-[10px] text-[#f3f0ed]/50 font-mono ml-1">
                      {formatMs(globalTimeMs)} / {formatMs(totalMs)}
                    </span>
                    {/* Global progress bar */}
                    <div
                      className="flex-1 h-1 rounded-full bg-[#f3f0ed]/10 cursor-pointer relative"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const ratio = (e.clientX - rect.left) / rect.width;
                        seekToGlobal(Math.round(ratio * totalMs));
                      }}
                    >
                      <div
                        className="absolute top-0 left-0 h-full rounded-full bg-[#a2dd00]"
                        style={{ width: totalMs > 0 ? `${(globalTimeMs / totalMs) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-40 text-[#f3f0ed]/20">
                  <Play className="h-8 w-8" />
                </div>
              )}
            </div>

            {/* ── Timeline (CapCut-style) ───────────────────────────────────── */}
            <div className="shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
                  TIMELINE
                </span>
                <span className="text-[10px] text-[#f3f0ed]/30">
                  {clips.length} clipe{clips.length !== 1 ? 's' : ''} · {formatMs(totalMs)}
                </span>
              </div>

              <div
                ref={timelineRef}
                className="relative flex h-16 rounded-lg overflow-hidden select-none"
                style={{ touchAction: 'none' }}
                onPointerDown={handleTimelinePointerDown}
              >
                {/* Clip bars */}
                {clipRanges.map((range, index) => {
                  const widthPct = totalMs > 0 ? (range.trimmed / totalMs) * 100 : 0;
                  const isSelected = selectedClipId === range.clip.id;
                  const isActive = activeClipIndex === index;

                  return (
                    <div
                      key={range.clip.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClipId(range.clip.id === selectedClipId ? null : range.clip.id);
                      }}
                      className={`group relative h-full overflow-hidden cursor-pointer transition-all ${isSelected
                          ? 'ring-2 ring-[#a2dd00] ring-inset z-[5]'
                          : isActive
                            ? 'ring-1 ring-[#a2dd00]/40 ring-inset'
                            : ''
                        }`}
                      style={{
                        width: `${widthPct}%`,
                        minWidth: '40px',
                      }}
                    >
                      {/* Filmstrip frames */}
                      <ClipFrames sourceUrl={range.clip.sourceUrl} />

                      {/* Dark overlay for non-active clips */}
                      {!isActive && (
                        <div className="absolute inset-0 bg-black/30 pointer-events-none" />
                      )}

                      {/* Clip info overlay */}
                      <div className="absolute inset-0 flex items-end p-1 pointer-events-none">
                        <div className="flex items-center gap-1">
                          <span className="rounded bg-black/60 px-1 py-0.5 text-[8px] font-bold text-white/80">
                            {index + 1}
                          </span>
                          <span className="rounded bg-black/60 px-1 py-0.5 text-[8px] text-white/60">
                            {formatMs(range.trimmed)}
                          </span>
                        </div>
                      </div>

                      {/* Drag handle */}
                      <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <GripVertical className="h-3 w-3 text-white/60" />
                      </div>

                      {/* Remove button */}
                      <button
                        data-clip-action
                        onClick={(e) => {
                          e.stopPropagation();
                          removeClipMutation.mutate(range.clip.id);
                        }}
                        className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white/60 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 z-10"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>

                      {/* Trim handles (when selected) */}
                      {isSelected && (
                        <>
                          <TrimHandle
                            side="left"
                            clip={range.clip}
                            durationMs={range.clip.durationMs}
                            onTrimCommit={(startMs) =>
                              updateClipMutation.mutate({
                                clipId: range.clip.id,
                                data: { startMs },
                              })
                            }
                          />
                          <TrimHandle
                            side="right"
                            clip={range.clip}
                            durationMs={range.clip.durationMs}
                            onTrimCommit={(endMs) =>
                              updateClipMutation.mutate({
                                clipId: range.clip.id,
                                data: { endMs },
                              })
                            }
                          />
                        </>
                      )}
                    </div>
                  );
                })}

                {/* Add clip button */}
                <button
                  data-clip-action
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowGalleryPicker(true);
                  }}
                  className="flex-shrink-0 w-10 h-full flex flex-col items-center justify-center gap-0.5 bg-[#f3f0ed]/[0.03] text-[#f3f0ed]/25 transition-all hover:bg-[#f3f0ed]/[0.07] hover:text-[#a2dd00]/60 border-l border-[#f3f0ed]/[0.07]"
                >
                  <Plus className="h-4 w-4" />
                </button>

                {/* Global playhead */}
                {totalMs > 0 && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_4px_rgba(255,255,255,0.5)] pointer-events-none z-20"
                    style={{ left: `${(globalTimeMs / totalMs) * (totalMs > 0 ? (1 - 40 / (timelineRef.current?.clientWidth ?? 600)) : 1) * 100}%` }}
                  />
                )}

                {/* Empty state */}
                {clips.length === 0 && (
                  <div className="flex-1 flex items-center justify-center text-[#f3f0ed]/20 text-xs">
                    Adicione clipes para comecar
                  </div>
                )}
              </div>
            </div>

            {/* Gallery picker */}
            {showGalleryPicker && (
              <VideoGalleryPicker
                accessToken={accessToken}
                onSelect={(gen) => {
                  const output = gen.outputs?.[0];
                  if (!output) return;
                  addClipMutation.mutate({
                    sourceUrl: output.url,
                    thumbnailUrl: output.thumbnailUrl,
                    durationMs: (gen.durationSeconds ?? 8) * 1000,
                  });
                }}
                onClose={() => setShowGalleryPicker(false)}
              />
            )}

            {/* Footer */}
            <div className="shrink-0 flex items-center justify-between rounded-xl border border-[#f3f0ed]/[0.07] bg-[#1e494b]/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-[#f3f0ed]/30" />
                <span className="text-xs text-[#f3f0ed]/50">
                  Duracao total: <span className="text-[#f3f0ed]/80 font-medium">{formatMs(totalMs)}</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {renderStatus === 'done' && project.outputUrl && (
                  <button
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = project.outputUrl!;
                      a.download = `${project.name}.mp4`;
                      a.click();
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-[#f3f0ed]/10 px-3 py-2 text-xs font-medium text-[#f3f0ed]/70 transition-all hover:bg-[#f3f0ed]/15"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Baixar
                  </button>
                )}

                {renderStatus === 'error' && (
                  <span className="text-[10px] text-red-400 mr-2">Erro ao renderizar</span>
                )}

                <button
                  onClick={() => renderMutation.mutate()}
                  disabled={renderStatus === 'rendering' || clips.length === 0}
                  className="flex items-center gap-1.5 rounded-lg bg-[#a2dd00] px-4 py-2 text-xs font-bold text-[#1a2123] transition-all hover:bg-[#a2dd00]/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {renderStatus === 'rendering' ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Renderizando...
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      Renderizar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── Clip frames (filmstrip for timeline) ────────────────────────────────────

function ClipFrames({ sourceUrl }: { sourceUrl: string }) {
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

// ─── Trim handle (left/right edge of clip) ──────────────────────────────────

function TrimHandle({
  side,
  clip,
  durationMs,
  onTrimCommit,
}: {
  side: 'left' | 'right';
  clip: VideoClip;
  durationMs: number;
  onTrimCommit: (ms: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [previewPct, setPreviewPct] = useState<number | null>(null);

  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);

    const parent = (e.currentTarget as HTMLElement).parentElement!;
    const parentRect = parent.getBoundingClientRect();
    let lastMs = side === 'left' ? (clip.startMs ?? 0) : (clip.endMs ?? durationMs);

    const onMove = (me: PointerEvent) => {
      const x = Math.max(0, Math.min(me.clientX - parentRect.left, parentRect.width));
      const ratio = x / parentRect.width;
      const timeMs = Math.round(ratio * durationMs);

      if (side === 'left') {
        const endMs = clip.endMs ?? durationMs;
        lastMs = Math.max(0, Math.min(timeMs, endMs - 200));
      } else {
        const startMs = clip.startMs ?? 0;
        lastMs = Math.min(durationMs, Math.max(timeMs, startMs + 200));
      }
      setPreviewPct((lastMs / durationMs) * 100);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setDragging(false);
      setPreviewPct(null);
      onTrimCommit(lastMs);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // Position: at the trim point, or at the edge during drag
  const defaultPct = side === 'left'
    ? ((clip.startMs ?? 0) / durationMs) * 100
    : ((clip.endMs ?? durationMs) / durationMs) * 100;
  const pct = previewPct ?? defaultPct;

  return (
    <>
      {/* Dimmed region preview during drag */}
      {dragging && side === 'left' && (
        <div
          className="absolute top-0 bottom-0 left-0 bg-black/50 pointer-events-none z-[6]"
          style={{ width: `${pct}%` }}
        />
      )}
      {dragging && side === 'right' && (
        <div
          className="absolute top-0 bottom-0 right-0 bg-black/50 pointer-events-none z-[6]"
          style={{ width: `${100 - pct}%` }}
        />
      )}
      {/* Handle bar */}
      <div
        data-clip-action
        className={`absolute top-0 bottom-0 w-6 cursor-col-resize flex items-center justify-center z-10 group ${side === 'left' ? '-left-1' : '-right-1'
          }`}
        style={previewPct != null ? { left: side === 'left' ? `calc(${pct}% - 12px)` : undefined, right: side === 'right' ? `calc(${100 - pct}% - 12px)` : undefined } : undefined}
        onPointerDown={handlePointerDown}
      >
        <div className={`w-1.5 h-10 rounded-full bg-[#a2dd00] shadow-[0_0_8px_rgba(162,221,0,0.6)] transition-all ${dragging ? 'h-full w-2 bg-[#a2dd00]' : 'group-hover:h-12 group-hover:w-2'}`} />
      </div>
    </>
  );
}

// ─── Video gallery picker ─────────────────────────────────────────────────────

function VideoGalleryPicker({
  accessToken,
  onSelect,
  onClose,
}: {
  accessToken: string | null;
  onSelect: (gen: Generation) => void;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: ['gallery-picker-videos-editor'],
    queryFn: ({ pageParam }) =>
      api.gallery.list(accessToken!, pageParam as number, 12, {
        type: 'TEXT_TO_VIDEO,IMAGE_TO_VIDEO,REFERENCE_VIDEO',
      }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    enabled: !!accessToken,
    staleTime: 30_000,
  });

  const items = data?.pages.flatMap((p) => p.data) ?? [];

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) fetchNextPage(); },
      { root: scrollRef.current, threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="shrink-0 rounded-xl border border-[#f3f0ed]/10 bg-[#151b1d] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#f3f0ed]/7">
        <span className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/50">
          ESCOLHER VIDEO DA GALERIA
        </span>
        <button
          onClick={onClose}
          className="text-[#f3f0ed]/30 hover:text-[#f3f0ed]/70 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="max-h-[220px] overflow-y-auto sidebar-scroll p-2"
        onWheel={(e) => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-video rounded-lg bg-[#f3f0ed]/6 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-[10px] text-[#f3f0ed]/30 py-6">
            Nenhum video na galeria.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {items.map((item) => {
                const output = item.outputs?.[0];
                if (!output) return null;
                const thumb = output.thumbnailUrl ?? output.url;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelect(item)}
                    className="relative aspect-video rounded-lg overflow-hidden ring-2 ring-transparent transition-all opacity-80 hover:opacity-100 hover:ring-[#a2dd00]/50"
                  >
                    {item.durationSeconds ? (
                      <video
                        src={output.url}
                        preload="metadata"
                        muted
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                    )}
                    <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[8px] font-bold text-white/80">
                      {item.durationSeconds ?? '?'}s
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
                      <Plus className="h-5 w-5 text-white" />
                    </div>
                  </button>
                );
              })}
            </div>
            <div ref={sentinelRef} className="h-2" />
            {isFetchingNextPage && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-3 w-3 animate-spin text-[#a2dd00]/50" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
