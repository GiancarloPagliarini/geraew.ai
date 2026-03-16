'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { InfiniteData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth-context';
import { api, CreditsBalance, Generation, PaginatedResponse } from './api';

type UpscaleState = 'idle' | 'upscaling' | 'done';

export interface GalleryPickerRequest {
  nodeId: string;
  remaining: number;
  onSelect: (url: string) => void;
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

  const { data: creditsBalance, isLoading: creditsLoading, refetch: refetchCredits } = useQuery({
    queryKey: ['credits', 'balance'],
    queryFn: () => api.credits.balance(accessToken!),
    enabled: !!accessToken,
  });

  const credits = creditsBalance?.totalCreditsAvailable ?? 0;

  const prependToGallery = useCallback(
    (generation: Generation) => {
      queryClient.setQueryData<InfiniteData<PaginatedResponse<Generation>>>(
        ['gallery', 'list'],
        (old) => {
          if (!old?.pages.length) return old;
          const [firstPage, ...rest] = old.pages;
          return {
            ...old,
            pages: [
              {
                ...firstPage,
                data: [generation, ...firstPage.data],
                meta: { ...firstPage.meta, total: firstPage.meta.total + 1 },
              },
              ...rest,
            ],
          };
        },
      );
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
