'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type UpscaleState = 'idle' | 'upscaling' | 'done';

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
  consumeCredits: (amount: number) => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeImages, setNodeImages] = useState<Record<string, string>>({});
  const [nodeUpscaleStates, setNodeUpscaleStates] = useState<Record<string, UpscaleState>>({});
  const [nodePanelTypes, setNodePanelTypes] = useState<Record<string, string>>({});
  const [credits, setCredits] = useState<number>(0);

  // Initialize credits on mount
  useEffect(() => {
    const randomValue = Math.floor(Math.random() * (500 - 50 + 1)) + 50;
    setCredits(randomValue);
  }, []);

  const consumeCredits = (amount: number) => {
    setCredits((prev) => Math.max(0, prev - amount));
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
        consumeCredits,
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
