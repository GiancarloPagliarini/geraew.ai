'use client';

import Image from 'next/image';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Coins,
  Download,
  Expand,
  FolderIcon,
  FolderPlus,
  Heart,
  ImageIcon,
  ImagePlus,
  Layers,
  Loader2,
  Pencil,
  Play,
  Plus,
  ScanFace, Settings, Trash2, X
} from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useEditor, GalleryPickerRequest } from '@/lib/editor-context';
import { api, Folder, Generation, GenerationInputImage, PaginatedResponse } from '@/lib/api';

type GalleryTab = 'all' | 'photos' | 'videos' | 'favorites';

const TABS: { key: GalleryTab; label: string }[] = [
  { key: 'all', label: 'Tudo' },
  { key: 'photos', label: 'Fotos' },
  { key: 'videos', label: 'Vídeos' },
  { key: 'favorites', label: 'Favoritos' },
];

function tabToFilters(tab: GalleryTab): { type?: string; favorited?: boolean } | undefined {
  switch (tab) {
    case 'photos': return { type: 'TEXT_TO_IMAGE,IMAGE_TO_IMAGE' };
    case 'videos': return { type: 'TEXT_TO_VIDEO,IMAGE_TO_VIDEO,REFERENCE_VIDEO' };
    case 'favorites': return { favorited: true };
    default: return undefined;
  }
}

const PAGE_SIZE = 6;

interface GalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GalleryDialog({ open, onOpenChange }: GalleryDialogProps) {
  const { accessToken } = useAuth();
  const { galleryPickerRequest, closeGalleryPicker } = useEditor();
  const [selected, setSelected] = useState<Generation | null>(null);
  const [activeTab, setActiveTab] = useState<GalleryTab>('all');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [pickerSelectedUrls, setPickerSelectedUrls] = useState<Set<string>>(new Set());

