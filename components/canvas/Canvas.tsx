'use client';

import '@xyflow/react/dist/style.css';

import {
  MiniMap,
  Node,
  NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import { AudioWaveform, ImageIcon, LayoutGrid, PersonStanding, Repeat2, Shirt, Video } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useEditor } from '@/lib/editor-context';
import { BottomToolbar } from '../editor/BottomToolbar';
import { CanvasContextMenu } from './CanvasContextMenu';
import { PanelNode } from './PanelNode';

// ─── node registry ───────────────────────────────────────────────────────────

const nodeTypes: NodeTypes = { panel: PanelNode };

const PANEL_NODE_STYLE = {
  background: 'transparent',
  border: 'none',
  padding: 0,
  borderRadius: 0,
  boxShadow: 'none',
  width: 'auto',
} as const;

const STORAGE_NODES_KEY = 'geraew-canvas-nodes';
const STORAGE_VIEWPORT_KEY = 'geraew-canvas-viewport';

function loadStoredNodes(): Node[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_NODES_KEY) : null;
    if (!raw) return [];
    return JSON.parse(raw) as Node[];
  } catch {
    return [];
  }
}

function loadStoredViewport(): { x: number; y: number; zoom: number } | null {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_VIEWPORT_KEY) : null;
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ─── inner canvas — lives inside ReactFlowProvider ───────────────────────────

