'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { InfiniteData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth-context';
import { api, CreditsBalance, Generation, GalleryItem, PaginatedResponse } from './api';

type UpscaleState = 'idle' | 'upscaling' | 'done';

export interface GalleryPickerRequest {
  nodeId: string;
  remaining: number;
  onSelect: (url: string) => void;
}

export interface PendingPrompt {
  panelType: 'generate-image' | 'generate-video';
  prompt: string;
}

interface EditorContextValue {
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  nodeImages: Record<string, string>;
  setNodeImage: (nodeId: string, imageUrl: string) => void;
  nodeUpscaleStates: Record<string, UpscaleState>;
  setNodeUpscaleState: (nodeId: string, state: UpscaleState) => void;
  nodePanelTypes: Record<string, string>;
  setNodePanelType: (nodeId: string, panelType: string) => void;
  credits: number;
  creditsBalance: CreditsBalance | undefined;
  creditsLoading: boolean;
  consumeCredits: (amount: number) => void;
  refetchCredits: () => void;
  prependToGallery: (generation: Generation) => void;
  galleryPickerRequest: GalleryPickerRequest | null;
  openGalleryPicker: (req: GalleryPickerRequest) => void;
  closeGalleryPicker: () => void;
  pendingPromptRef: React.RefObject<PendingPrompt | null>;
  requestPanelWithPrompt: (req: PendingPrompt) => void;
  consumePendingPrompt: () => PendingPrompt | null;
  leftPanelOpen: boolean;
  setLeftPanelOpen: (open: boolean) => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeImages, setNodeImages] = useState<Record<string, string>>({});
  const [nodeUpscaleStates, setNodeUpscaleStates] = useState<Record<string, UpscaleState>>({});
  const [nodePanelTypes, setNodePanelTypes] = useState<Record<string, string>>({});
  const [galleryPickerRequest, setGalleryPickerRequest] = useState<GalleryPickerRequest | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const pendingPromptRef = useRef<PendingPrompt | null>(null);
  const [, forceUpdate] = useState(0);

  const { data: creditsBalance, isLoading: creditsLoading, refetch: refetchCredits } = useQuery({
    queryKey: ['credits', 'balance'],
    queryFn: () => api.credits.balance(accessToken!),
    enabled: !!accessToken,
  });

  const credits = creditsBalance?.totalCreditsAvailable ?? 0;

  const prependToGallery = useCallback(
    (generation: Generation) => {
      // Convert full Generation to lightweight GalleryItem for cache
      const galleryItem: GalleryItem = {
        id: generation.id,
        type: generation.type,
        status: generation.status,
        prompt: generation.prompt,
        resolution: generation.resolution,
        durationSeconds: generation.durationSeconds,
        hasAudio: generation.hasAudio,
        hasWatermark: generation.hasWatermark,
        creditsConsumed: generation.creditsConsumed,
        isFavorited: generation.isFavorited,
        thumbnailUrl: generation.outputs?.[0]?.thumbnailUrl,
        outputUrl: generation.outputs?.[0]?.url,
        outputCount: generation.outputs?.length ?? 0,
        folder: generation.folder,
        createdAt: generation.createdAt,
        completedAt: generation.completedAt,
      };

      // Update every cached gallery list variant (each tab / folder has its own key)
      const keys = queryClient
        .getQueryCache()
        .findAll({ queryKey: ['gallery', 'list'] })
        .map((q) => q.queryKey);

      for (const key of keys) {
        queryClient.setQueryData<InfiniteData<PaginatedResponse<GalleryItem>>>(key, (old) => {
          if (!old?.pages.length) return old;
          const [firstPage, ...rest] = old.pages;
          return {
            ...old,
            pages: [
              {
                ...firstPage,
                data: [galleryItem, ...firstPage.data],
                meta: { ...firstPage.meta, total: firstPage.meta.total + 1 },
              },
              ...rest,
            ],
          };
        });
      }

      queryClient.invalidateQueries({ queryKey: ['gallery', 'stats'] });
    },
    [queryClient],
  );

  const consumeCredits = (amount: number) => {
    // Optimistic update on the cache
    queryClient.setQueryData<CreditsBalance>(['credits', 'balance'], (old) => {
      if (!old) return old;
      return {
        ...old,
        totalCreditsAvailable: Math.max(0, old.totalCreditsAvailable - amount),
        planCreditsUsed: old.planCreditsUsed + amount,
        planCreditsRemaining: Math.max(0, old.planCreditsRemaining - amount),
      };
    });
    // Refetch to sync with server
    refetchCredits();
  };

  return (
    <EditorContext.Provider
      value={{
        selectedNodeId,
        setSelectedNodeId,
        nodeImages,
        setNodeImage: (nodeId, url) =>
          setNodeImages((prev) => ({ ...prev, [nodeId]: url })),
        nodeUpscaleStates,
        setNodeUpscaleState: (nodeId, state) =>
          setNodeUpscaleStates((prev) => ({ ...prev, [nodeId]: state })),
        nodePanelTypes,
        setNodePanelType: (nodeId, panelType) =>
          setNodePanelTypes((prev) => ({ ...prev, [nodeId]: panelType })),
        credits,
        creditsBalance,
        creditsLoading,
        consumeCredits,
        refetchCredits,
        prependToGallery,
        galleryPickerRequest,
        openGalleryPicker: setGalleryPickerRequest,
        closeGalleryPicker: () => setGalleryPickerRequest(null),
        leftPanelOpen,
        setLeftPanelOpen,
        pendingPromptRef,
        requestPanelWithPrompt: (req: PendingPrompt) => {
          pendingPromptRef.current = req;
          forceUpdate((n) => n + 1);
        },
        consumePendingPrompt: () => {
          const current = pendingPromptRef.current;
          pendingPromptRef.current = null;
          return current;
        },
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used within EditorProvider');
  return ctx;
}