  // Reset picker selection when request changes
  useEffect(() => {
    setPickerSelectedUrls(new Set());
    if (galleryPickerRequest) {
      setSelected(null);
      setActiveTab('photos');
    }
  }, [galleryPickerRequest]);
  const [showFoldersList, setShowFoldersList] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // ── Folders ─────────────────────────────────────────────────────────────────

  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: () => api.folders.list(accessToken!),
    enabled: !!accessToken && open,
    staleTime: 30_000,
  });

  const activeFolder = activeFolderId ? folders.find((f) => f.id === activeFolderId) : null;

  const createFolderMutation = useMutation({
    mutationFn: (name: string) => api.folders.create(accessToken!, name),
    onSuccess: (_, name) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast.success('Pasta criada', { description: `"${name}" foi criada com sucesso.` });
    },
    onError: () => toast.error('Erro ao criar pasta', { description: 'Tente novamente.' }),
  });

  const updateFolderMutation = useMutation({
    mutationFn: ({ folderId, name }: { folderId: string; name: string }) =>
      api.folders.update(accessToken!, folderId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast.success('Pasta renomeada', { description: 'O nome foi atualizado com sucesso.' });
    },
    onError: () => toast.error('Erro ao renomear pasta', { description: 'Tente novamente.' }),
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (folderId: string) => api.folders.delete(accessToken!, folderId),
    onSuccess: (_, folderId) => {
      if (activeFolderId === folderId) { setActiveFolderId(null); setShowFoldersList(true); }
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      toast.success('Pasta excluída', { description: 'A pasta foi removida com sucesso.' });
    },
    onError: () => toast.error('Erro ao excluir pasta', { description: 'Tente novamente.' }),
  });

  const addToFolderMutation = useMutation({
    mutationFn: ({ folderId, generationId }: { folderId: string; generationId: string }) =>
      api.folders.addGenerations(accessToken!, folderId, [generationId]),
    onSuccess: (_data, { generationId }) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      queryClient.invalidateQueries({ queryKey: ['generation-folders', generationId] });
      toast.success('Adicionada à pasta', { description: 'A imagem foi movida com sucesso.' });
    },
    onError: () => toast.error('Erro ao adicionar à pasta', { description: 'Tente novamente.' }),
  });

  const removeFromFolderMutation = useMutation({
    mutationFn: ({ folderId, generationId }: { folderId: string; generationId: string }) =>
      api.folders.removeGeneration(accessToken!, folderId, generationId),
    onSuccess: (_data, { generationId }) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      queryClient.invalidateQueries({ queryKey: ['generation-folders', generationId] });
    },
  });

  // ── Infinite list ──────────────────────────────────────────────────────────

  const filters = activeFolderId
    ? { folderId: activeFolderId }
    : tabToFilters(activeTab);

  const {
    data,
    isLoading: galleryLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['gallery', 'list', activeFolderId ?? activeTab],
    queryFn: ({ pageParam }) => api.gallery.list(accessToken!, pageParam as number, PAGE_SIZE, filters),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    enabled: !!accessToken && open,
    staleTime: Infinity,
  });

  // Flatten pages into a single list
  const items = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.meta.total ?? 0;

  // ── Stats ──────────────────────────────────────────────────────────────────

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['gallery', 'stats'],
    queryFn: () => api.gallery.stats(accessToken!),
    enabled: !!accessToken && open,
    staleTime: Infinity,
  });

  // ── Favorite mutation (optimistic) ───────────────────────────────────────────

  const favoriteMutation = useMutation({
    mutationFn: (item: Generation) =>
      item.isFavorited
        ? api.gallery.unfavorite(accessToken!, item.id)
        : api.gallery.favorite(accessToken!, item.id),
    onMutate: async (item) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['gallery'] });

      const newFavorited = !item.isFavorited;

      // Optimistically update all gallery list caches
      const queryKeys = TABS.map((t) => ['gallery', 'list', t.key]);
      const snapshots: [string[], InfiniteData<PaginatedResponse<Generation>> | undefined][] = [];

      for (const qk of queryKeys) {
        const prev = queryClient.getQueryData<InfiniteData<PaginatedResponse<Generation>>>(qk);
        snapshots.push([qk, prev]);
        if (prev) {
          queryClient.setQueryData<InfiniteData<PaginatedResponse<Generation>>>(qk, {
            ...prev,
            pages: prev.pages.map((page) => ({
              ...page,
              data: page.data.map((g) =>
                g.id === item.id ? { ...g, isFavorited: newFavorited } : g,
              ),
            })),
          });
        }
      }

      // Update selected item if it's the one being toggled
      if (selected?.id === item.id) {
        setSelected({ ...selected, isFavorited: newFavorited });
      }

      return { snapshots };
    },
    onSuccess: (_data, item) => {
      const wasFavorited = item.isFavorited;
      toast.success(wasFavorited ? 'Removida dos favoritos' : 'Adicionada aos favoritos');
    },
    onError: (_err, _item, context) => {
      // Rollback all caches
      if (context?.snapshots) {
        for (const [qk, prev] of context.snapshots) {
          if (prev) queryClient.setQueryData(qk, prev);
        }
      }
      toast.error('Erro ao atualizar favorito', { description: 'Tente novamente.' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
    },
  });

  const toggleFavorite = useCallback(
    (item: Generation, e?: React.MouseEvent) => {
      e?.stopPropagation();
      favoriteMutation.mutate(item);
    },
    [favoriteMutation],
  );

  // ── IntersectionObserver — trigger next page ───────────────────────────────

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

  const handleAddToFolder = useCallback(
    (folderId: string, generationId: string) => {
      addToFolderMutation.mutate({ folderId, generationId });
    },
    [addToFolderMutation],
  );

  const handleCreateFolderAndAdd = useCallback(
    async (name: string, generationId: string) => {
      const folder = await createFolderMutation.mutateAsync(name);
      addToFolderMutation.mutate({ folderId: folder.id, generationId });
    },
    [createFolderMutation, addToFolderMutation],
  );

  // Reset scroll when closing, opening detail, or switching tabs
  useEffect(() => {
    if (!selected) scrollRef.current?.scrollTo({ top: 0 });
  }, [selected, activeTab, activeFolderId]);

  if (!open) return null;

  return (
    <aside className="aside-in-left flex h-full w-2xl shrink-0 flex-col border-r border-[#f3f0ed]/[0.07] bg-[#1a2123] text-[#f3f0ed] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#f3f0ed]/[0.05] bg-gradient-to-b from-[#f3f0ed]/[0.02] to-transparent px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#a2dd00]/10">
            <ImageIcon className="h-3.5 w-3.5 text-[#a2dd00]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#f3f0ed]/60">Galeria</h2>
            <p className="text-xs text-[#f3f0ed]/30">Suas imagens e vídeos gerados com IA</p>
          </div>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[#f3f0ed]/30 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Picker mode banner */}
      {galleryPickerRequest && (
        <div className="flex items-center justify-between border-b border-[#a2dd00]/20 bg-[#a2dd00]/5 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <ImagePlus className="h-4 w-4 text-[#a2dd00]" />
            <span className="text-xs font-medium text-[#a2dd00]">
              Selecione imagens ou arraste para o node
            </span>
          </div>
          <button
            onClick={closeGalleryPicker}
            className="rounded-md px-2.5 py-1 text-[10px] font-bold text-[#f3f0ed]/40 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 transition-colors"
          >
            CANCELAR
          </button>
        </div>
      )}

      <div className="flex flex-col flex-1 overflow-hidden px-4 py-3 gap-3">

        {/* Stats bar */}
        {!selected && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 shrink-0">
            <StatCard icon={Settings} label="Gerações" value={stats?.totalGenerations} loading={statsLoading} />
            <StatCard icon={Coins} label="Créditos" value={stats?.totalCreditsUsed} loading={statsLoading} />
            <StatCard icon={Heart} label="Favoritos" value={stats?.favoriteCount} loading={statsLoading} />
            <StatCard icon={ImagePlus} label="Imagens" value={stats ? (stats.generationsByType?.TEXT_TO_IMAGE ?? 0) + (stats.generationsByType?.IMAGE_TO_IMAGE ?? 0) : undefined} loading={statsLoading} />
            <StatCard icon={Play} label="Vídeos" value={stats ? (stats.generationsByType?.TEXT_TO_VIDEO ?? 0) + (stats.generationsByType?.IMAGE_TO_VIDEO ?? 0) : undefined} loading={statsLoading} />
            <StatCard
              icon={FolderIcon}
              label="Pastas"
              value={folders.length}
              loading={false}
              onClick={() => { setShowFoldersList(!showFoldersList); setActiveFolderId(null); }}
              active={showFoldersList}
            />
          </div>
        )}

        {/* Tab bar (hidden when inside a folder, viewing detail, or browsing folders) */}
        {!selected && !activeFolderId && !showFoldersList && (
          <div className="flex gap-1 shrink-0">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === tab.key
                  ? 'bg-[#a2dd00]/15 text-[#a2dd00]'
                  : 'text-[#f3f0ed]/40 hover:text-[#f3f0ed]/70 hover:bg-[#f3f0ed]/5'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Folder breadcrumb (when inside a folder) */}
        {!selected && activeFolderId && activeFolder && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => { setActiveFolderId(null); setShowFoldersList(true); }}
              className="flex items-center gap-1 text-xs font-medium text-[#a2dd00] hover:text-[#a2dd00]/80 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              {activeFolder.name}
            </button>
          </div>
        )}

        {/* Folders list header (when browsing folders) */}
        {!selected && !activeFolderId && showFoldersList && (
          <div className="flex items-center justify-between shrink-0">
            <button
              onClick={() => setShowFoldersList(false)}
              className="flex items-center gap-1 text-xs font-medium text-[#a2dd00] hover:text-[#a2dd00]/80 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Minhas Pastas
            </button>
          </div>
        )}

        {/* Content */}
        <div ref={scrollRef} className="overflow-y-auto sidebar-scroll flex-1 -mx-1 px-1">
          {/* Folders list view */}
          {!selected && !activeFolderId && showFoldersList ? (
            <div className="flex flex-col gap-2 mt-1">
              {/* Create new folder */}
              <div className="flex gap-2">
                <input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newFolderName.trim() && !createFolderMutation.isPending) {
                      createFolderMutation.mutate(newFolderName.trim());
                      setNewFolderName('');
                    }
                  }}
                  placeholder="Nova pasta..."
                  className="flex-1 rounded-lg bg-[#f3f0ed]/5 border border-[#f3f0ed]/10 px-3 py-2 text-xs text-[#f3f0ed] placeholder:text-[#f3f0ed]/30 focus:outline-none focus:border-[#a2dd00]/30"
                />
                <button
                  onClick={() => {
                    if (newFolderName.trim()) {
                      createFolderMutation.mutate(newFolderName.trim());
                      setNewFolderName('');
                    }
                  }}
                  disabled={!newFolderName.trim() || createFolderMutation.isPending}
                  className="rounded-lg bg-[#a2dd00]/10 px-3 py-2 text-xs font-medium text-[#a2dd00] hover:bg-[#a2dd00]/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {createFolderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </button>
              </div>

              {folders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-[#f3f0ed]/30">
                  <FolderIcon className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm font-medium">Nenhuma pasta</p>
                  <p className="text-xs mt-1">Crie uma pasta para organizar suas gerações</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {folders.map((folder) => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      onOpen={() => { setActiveFolderId(folder.id); setShowFoldersList(false); }}
                      onRename={(name) => updateFolderMutation.mutate({ folderId: folder.id, name })}
                      onDelete={() => deleteFolderMutation.mutate(folder.id)}
                      deleteIsPending={deleteFolderMutation.isPending && deleteFolderMutation.variables === folder.id}
                      renameIsPending={updateFolderMutation.isPending && updateFolderMutation.variables?.folderId === folder.id}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : selected ? (
            <DetailView
              item={selected}
              onBack={() => setSelected(null)}
              toggleFavorite={toggleFavorite}
              folders={folders}
              onAddToFolder={(folderId) => handleAddToFolder(folderId, selected.id)}
              onCreateFolderAndAdd={(name) => handleCreateFolderAndAdd(name, selected.id)}
            />
          ) : galleryLoading ? (
            <SkeletonGrid />
          ) : items.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1">
                {items.map((item) => {
                  const itemUrl = item.outputs?.[0]?.url;
                  return (
                    <GalleryItem
                      key={item.id}
                      item={item}
                      onClick={() => {
                        if (galleryPickerRequest && itemUrl && !item.durationSeconds) {
                          setPickerSelectedUrls((prev) => {
                            const next = new Set(prev);
                            if (next.has(itemUrl)) {
                              next.delete(itemUrl);
                            } else if (next.size < galleryPickerRequest.remaining) {
                              next.add(itemUrl);
                            }
                            return next;
                          });
                        } else if (!galleryPickerRequest) {
                          setSelected(item);
                        }
                      }}
                      onToggleFavorite={toggleFavorite}
                      folders={folders}
                      onAddToFolder={(folderId) => handleAddToFolder(folderId, item.id)}
                      onCreateFolderAndAdd={(name) => handleCreateFolderAndAdd(name, item.id)}
                      pickerMode={!!galleryPickerRequest}
                      pickerSelected={!!itemUrl && pickerSelectedUrls.has(itemUrl)}
                      pickerDisabled={!!galleryPickerRequest && !!itemUrl && !pickerSelectedUrls.has(itemUrl) && pickerSelectedUrls.size >= galleryPickerRequest.remaining}
                    />
                  );
                })}
              </div>

              {/* Sentinel — observed to trigger next page load */}
              <div ref={sentinelRef} className="h-4" />

              {/* Loading indicator for next page */}
              {isFetchingNextPage && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-[#a2dd00]/50" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!selected && !galleryLoading && items.length > 0 && !galleryPickerRequest && (
          <div className="flex items-center justify-between border-t border-[#f3f0ed]/7 pt-3">
            <span className="text-[10px] font-medium tracking-wider text-[#f3f0ed]/30 uppercase">
              {items.length} de {total} {total === 1 ? 'item' : 'itens'}
            </span>
          </div>
        )}

        {/* Picker confirm footer */}
        {galleryPickerRequest && pickerSelectedUrls.size > 0 && (
          <div className="flex items-center justify-between border-t border-[#a2dd00]/20 bg-[#a2dd00]/5 rounded-xl px-4 py-2.5 shrink-0">
            <span className="text-xs text-[#f3f0ed]/50">
              {pickerSelectedUrls.size} selecionada{pickerSelectedUrls.size > 1 ? 's' : ''}
            </span>
            <button
              onClick={() => {
                pickerSelectedUrls.forEach((url) => galleryPickerRequest.onSelect(url));
                setPickerSelectedUrls(new Set());
                closeGalleryPicker();
              }}
              className="rounded-lg bg-[#a2dd00] px-4 py-1.5 text-xs font-bold text-[#1a2123] transition-all hover:bg-[#a2dd00]/90 active:scale-95"
            >
              ADICIONAR
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── Detail view ──────────────────────────────────────────────────────────────

function DetailView({ item, onBack, toggleFavorite, folders, onAddToFolder, onCreateFolderAndAdd }: {
  item: Generation;
  onBack: () => void;
  toggleFavorite: (item: Generation, e?: React.MouseEvent) => void;
  folders: Folder[];
  onAddToFolder: (folderId: string) => void;
  onCreateFolderAndAdd: (name: string) => void;
}) {
  const { accessToken } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [lightbox, setLightbox] = useState<GenerationInputImage | null>(null);

  const { data: detailFolders } = useQuery({
    queryKey: ['generation-folders', item.id],
    queryFn: () => api.generations.getFolders(accessToken!, item.id),
    enabled: !!accessToken,
    staleTime: 60_000,
  });

  const outputs = item.outputs ?? [];
  const activeOutput = outputs[activeIndex];
  const url = activeOutput?.url;
  const isVideo = !!item.durationSeconds;
  const hasRefs = (item.inputImages?.length ?? 0) > 0;
  const multipleOutputs = outputs.length > 1;

  // Reset loaded state when switching output
  function handleSelect(index: number) {
    if (index === activeIndex) return;
    setActiveIndex(index);
    setLoaded(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onBack}
        className="self-start flex items-center gap-1 text-xs font-medium text-[#a2dd00] hover:text-[#a2dd00]/80 transition-colors"
      >
        <ArrowLeft className="h-3 w-3" />
        Voltar para galeria
      </button>

      {/* Main player */}
      <div className="relative w-full rounded-xl overflow-hidden bg-[#f3f0ed]/3 max-h-[50vh]">
        {!loaded && <div className="absolute inset-0 animate-pulse bg-[#f3f0ed]/6" />}

        {isVideo ? (
          <video
            key={url}
            src={url}
            controls
            preload="metadata"
            className={`w-full rounded-xl bg-black max-h-[50vh] transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoadedMetadata={() => setLoaded(true)}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url}
            src={url}
            alt={item.prompt ?? 'Imagem gerada'}
            loading="lazy"
            decoding="async"
            className={`w-full rounded-xl object-contain max-h-[50vh] transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setLoaded(true)}
          />
        )}

        {/* Output counter badge */}
        {multipleOutputs && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 backdrop-blur-sm">
            <span className="text-[10px] font-bold text-white">{activeIndex + 1} / {outputs.length}</span>
          </div>
        )}
      </div>

      {/* Output thumbnails strip */}
      {multipleOutputs && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-[#a2dd00]" />
            <span className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/30 uppercase">
              {outputs.length} versões geradas
            </span>
          </div>
          <div className="flex gap-2 pt-1 pb-2">
            {outputs.map((output, i) => (
              <OutputThumb
                key={output.id}
                url={output.url}
                index={i}
                isVideo={isVideo}
                isActive={i === activeIndex}
                onClick={() => handleSelect(i)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Metadata + download */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          {item.prompt && (
            <p className="text-sm text-[#f3f0ed]/70 line-clamp-3">{item.prompt}</p>
          )}
          <div className="flex items-center gap-3 text-[10px] text-[#f3f0ed]/30 font-medium tracking-wider">
            {item.resolution && <span>{item.resolution}</span>}
            {item.durationSeconds && <span>{item.durationSeconds}s</span>}
            {item.modelUsed && <span>{item.modelUsed}</span>}
            {item.creditsConsumed > 0 && <span>{item.creditsConsumed} créditos</span>}
            {item.createdAt && (
              <span>{new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={(e) => toggleFavorite(item, e)}
            className="flex items-center gap-2 rounded-lg bg-[#f3f0ed]/5 px-3 py-1.5 text-xs font-medium text-[#f3f0ed]/50 hover:bg-[#f3f0ed]/10 transition-colors"
          >
            <Heart className={`h-4 w-4 ${item.isFavorited ? 'fill-[#a2dd00] text-[#a2dd00]' : ''}`} />
            {item.isFavorited ? 'Favoritado' : 'Favoritar'}
          </button>
          <FolderDropdown
            folders={folders}
            activeFolderIds={detailFolders?.map((f) => f.id) ?? []}
            onSelect={onAddToFolder}
            onCreateAndAdd={onCreateFolderAndAdd}
          />
          <button
            onClick={async () => {
              if (!url) return;
              const ext = isVideo ? 'mp4' : 'jpg';
              const filename = `geraew-ai.${ext}`;
              try {
                const res = await fetch(url);
                const blob = await res.blob();
                const objectUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = objectUrl;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(objectUrl);
              } catch {
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
              }
            }}
            className="flex items-center gap-2 rounded-lg bg-[#a2dd00]/10 px-3 py-1.5 text-xs font-medium text-[#a2dd00] hover:bg-[#a2dd00]/20 transition-colors"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
      </div>

      {/* Reference images */}
      {hasRefs && (
        <div className="flex flex-col gap-2 mb-5">
          <div className="flex items-center gap-1.5">
            <ScanFace className="h-4 w-4 text-[#a2dd00]" />
            <span className="text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/30 uppercase">
              Referências usadas
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {item.inputImages!.map((img) => (
              <button
                key={img.id}
                onClick={() => setLightbox(img)}
                className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg ring-1 ring-[#f3f0ed]/10 hover:ring-[#a2dd00]/50 transition-all"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={`Referência ${img.order + 1}`}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <Expand className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 rounded-full bg-[#f3f0ed]/10 p-1.5 text-[#f3f0ed]/70 hover:bg-[#f3f0ed]/20 transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="h-4 w-4" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.url}
            alt={`Referência ${lightbox.order + 1}`}
            className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

// ─── Output thumbnail ─────────────────────────────────────────────────────────

function OutputThumb({
  url,
  index,
  isVideo,
  isActive,
  onClick,
}: {
  url: string;
  index: number;
  isVideo: boolean;
  isActive: boolean;
  onClick: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      onClick={onClick}
      className={`relative shrink-0 h-20 w-32 overflow-hidden rounded-lg ring-2 transition-all ${isActive
        ? 'ring-[#a2dd00] opacity-100'
        : 'ring-[#f3f0ed]/10 opacity-50 hover:opacity-80 hover:ring-[#f3f0ed]/30'
        }`}
    >
      {!loaded && <div className="absolute inset-0 animate-pulse bg-[#f3f0ed]/6" />}

      {isVideo ? (
        <video
          key={url}
          src={url}
          muted
          preload="metadata"
          className={`h-full w-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoadedMetadata={() => setLoaded(true)}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`Versão ${index + 1}`}
          className={`h-full w-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
        />
      )}

      {/* Version label */}
      <div className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-black/60 px-1 py-0.5">
        {isVideo && <Play className="h-2 w-2 fill-white text-white" />}
        <span className="text-[9px] font-bold text-white">{index + 1}</span>
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute inset-0 ring-inset ring-2 ring-[#a2dd00]/40 rounded-lg pointer-events-none" />
      )}
    </button>
  );
}

// ─── Gallery item (memoized) ──────────────────────────────────────────────────

const GalleryItem = memo(function GalleryItem({
  item,
  onClick,
  onToggleFavorite,
  folders,
  onAddToFolder,
  onCreateFolderAndAdd,
  pickerMode = false,
  pickerSelected = false,
  pickerDisabled = false,
}: {
  item: Generation;
  onClick: () => void;
  onToggleFavorite: (item: Generation, e?: React.MouseEvent) => void;
  folders: Folder[];
  onAddToFolder: (folderId: string) => void;
  onCreateFolderAndAdd: (name: string) => void;
  pickerMode?: boolean;
  pickerSelected?: boolean;
  pickerDisabled?: boolean;
}) {
  const { accessToken } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [folderDropdownOpen, setFolderDropdownOpen] = useState(false);
  const url = item.outputs?.[0]?.url;
  const isVideo = !!item.durationSeconds;
  const hasRefs = (item.inputImages?.length ?? 0) > 0;
  const outputCount = item.outputs?.length ?? 0;

  const { data: itemFolders } = useQuery({
    queryKey: ['generation-folders', item.id],
    queryFn: () => api.generations.getFolders(accessToken!, item.id),
    enabled: !!accessToken,
    staleTime: 60_000,
  });

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={!isVideo && !!url}
      onDragStart={(e) => {
        if (!url || isVideo) return;
        e.dataTransfer.setData('text/geraew-image-url', url);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onClick={() => { if (!folderDropdownOpen) onClick(); }}
      onKeyDown={(e) => { if (!folderDropdownOpen && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}
      className={`group relative aspect-square rounded-xl overflow-hidden bg-[#f3f0ed]/3 ring-2 transition-[box-shadow,ring-color,opacity] cursor-pointer ${pickerSelected
        ? 'ring-[#a2dd00] opacity-100'
        : pickerDisabled
          ? 'ring-transparent opacity-30 cursor-not-allowed'
          : pickerMode
            ? 'ring-transparent opacity-80 hover:opacity-100 hover:ring-[#a2dd00]/30'
            : 'ring-[#f3f0ed]/6 hover:ring-[#a2dd00]/40'
        }`}
      style={{ contain: 'layout paint' }}
    >
      {/* Static placeholder until media loads */}
      {!loaded && <div className="absolute inset-0 bg-[#f3f0ed]/6" />}

      {isVideo ? (
        <video
          src={url}
          muted
          preload="metadata"
          className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoadedMetadata={() => setLoaded(true)}
        />
      ) : (
        <Image
          src={url!}
          alt={item.prompt ?? 'Imagem gerada'}
          fill
          sizes="(max-width: 640px) 50vw, 33vw"
          quality={40}
          className={`object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
        />
      )}

      {/* Picker selected overlay */}
      {pickerSelected && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#a2dd00]/20">
          <div className="h-7 w-7 rounded-full bg-[#a2dd00] flex items-center justify-center">
            <svg className="h-4 w-4 text-[#1a2123]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
      )}

      {/* Hover overlay (hidden in picker mode) */}
      {!pickerMode && (
        <>
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute bottom-0 inset-x-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-[10px] font-medium text-white truncate">{item.prompt ?? '—'}</p>
          </div>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Expand className="h-3.5 w-3.5 text-white drop-shadow" />
          </div>
        </>
      )}

      {/* Bottom-right badges */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1">
        {itemFolders && itemFolders.length > 0 && (
          <div className="flex items-center gap-0.5 rounded-md bg-black/70 px-1.5 py-0.5">
            <FolderIcon className="h-3.5 w-3.5 text-[#a2dd00]" />
            <span className="text-[10px] font-bold text-[#a2dd00] max-w-[60px] truncate">{itemFolders[0].name}</span>
          </div>
        )}
        {isVideo && (
          <div className="flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5">
            <Play className="h-3 w-3 fill-white text-white" />
            <span className="text-[9px] font-bold text-white">{item.durationSeconds}s</span>
          </div>
        )}
        {outputCount > 1 && (
          <div className="flex items-center gap-0.5 rounded-md bg-black/70 px-1.5 py-0.5">
            <Layers className="h-3 w-3 text-[#a2dd00]" />
            <span className="text-[9px] font-bold text-[#a2dd00]">{outputCount}</span>
          </div>
        )}
      </div>

      {/* Top-left badges (hidden in picker mode) */}
      {!pickerMode && <div className="absolute top-2 left-2 flex items-center gap-1">
        {hasRefs && (
          <div className="flex items-center gap-0.5 rounded-md bg-black/60 px-1 py-0.5 backdrop-blur-sm">
            <ScanFace className="h-3 w-3 text-[#a2dd00]" />
            <span className="text-[8px] font-bold text-[#a2dd00]">{item.inputImages!.length}</span>
          </div>
        )}
        <div
          role="button"
          onClick={(e) => onToggleFavorite(item, e)}
          className={`rounded-md p-0.5 backdrop-blur-sm transition-colors ${item.isFavorited
            ? 'bg-black/60'
            : 'bg-black/40 opacity-0 group-hover:opacity-100'
            }`}
        >
          <Heart className={`h-3.5 w-3.5 drop-shadow transition-colors ${item.isFavorited
            ? 'fill-[#a2dd00] text-[#a2dd00]'
            : 'text-white/70 hover:text-[#a2dd00]'
            }`} />
        </div>
        <GalleryItemFolderButton
          folders={folders}
          activeFolderIds={itemFolders?.map((f) => f.id) ?? []}
          onAddToFolder={onAddToFolder}
          onCreateFolderAndAdd={onCreateFolderAndAdd}
          onOpenChange={setFolderDropdownOpen}
        />
      </div>}
    </div>
  );
});

// ─── Folder card (grid view) ───────────────────────────────────────────────────

function FolderCard({
  folder,
  onOpen,
  onRename,
  onDelete,
  deleteIsPending,
  renameIsPending,
}: {
  folder: Folder;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  deleteIsPending: boolean;
  renameIsPending: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const confirmRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== folder.name) {
      onRename(trimmed);
    } else {
      setEditName(folder.name);
    }
    setIsEditing(false);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => { if (!isEditing) onOpen(); }}
      onKeyDown={(e) => { if (!isEditing && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onOpen(); } }}
      className="group flex flex-col gap-2 rounded-xl border border-[#f3f0ed]/7 bg-[#f3f0ed]/3 p-4 text-left hover:border-[#a2dd00]/20 hover:bg-[#f3f0ed]/5 transition-colors cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <FolderIcon className="h-5 w-5 text-[#a2dd00]" />
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditName(folder.name);
              setIsEditing(true);
            }}
            className="rounded p-1 hover:bg-[#f3f0ed]/10 transition-colors"
          >
            <Pencil className="h-3 w-3 text-[#f3f0ed]/40" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            disabled={deleteIsPending}
            className="rounded p-1 hover:bg-red-500/10 transition-colors disabled:opacity-30"
          >
            {deleteIsPending
              ? <Loader2 className="h-3 w-3 text-red-400/60 animate-spin" />
              : <Trash2 className="h-3 w-3 text-red-400/60" />}
          </button>
        </div>
      </div>
      {renameIsPending ? (
        <div className="h-5 w-3/4 rounded bg-[#f3f0ed]/10 animate-pulse" />
      ) : isEditing ? (
        <input
          ref={inputRef}
          value={editName}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={confirmRename}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') confirmRename();
            if (e.key === 'Escape') {
              setEditName(folder.name);
              setIsEditing(false);
            }
          }}
          className="bg-transparent text-sm font-medium text-[#f3f0ed]/80 outline-none border-b border-[#a2dd00]/40 w-full"
        />
      ) : (
        <span className="text-sm font-medium text-[#f3f0ed]/80 truncate">{folder.name}</span>
      )}
      <span className="text-[10px] text-[#f3f0ed]/30">{folder.generationCount} {folder.generationCount === 1 ? 'item' : 'itens'}</span>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent
          showCloseButton={false}
          className="max-w-xs bg-[#252220] border-[#f3f0ed]/10"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle className="text-[#f3f0ed] text-base">Excluir pasta</DialogTitle>
            <DialogDescription className="text-[#f3f0ed]/45 text-sm">
              Tem certeza que deseja excluir <span className="font-medium text-[#f3f0ed]/70">&quot;{folder.name}&quot;</span>? As gerações dentro dela não serão apagadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 flex-row gap-2">
            <DialogClose asChild>
              <button className="flex-1 rounded-lg bg-[#f3f0ed]/5 px-4 py-2 text-xs font-medium text-[#f3f0ed]/60 hover:bg-[#f3f0ed]/10 transition-colors">
                Cancelar
              </button>
            </DialogClose>
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                onDelete();
              }}
              className="flex-1 rounded-lg bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Excluir
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Folder chip (horizontal folder bar) ──────────────────────────────────────

function FolderChip({
  folder,
  onClick,
  onRename,
  onDelete,
}: {
  folder: Folder;
  onClick: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const confirmRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== folder.name) {
      onRename(trimmed);
    } else {
      setEditName(folder.name);
    }
    setIsEditing(false);
  };

  return (
    <div className="relative shrink-0">
      {isEditing ? (
        <div className="flex items-center gap-1.5 rounded-lg bg-[#f3f0ed]/10 px-3 py-1.5">
          <FolderIcon className="h-3.5 w-3.5 text-[#a2dd00] shrink-0" />
          <input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={confirmRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmRename();
              if (e.key === 'Escape') {
                setEditName(folder.name);
                setIsEditing(false);
              }
            }}
            className="bg-transparent text-xs font-medium text-[#f3f0ed] outline-none border-none w-[80px]"
          />
        </div>
      ) : (
        <button
          onClick={onClick}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowMenu(true);
          }}
          className="flex items-center gap-1.5 rounded-lg bg-[#f3f0ed]/5 px-3 py-1.5 text-xs font-medium text-[#f3f0ed]/60 hover:bg-[#f3f0ed]/10 hover:text-[#f3f0ed]/80 transition-colors"
        >
          <FolderIcon className="h-3.5 w-3.5 text-[#a2dd00]" />
          {folder.name}
          <span className="text-[10px] text-[#f3f0ed]/30">{folder.generationCount}</span>
        </button>
      )}

      {showMenu && (
        <div ref={menuRef} className="absolute top-full left-0 mt-1 z-50 min-w-[120px] rounded-lg bg-[#252220] border border-[#f3f0ed]/10 shadow-xl py-1">
          <button
            onClick={() => {
              setShowMenu(false);
              setEditName(folder.name);
              setIsEditing(true);
            }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-[#f3f0ed]/60 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]"
          >
            <Pencil className="h-3 w-3" />
            Renomear
          </button>
          <button
            onClick={() => {
              setShowMenu(false);
              onDelete();
            }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-400/70 hover:bg-red-400/5 hover:text-red-400"
          >
            <Trash2 className="h-3 w-3" />
            Excluir
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Folder dropdown (for detail view) ────────────────────────────────────────

function FolderDropdown({
  folders,
  activeFolderIds = [],
  onSelect,
  onCreateAndAdd,
}: {
  folders: Folder[];
  activeFolderIds?: string[];
  onSelect: (folderId: string) => void;
  onCreateAndAdd: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setNewName('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg bg-[#f3f0ed]/5 px-3 py-1.5 text-xs font-medium text-[#f3f0ed]/50 hover:bg-[#f3f0ed]/10 transition-colors"
      >
        <FolderPlus className="h-4 w-4" />
        Pasta
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-1 z-50 w-52 rounded-lg bg-[#252220] border border-[#f3f0ed]/10 shadow-xl py-1">
          {folders.length > 0 && (
            <div className="max-h-40 overflow-y-auto sidebar-scroll">
              {folders.map((f) => {
                const isActive = activeFolderIds.includes(f.id);
                return (
                  <button
                    key={f.id}
                    onClick={() => {
                      onSelect(f.id);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-[#f3f0ed]/60 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]"
                  >
                    <FolderIcon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-[#a2dd00]' : 'text-[#f3f0ed]/30'}`} />
                    <span className="truncate flex-1 text-left">{f.name}</span>
                    {isActive && (
                      <svg className="h-3.5 w-3.5 text-[#a2dd00] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          <div className="border-t border-[#f3f0ed]/7 px-2 py-1.5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newName.trim()) {
                  onCreateAndAdd(newName.trim());
                  setNewName('');
                  setOpen(false);
                }
              }}
              className="flex items-center gap-1"
            >
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nova pasta..."
                className="flex-1 bg-transparent text-xs text-[#f3f0ed] placeholder-[#f3f0ed]/20 outline-none px-1 py-0.5"
                autoFocus
              />
              <button
                type="submit"
                disabled={!newName.trim()}
                className="rounded p-0.5 text-[#a2dd00] hover:bg-[#a2dd00]/10 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Gallery item folder button (small icon on grid items) ────────────────────

function GalleryItemFolderButton({
  folders,
  activeFolderIds = [],
  onAddToFolder,
  onCreateFolderAndAdd,
  onOpenChange,
}: {
  folders: Folder[];
  activeFolderIds?: string[];
  onAddToFolder: (folderId: string) => void;
  onCreateFolderAndAdd: (name: string) => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, _setOpen] = useState(false);
  const setOpen = (v: boolean) => { _setOpen(v); onOpenChange?.(v); };
  const [newName, setNewName] = useState('');

  return (
    <>
      <div
        role="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="rounded-md p-0.5 bg-black/40 opacity-0 group-hover:opacity-100 backdrop-blur-sm transition-colors hover:bg-black/60"
      >
        <FolderPlus className="h-3.5 w-3.5 text-white/70 hover:text-[#a2dd00] drop-shadow transition-colors" />
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setNewName(''); }}>
        <DialogContent
          showCloseButton={false}
          className="max-w-xs bg-[#252220] border-[#f3f0ed]/10"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle className="text-[#f3f0ed] text-base">Adicionar à pasta</DialogTitle>
            <DialogDescription className="text-[#f3f0ed]/45 text-sm">
              Selecione uma pasta ou crie uma nova.
            </DialogDescription>
          </DialogHeader>

          {folders.length > 0 && (
            <div className="max-h-40 overflow-y-auto sidebar-scroll -mx-1">
              {folders.map((f) => {
                const isActive = activeFolderIds.includes(f.id);
                return (
                  <button
                    key={f.id}
                    onClick={() => {
                      onAddToFolder(f.id);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-xs text-[#f3f0ed]/60 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed] transition-colors"
                  >
                    <FolderIcon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#a2dd00]' : 'text-[#f3f0ed]/30'}`} />
                    <span className="truncate flex-1 text-left">{f.name}</span>
                    {isActive && (
                      <svg className="h-3.5 w-3.5 text-[#a2dd00] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="border-t border-[#f3f0ed]/7 pt-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newName.trim()) {
                  onCreateFolderAndAdd(newName.trim());
                  setNewName('');
                  setOpen(false);
                }
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nova pasta..."
                className="flex-1 rounded-lg bg-[#f3f0ed]/5 px-3 py-2 text-xs text-[#f3f0ed] placeholder-[#f3f0ed]/20 outline-none border border-transparent focus:border-[#a2dd00]/30 transition-colors"
              />
              <button
                type="submit"
                disabled={!newName.trim()}
                className="rounded-lg bg-[#a2dd00]/10 px-3 py-2 text-[#a2dd00] hover:bg-[#a2dd00]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Skeleton grid ────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse">
      {Array.from({ length: PAGE_SIZE }).map((_, i) => (
        <div key={i} className="aspect-square rounded-xl bg-[#f3f0ed]/6" />
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f3f0ed]/5">
        <ImageIcon className="h-5 w-5 text-[#f3f0ed]/20" />
      </div>
      <p className="text-sm text-[#f3f0ed]/40">Nenhuma imagem gerada ainda.</p>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  onClick,
  active,
}: {
  icon: React.ElementType;
  label: string;
  value: number | undefined;
  loading: boolean;
  onClick?: () => void;
  active?: boolean;
}) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`flex flex-col gap-1 rounded-xl border px-2 py-2 text-left transition-colors ${active
        ? 'border-[#a2dd00]/30 bg-[#a2dd00]/8'
        : 'border-[#f3f0ed]/7 bg-[#f3f0ed]/3'
        } ${onClick ? 'cursor-pointer hover:border-[#a2dd00]/20 hover:bg-[#f3f0ed]/5' : ''}`}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="h-4 w-4 text-[#a2dd00]" />
        <span className="text-[9px] font-bold tracking-[0.15em] text-[#f3f0ed]/30 uppercase">
          {label}
        </span>
      </div>
      {loading ? (
        <div className="h-6 w-10 animate-pulse rounded-md bg-[#f3f0ed]/8" />
      ) : (
        <span className="text-lg font-bold text-[#f3f0ed]">{value ?? 0}</span>
      )}
    </Wrapper>
  );
}