function CanvasContent() {
  const [mounted, setMounted] = useState(false);
  const [initialStoredNodes] = useState<Node[]>(() => loadStoredNodes());
  const [nodes, setNodes, onNodesChange] = useNodesState(initialStoredNodes);
  const { zoomIn, zoomOut, setViewport, fitView, screenToFlowPosition, setCenter } = useReactFlow();
  const [zoom, setZoom] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mobile = window.innerWidth < 640;
    setIsMobile(mobile);
    setZoom(mobile ? 0.65 : 1);
  }, []);
  const { selectedNodeId, setSelectedNodeId, setNodePanelType, pendingPromptRef, generatingNodeIds } = useEditor();
  const viewportSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore nodePanelTypes and viewport on mount
  useEffect(() => {
    initialStoredNodes.forEach((node) => {
      if (node.data?.panelType) setNodePanelType(node.id, node.data.panelType as string);
    });
    const vp = loadStoredViewport();
    if (vp) {
      setViewport(vp);
    } else {
      setViewport({ x: 0, y: 0, zoom: window.innerWidth < 640 ? 0.65 : 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist nodes whenever they change
  useEffect(() => {
    const serializable = nodes.map(({ id, type, position, data, dragHandle, style }) => ({
      id, type, position, data, dragHandle, style,
    }));
    localStorage.setItem(STORAGE_NODES_KEY, JSON.stringify(serializable));
  }, [nodes]);

  const MAX_NODES = 10;
  const [showMaxNodesWarning, setShowMaxNodesWarning] = useState(false);

  const handleAddPanel = useCallback(
    (type: string) => {
      if (type !== 'generate-image' && type !== 'create-influencer' && type !== 'generate-video' && type !== 'motion-control' && type !== 'virtual-try-on' && type !== 'face-swap' && type !== 'generic') return;

      if (nodes.length >= MAX_NODES) {
        setShowMaxNodesWarning(false);
        requestAnimationFrame(() => setShowMaxNodesWarning(true));
        return;
      }

      const NODE_W = 360;
      const NODE_H = 480;
      const GAP = 24;

      const baseScreen = { x: window.innerWidth / 2 - NODE_W / 2, y: 80 };
      let candidate = screenToFlowPosition(baseScreen);

      // Shift horizontally until the candidate doesn't overlap any existing node
      const MAX_ATTEMPTS = 30;
      for (let attempts = 0; attempts < MAX_ATTEMPTS; attempts++) {
        const overlaps = nodes.some((n) => {
          const dx = Math.abs(n.position.x - candidate.x);
          const dy = Math.abs(n.position.y - candidate.y);
          return dx < NODE_W * 0.9 && dy < NODE_H * 0.9;
        });
        if (!overlaps) break;
        candidate = { x: candidate.x + NODE_W + GAP, y: candidate.y };
      }

      const id = `${type}-${Date.now()}`;
      const newNode: Node = {
        id,
        type: 'panel',
        position: candidate,
        data: { panelType: type },
        dragHandle: '.panel-drag-handle',
        style: PANEL_NODE_STYLE,
      };

      setNodes((nds) => [...nds, newNode]);
      setNodePanelType(id, type);
      if (type === 'create-influencer') {
        setSelectedNodeId(id);
      }
    },
    [nodes, screenToFlowPosition, setNodes, setNodePanelType, setSelectedNodeId]
  );

  // When a pending prompt is requested (from PromptsDialog), create the panel
  useEffect(() => {
    if (pendingPromptRef.current) {
      handleAddPanel(pendingPromptRef.current.panelType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPromptRef.current]);

  const handleDelete = useCallback(() => {
    let blocked = false;
    setNodes((nds) => {
      const selected = nds.filter((n) => n.selected);
      if (selected.length > 0) {
        if (selected.some((n) => generatingNodeIds.has(n.id))) blocked = true;
        const deletable = selected.filter((n) => !generatingNodeIds.has(n.id));
        if (deletable.length > 0) return nds.filter((n) => !n.selected || generatingNodeIds.has(n.id));
        return nds;
      }
      if (selectedNodeId) {
        if (generatingNodeIds.has(selectedNodeId)) { blocked = true; return nds; }
        return nds.filter((n) => n.id !== selectedNodeId);
      }
      return nds;
    });
    if (blocked) toast.warning('Aguarde a geração finalizar antes de fechar o painel.');
    setSelectedNodeId(null);
  }, [selectedNodeId, setNodes, setSelectedNodeId, generatingNodeIds]);

  // Delete/Backspace deletes selected nodes
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      handleDelete();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleDelete]);

  return (
    <>
      {/* Rubber-band selection colours */}
      <style>{`
        .react-flow__selection {
          background: rgba(162, 221, 0, 0.08) !important;
          border: 1.5px solid rgba(162, 221, 0, 0.5) !important;
        }
        .react-flow__nodesselection-rect {
          background: rgba(162, 221, 0, 0.08) !important;
          border: 1.5px solid rgba(162, 221, 0, 0.5) !important;
        }
        @keyframes toast-in-out {
          0%   { opacity: 0; transform: translateX(-50%) translateY(-16px); }
          12%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          80%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-8px); }
        }
        .toast-animate {
          animation: toast-in-out 3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes panel-enter {
          0%   { opacity: 0; transform: scale(0.92) translateY(12px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .panel-enter-animate {
          animation: panel-enter 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes empty-card-in {
          0%   { opacity: 0; transform: translateY(20px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .empty-card-animate {
          opacity: 0;
          animation: empty-card-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes empty-header-in {
          0%   { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .empty-header-animate {
          opacity: 0;
          animation: empty-header-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <CanvasContextMenu onAddPanel={handleAddPanel}>
        <div className="h-full w-full" style={{ cursor: isSelectMode ? 'default' : 'grab' }}>
          <ReactFlow
            nodes={nodes}
            edges={[]}
            onNodesChange={onNodesChange}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            onViewportChange={(vp) => {
              setZoom(vp.zoom);
              if (viewportSaveTimer.current) clearTimeout(viewportSaveTimer.current);
              viewportSaveTimer.current = setTimeout(() => {
                localStorage.setItem(STORAGE_VIEWPORT_KEY, JSON.stringify(vp));
              }, 500);
            }}
            panOnDrag={isSelectMode ? [1] : true}
            selectionOnDrag={isSelectMode}
            selectionMode={SelectionMode.Partial}
            multiSelectionKeyCode="Shift"
            panOnScroll
            zoomOnPinch
            preventScrolling
            minZoom={0.05}
            maxZoom={8}
            nodesConnectable={false}
            nodesFocusable={false}
            proOptions={{ hideAttribution: true }}
            style={{ width: '100%', height: '100%', background: '#1a2123' }}
          >
            {isMobile && nodes.length > 0 && (
              <MiniMap
                position="bottom-left"
                style={{
                  background: '#1e2a2d',
                  border: '1px solid rgba(243,240,237,0.08)',
                  borderRadius: '10px',
                  width: 120,
                  height: 80,
                }}
                maskColor="rgba(26,33,35,0.7)"
                nodeColor="#a2dd00"
                nodeStrokeWidth={3}
                onNodeClick={(_, node) =>
                  setCenter(
                    node.position.x + (node.measured?.width ?? 180) / 2,
                    node.position.y + (node.measured?.height ?? 240) / 2,
                    { duration: 300, zoom: 1 },
                  )
                }
              />
            )}
          </ReactFlow>
        </div>
      </CanvasContextMenu>

      {showMaxNodesWarning && (
        <div
          className="toast-animate pointer-events-none absolute left-1/2 top-6 z-50"
          onAnimationEnd={() => setShowMaxNodesWarning(false)}
        >
          <div className="flex items-center gap-3 rounded-xl border border-[#a2dd00]/40 bg-[#1a2123]/95 px-5 py-3 shadow-[0_0_24px_rgba(162,221,0,0.12)] backdrop-blur-md">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#a2dd00]/10 ring-1 ring-[#a2dd00]/30">
              <LayoutGrid className="h-4 w-4 text-[#a2dd00]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-widest text-[#a2dd00]">Limite atingido</span>
              <span className="text-sm text-[#f3f0ed]/70">Máximo de {MAX_NODES} painéis abertos simultaneamente.</span>
            </div>
          </div>
        </div>
      )}

      <BottomToolbar
        zoom={zoom}
        isSelectMode={isSelectMode}
        onToggleSelectMode={() => setIsSelectMode((v) => !v)}
        onZoomIn={() => zoomIn({ duration: 250 })}
        onZoomOut={() => zoomOut({ duration: 250 })}
        onResetZoom={() => {
          setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 });
          setZoom(1);
        }}
        onAdd={() => handleAddPanel('generic')}
        onAddImage={() => handleAddPanel('generate-image')}
        onAddInfluencer={() => handleAddPanel('create-influencer')}
        onAddVideo={() => handleAddPanel('generate-video')}
        onAddMotionControl={() => handleAddPanel('motion-control')}
        onAddVirtualTryOn={() => handleAddPanel('virtual-try-on')}
        onAddFaceSwap={() => handleAddPanel('face-swap')}
        onDelete={handleDelete}
        onFitView={() => fitView({ duration: 300, padding: 0.2 })}
      />

      {/* Empty state */}
      {mounted && nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
          <div className="pointer-events-auto flex w-full flex-col items-center gap-6 px-5 sm:w-auto sm:px-0">
            <Image
              src="/logo_2.svg"
              alt="Geraew AI"
              width={64}
              height={64}
              className="empty-header-animate rounded-md"
              style={{ animationDelay: '0.1s' }}
            />
            <div className="empty-header-animate text-center" style={{ animationDelay: '0.25s' }}>
              <h2 className="text-md font-semibold text-[#f3f0ed]">Tudo pronto!</h2>
              <p className="mt-1 text-sm text-[#f3f0ed]/35">
                Escolha o que você deseja criar
              </p>
            </div>
            <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:items-center sm:justify-center sm:gap-4">
              {[
                { type: 'generate-image', icon: ImageIcon, label: 'Gerar imagem' },
                { type: 'create-influencer', icon: PersonStanding, label: 'Criar influencer' },
                { type: 'generate-video', icon: Video, label: 'Gerar vídeo' },
                { type: 'motion-control', icon: AudioWaveform, label: 'Copiar movimentos' },
                { type: 'virtual-try-on', icon: Shirt, label: 'Provador Virtual' },
                { type: 'face-swap', icon: Repeat2, label: 'Troca de Rosto' },
              ].map((item, i) => (
                <button
                  key={item.type}
                  onClick={() => handleAddPanel(item.type)}
                  className="empty-card-animate group flex h-36 flex-col items-center justify-center gap-3 rounded-2xl border border-[#f3f0ed]/[0.08] bg-[#1e494b]/20 transition-all hover:border-[#a2dd00]/30 hover:bg-[#1e494b]/40 active:scale-95 sm:h-40 sm:w-40 sm:gap-4"
                  style={{ animationDelay: `${0.35 + i * 0.08}s` }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#f3f0ed]/[0.08] bg-[#1e494b]/30 transition-all group-hover:border-[#a2dd00]/30 group-hover:bg-[#a2dd00]/10 sm:h-12 sm:w-12">
                    <item.icon className="h-5 w-5 text-[#f3f0ed]/50 transition-colors group-hover:text-[#a2dd00] sm:h-6 sm:w-6" />
                  </div>
                  <span className="text-xs font-medium text-[#f3f0ed]/90 sm:text-sm">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )
      }
    </>
  );
}

// ─── public component ────────────────────────────────────────────────────────

export function Canvas() {
  return (
    <div className="relative flex-1 overflow-hidden">
      <ReactFlowProvider>
        <CanvasContent />
      </ReactFlowProvider>
    </div>
  );
}
