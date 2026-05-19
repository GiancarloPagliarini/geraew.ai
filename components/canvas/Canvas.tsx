'use client';

import '@xyflow/react/dist/style.css';

import {
  Background,
  BackgroundVariant,
  Edge,
  MiniMap,
  Node,
  NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import { IMAGE_OUTPUT_TARGETS, TEXT_OUTPUT_TARGETS, getOptionsForSource, getTargetHandleForSource } from './connection-options';
import { ChevronDown, ChevronRight, LayoutGrid, Map } from 'lucide-react';
import { PANEL_GROUPS } from '@/lib/panel-groups';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
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
const STORAGE_EDGES_KEY = 'geraew-canvas-edges';
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

function loadStoredEdges(): Edge[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_EDGES_KEY) : null;
    if (!raw) return [];
    return JSON.parse(raw) as Edge[];
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
  const t = useTranslations('editor.canvas');
  const [mounted, setMounted] = useState(false);
  const [initialStoredNodes] = useState<Node[]>(() => loadStoredNodes());
  const [initialStoredEdges] = useState<Edge[]>(() => loadStoredEdges());
  const [nodes, setNodes, onNodesChange] = useNodesState(initialStoredNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialStoredEdges);
  const [connectMenu, setConnectMenu] = useState<{
    x: number;
    y: number;
    flowX: number;
    flowY: number;
    sourceNodeId: string;
    sourceHandle: string | null;
  } | null>(null);
  const [connectMenuQuery, setConnectMenuQuery] = useState('');
  const { zoomIn, zoomOut, setViewport, fitView, screenToFlowPosition, setCenter, getViewport } = useReactFlow();
  const [zoom, setZoom] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [minimapOpen, setMinimapOpen] = useState(false);
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const mobile = window.innerWidth < 640;
    setIsMobile(mobile);
    setZoom(mobile ? 0.65 : 1);
  }, []);
  const { selectedNodeId, setSelectedNodeId, setNodePanelType, pendingPromptRef, pendingPanelImageRef, pendingAvatarVideoFormRef, generatingNodeIds, studioMode, setImageConnections, setTextConnections, registerAddPanelHandler } = useEditor();
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

  // Persist edges + sync into editor context (so panels can read incoming connections)
  useEffect(() => {
    localStorage.setItem(STORAGE_EDGES_KEY, JSON.stringify(edges));
    const imgMap: Record<string, string> = {};
    const txtMap: Record<string, string> = {};
    for (const e of edges) {
      if (!e.target || !e.source) continue;
      const handle = e.targetHandle ?? null;
      if (handle === 'image-in') imgMap[e.target] = e.source;
      else if (handle === 'text-in') txtMap[e.target] = e.source;
    }
    setImageConnections(imgMap);
    setTextConnections(txtMap);
  }, [edges, setImageConnections, setTextConnections]);

  const MAX_NODES = 10;
  const [showMaxNodesWarning, setShowMaxNodesWarning] = useState(false);

  const handleAddPanel = useCallback(
    (type: string) => {
      if (type !== 'generate-image' && type !== 'create-influencer' && type !== 'generate-video' && type !== 'motion-control' && type !== 'virtual-try-on' && type !== 'face-swap' && type !== 'upscale' && type !== 'generate-audio' && type !== 'generic' && type !== 'image-source' && type !== 'prompt-source' && type !== 'avatar-video-form') return;

      if (nodes.length >= MAX_NODES) {
        setShowMaxNodesWarning(false);
        requestAnimationFrame(() => setShowMaxNodesWarning(true));
        return;
      }

      const isMobileDevice = window.innerWidth < 640;
      const NODE_W_screen = isMobileDevice ? window.innerWidth - 80 : 320;
      const NODE_H_screen = 550;
      const GAP = 24;

      const flowEl = document.querySelector('.react-flow');
      const rect = flowEl?.getBoundingClientRect() ?? { width: window.innerWidth, height: window.innerHeight };
      const vp = getViewport();
      const toolbarH = isMobileDevice ? 56 : 0;
      const flowCenterX = (rect.width / 2 - vp.x) / vp.zoom;
      const flowCenterY = ((rect.height + toolbarH) / 2 - vp.y) / vp.zoom;
      const NODE_W = NODE_W_screen / vp.zoom;
      const NODE_H = NODE_H_screen / vp.zoom;

      let candidate = { x: flowCenterX - NODE_W / 2, y: flowCenterY - NODE_H / 2 };

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

  const handleConnect = useCallback(
    (params: { source: string | null; target: string | null; sourceHandle?: string | null; targetHandle?: string | null }) => {
      if (!params.source || !params.target) return;
      const connection = {
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle ?? null,
        targetHandle: params.targetHandle ?? null,
      };
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: `${params.source}-${params.target}-${Date.now()}`,
            animated: true,
            style: { stroke: '#a2dd00', strokeWidth: 2 },
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  const handleConnectEnd = useCallback(
    (event: unknown, connectionState: unknown) => {
      const cs = connectionState as { isValid: boolean; fromNode: { id: string } | null; fromHandle: { id: string | null } | null };
      if (cs.isValid) return;
      if (!cs.fromNode) return;
      const ev = event as MouseEvent | TouchEvent;
      const { clientX, clientY } =
        'changedTouches' in ev ? ev.changedTouches[0] : (ev as MouseEvent);
      const sourceHandle = cs.fromHandle?.id ?? null;
      const targetHandle = getTargetHandleForSource(sourceHandle);

      // If drop landed on a node, try to auto-route to its compatible handle.
      const dropEl = typeof document !== 'undefined' ? document.elementFromPoint(clientX, clientY) : null;
      const nodeEl = (dropEl as Element | null)?.closest('.react-flow__node');
      const targetNodeId = nodeEl?.getAttribute('data-id') ?? null;
      if (targetHandle && targetNodeId && targetNodeId !== cs.fromNode.id) {
        const compatiblePanels = sourceHandle === 'text-out'
          ? new Set(TEXT_OUTPUT_TARGETS.map((o) => o.panelType))
          : new Set(IMAGE_OUTPUT_TARGETS.map((o) => o.panelType));
        const targetNode = nodes.find((n) => n.id === targetNodeId);
        const targetPanelType = (targetNode?.data as { panelType?: string } | undefined)?.panelType;
        if (targetPanelType && compatiblePanels.has(targetPanelType)) {
          setEdges((eds) =>
            addEdge(
              {
                id: `${cs.fromNode!.id}-${targetNodeId}-${Date.now()}`,
                source: cs.fromNode!.id,
                target: targetNodeId,
                sourceHandle,
                targetHandle,
                animated: true,
                style: { stroke: '#a2dd00', strokeWidth: 2 },
              },
              eds,
            ),
          );
          return;
        }
      }

      const flowPos = screenToFlowPosition({ x: clientX, y: clientY });
      setConnectMenu({
        x: clientX,
        y: clientY,
        flowX: flowPos.x,
        flowY: flowPos.y,
        sourceNodeId: cs.fromNode.id,
        sourceHandle,
      });
      setConnectMenuQuery('');
    },
    [screenToFlowPosition, nodes, setEdges],
  );

  const handleConnectMenuSelect = useCallback(
    (panelType: string) => {
      if (!connectMenu) return;
      if (nodes.length >= MAX_NODES) {
        setShowMaxNodesWarning(false);
        requestAnimationFrame(() => setShowMaxNodesWarning(true));
        setConnectMenu(null);
        return;
      }
      const newId = `${panelType}-${Date.now()}`;
      const newNode: Node = {
        id: newId,
        type: 'panel',
        position: { x: connectMenu.flowX, y: connectMenu.flowY - 40 },
        data: { panelType },
        dragHandle: '.panel-drag-handle',
        style: PANEL_NODE_STYLE,
      };
      setNodes((nds) => [...nds, newNode]);
      setNodePanelType(newId, panelType);
      const targetHandle = getTargetHandleForSource(connectMenu.sourceHandle) ?? 'image-in';
      setEdges((eds) =>
        addEdge(
          {
            id: `${connectMenu.sourceNodeId}-${newId}-${Date.now()}`,
            source: connectMenu.sourceNodeId,
            target: newId,
            sourceHandle: connectMenu.sourceHandle,
            targetHandle,
            animated: true,
            style: { stroke: '#a2dd00', strokeWidth: 2 },
          },
          eds,
        ),
      );
      setConnectMenu(null);
    },
    [connectMenu, nodes.length, setNodes, setNodePanelType, setEdges],
  );

  // Close connect menu on Escape or outside click
  useEffect(() => {
    if (!connectMenu) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setConnectMenu(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [connectMenu]);

  // Expose handleAddPanel to other UI (sidebar, etc.) via context
  useEffect(() => {
    registerAddPanelHandler(handleAddPanel);
    return () => registerAddPanelHandler(null);
  }, [handleAddPanel, registerAddPanelHandler]);

  // When a pending prompt is requested (from PromptsDialog), create the panel
  const lastPendingPromptRef = useRef<unknown>(null);
  useEffect(() => {
    const pending = pendingPromptRef.current;
    if (!pending) return;
    if (lastPendingPromptRef.current === pending) return;
    lastPendingPromptRef.current = pending;
    handleAddPanel(pending.panelType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPromptRef.current]);

  // When a pending panel image is requested (from TrendingProductsDialog), create the panel
  const lastPendingImageRef = useRef<unknown>(null);
  useEffect(() => {
    const pending = pendingPanelImageRef.current;
    if (!pending) return;
    if (lastPendingImageRef.current === pending) return;
    lastPendingImageRef.current = pending;
    handleAddPanel(pending.panelType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPanelImageRef.current]);

  // When the user clicks "Gerar vídeo" on an avatar card, spawn the form panel
  // (the form lives as an `avatar-video-form` panel on the canvas). The same
  // panel shows the GenerationPreview after submit — no separate preview panel.
  const lastPendingAvatarVideoFormRef = useRef<unknown>(null);
  useEffect(() => {
    const pending = pendingAvatarVideoFormRef.current;
    if (!pending) return;
    if (lastPendingAvatarVideoFormRef.current === pending) return;
    lastPendingAvatarVideoFormRef.current = pending;
    handleAddPanel('avatar-video-form');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAvatarVideoFormRef.current]);

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
    if (blocked) toast.warning(t('waitBeforeClose'));
    setSelectedNodeId(null);
  }, [selectedNodeId, setNodes, setSelectedNodeId, generatingNodeIds, t]);

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
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onConnectEnd={handleConnectEnd}
            isValidConnection={(c) => getTargetHandleForSource(c.sourceHandle) === c.targetHandle}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => { setSelectedNodeId(null); setConnectMenu(null); }}
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
            nodesConnectable={studioMode}
            nodesFocusable={false}
            proOptions={{ hideAttribution: true }}
            style={{ width: '100%', height: '100%', background: studioMode ? '#0d1011' : '#1a2123' }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1.5}
              color={studioMode ? 'rgba(243, 240, 237, 0.18)' : 'rgba(243, 240, 237, 0.12)'}
            />
            {isMobile && nodes.length > 0 && minimapOpen && (
              <div onClick={() => setMinimapOpen(false)}>
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
              </div>
            )}
          </ReactFlow>
        </div>
      </CanvasContextMenu>

      {isMobile && nodes.length > 0 && !minimapOpen && (
        <button
          onClick={() => setMinimapOpen((v) => !v)}
          className={`pointer-events-auto absolute bottom-5 left-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-[#a2dd00]/40 bg-[#1a2123]/90 shadow-[0_0_20px_rgba(162,221,0,0.25)] backdrop-blur-md transition-all sm:hidden ${minimapOpen ? 'border-[#a2dd00]/70 bg-[#a2dd00]/10' : ''}`}
        >
          <Map className="h-4 w-4 text-[#f3f0ed]/60" />
        </button>
      )}

      {connectMenu && (() => {
        const sourceOptions = getOptionsForSource(connectMenu.sourceHandle);
        const filteredOptions = sourceOptions.filter((opt) =>
          opt.label.toLowerCase().includes(connectMenuQuery.toLowerCase()),
        );
        return (
          <div
            className="absolute z-[100] w-56 overflow-hidden rounded-xl bg-[#1a2123]/95 shadow-2xl backdrop-blur-md"
            style={{ left: connectMenu.x, top: connectMenu.y }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-2.5 py-2">
              <input
                autoFocus
                value={connectMenuQuery}
                onChange={(e) => setConnectMenuQuery(e.target.value)}
                placeholder="Buscar..."
                className="h-7 w-full rounded-lg bg-[#f3f0ed]/[0.04] px-2.5 text-[12px] text-[#f3f0ed]/85 placeholder-[#f3f0ed]/30 outline-none"
              />
            </div>
            <div className="max-h-72 overflow-y-auto py-1">
              {filteredOptions.length === 0 ? (
                <p className="px-3 py-2 text-[11px] text-[#f3f0ed]/40">Nada encontrado</p>
              ) : (
                filteredOptions.map(({ panelType, label, icon: Icon }) => (
                  <button
                    key={panelType}
                    type="button"
                    onClick={() => handleConnectMenuSelect(panelType)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[#f3f0ed]/[0.04]"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#a2dd00]/10 text-[#a2dd00]">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[12px] font-medium text-[#f3f0ed]/85">{label}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        );
      })()}

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
              <span className="text-xs font-semibold uppercase tracking-widest text-[#a2dd00]">{t('maxNodesTitle')}</span>
              <span className="text-sm text-[#f3f0ed]/70">{t('maxNodesMessage', { count: MAX_NODES })}</span>
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
        onAddPanel={handleAddPanel}
        onDelete={handleDelete}
        onFitView={() => fitView({ duration: 300, padding: 0.2 })}
      />

      {/* Empty state */}
      {mounted && nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
          <div className="pointer-events-auto flex w-full flex-col items-center gap-3 px-5 sm:w-auto sm:gap-6 sm:px-0">
            <div className="animate-pulse">
              <Image
                src="/logo_2.svg"
                alt="Geraew AI"
                width={64}
                height={64}
                className="empty-header-animate"
                style={{ animationDelay: '0.1s' }}
              />
            </div>
            <div className="empty-header-animate text-center" style={{ animationDelay: '0.25s' }}>
              <h2 className="text-md font-semibold text-[#f3f0ed]">{t('emptyTitle')}</h2>
              <p className="mt-1 text-sm text-[#f3f0ed]/35">
                {t('emptySubtitle')}
              </p>
            </div>
            <div className="relative w-full sm:w-auto">
              {/* Ambient backdrop — gives the glass something to refract */}
              <div className="pointer-events-none absolute inset-0 -z-10 overflow-visible">
                <div className="absolute -left-10 top-[5%] h-56 w-56 rounded-full bg-[#a2dd00]/[0.10] blur-[90px]" />
                <div className="absolute -right-10 bottom-[5%] h-56 w-56 rounded-full bg-[#1e494b]/55 blur-[90px]" />
                <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#a2dd00]/[0.05] blur-[70px]" />
              </div>

              <div className="grid w-full grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
              {PANEL_GROUPS.map((group, gi) => {
                const GroupIcon = group.icon;
                const groupLabel = t(`groups.${group.id}`);
                const animDelay = `${0.35 + gi * 0.08}s`;
                const cardClass = "empty-card-animate group/card flex flex-col rounded-xl border border-white/[0.08] bg-white/[0.045] p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.09),0_10px_30px_-12px_rgba(0,0,0,0.55)] backdrop-blur-2xl backdrop-saturate-150 transition-[background-color,border-color,box-shadow] duration-200 hover:border-[#a2dd00]/40 hover:bg-[#a2dd00]/[0.045] hover:shadow-[inset_0_1px_0_0_rgba(162,221,0,0.18),0_0_18px_-4px_rgba(162,221,0,0.12),0_10px_30px_-12px_rgba(0,0,0,0.55)] data-[state=open]:border-[#a2dd00]/40 data-[state=open]:bg-[#a2dd00]/[0.045] sm:w-52 sm:p-4";

                const headerInner = (
                  <>
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#a2dd00]/[0.10] ring-1 ring-inset ring-[#a2dd00]/[0.18] transition-colors group-hover/card:bg-[#a2dd00]/[0.18] group-hover/card:ring-[#a2dd00]/[0.32] group-data-[state=open]/card:bg-[#a2dd00]/[0.18] group-data-[state=open]/card:ring-[#a2dd00]/[0.32]">
                      <GroupIcon className="h-3.5 w-3.5 text-[#a2dd00]" />
                    </div>
                    <span className="flex-1 text-left text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#f3f0ed]/65 transition-colors group-hover/card:text-[#f3f0ed]/85 group-data-[state=open]/card:text-[#f3f0ed]/85">
                      {groupLabel}
                    </span>
                  </>
                );

                // Mobile single-panel: button that creates the panel directly
                if (isMobile && group.panels.length === 1) {
                  const only = group.panels[0];
                  if (only.comingSoon) {
                    return (
                      <div
                        key={group.id}
                        className={`${cardClass} opacity-60 hover:border-white/[0.08] hover:bg-white/[0.045]`}
                        style={{ animationDelay: animDelay }}
                      >
                        <div className="flex w-full items-center gap-2.5">
                          {headerInner}
                          <span className="rounded-full bg-[#a2dd00]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#a2dd00]">
                            {t('comingSoon')}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <button
                      key={group.id}
                      onClick={() => handleAddPanel(only.type)}
                      className={cardClass}
                      style={{ animationDelay: animDelay }}
                    >
                      <div className="flex w-full items-center gap-2.5">
                        {headerInner}
                        {only.isNew ? (
                          <span className="rounded-full bg-[#a2dd00]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#a2dd00]">
                            {t('newBadge')}
                          </span>
                        ) : null}
                        <ChevronRight className="h-3.5 w-3.5 text-[#f3f0ed]/40 transition-transform group-hover/card:translate-x-0.5" />
                      </div>
                    </button>
                  );
                }

                // Mobile multi-panel: card opens a dropdown with the options
                if (isMobile) {
                  return (
                    <DropdownMenu
                      key={group.id}
                      open={openCardId === group.id}
                      onOpenChange={(open) => setOpenCardId(open ? group.id : null)}
                      modal={false}
                    >
                      <DropdownMenuTrigger asChild>
                        <button
                          className={cardClass}
                          style={{ animationDelay: animDelay }}
                          aria-label={groupLabel}
                        >
                          <div className="flex w-full items-center gap-2.5">
                            {headerInner}
                            <ChevronDown className="h-3.5 w-3.5 text-[#f3f0ed]/40 transition-transform duration-200 group-data-[state=open]/card:rotate-180" />
                          </div>
                        </button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent
                        side="bottom"
                        align="center"
                        sideOffset={8}
                        className="min-w-[12rem] overflow-hidden rounded-xl border border-white/[0.08] bg-[#1a2123]/85 p-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_10px_30px_-12px_rgba(0,0,0,0.55)] backdrop-blur-2xl backdrop-saturate-150"
                      >
                        {group.panels.map((panel) => {
                          const Icon = panel.icon;
                          const isComingSoon = panel.comingSoon;
                          const isNew = panel.isNew;
                          return (
                            <DropdownMenuItem
                              key={panel.type}
                              disabled={isComingSoon}
                              onSelect={(e) => {
                                if (isComingSoon) {
                                  e.preventDefault();
                                  return;
                                }
                                handleAddPanel(panel.type);
                              }}
                              className={`group/item flex items-center gap-2.5 rounded-md px-2 py-1.5 outline-none transition-colors ${
                                isComingSoon
                                  ? 'opacity-50'
                                  : 'cursor-pointer data-[highlighted]:bg-[#f3f0ed]/[0.045]'
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5 shrink-0 text-[#f3f0ed]/45 transition-colors group-data-[highlighted]/item:text-[#a2dd00]" />
                              <span className="flex-1 truncate text-[12.5px] font-medium text-[#f3f0ed]/85 transition-colors group-data-[highlighted]/item:text-[#f3f0ed]">
                                {t(`actions.${panel.actionKey}`)}
                              </span>
                              {isComingSoon ? (
                                <span className="rounded-full bg-[#a2dd00]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#a2dd00]">
                                  {t('comingSoon')}
                                </span>
                              ) : isNew ? (
                                <span className="rounded-full bg-[#a2dd00]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#a2dd00]">
                                  {t('newBadge')}
                                </span>
                              ) : (
                                <ChevronRight className="h-3 w-3 shrink-0 text-[#f3f0ed]/0 transition-all group-data-[highlighted]/item:translate-x-0.5 group-data-[highlighted]/item:text-[#a2dd00]/70" />
                              )}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                }

                // Desktop: inline card with header + body
                return (
                  <div
                    key={group.id}
                    className={cardClass}
                    style={{ animationDelay: animDelay }}
                  >
                    <div className="flex items-center gap-2.5 pb-3">
                      {headerInner}
                    </div>

                    <div className="-mx-1 flex flex-col">
                      {group.panels.map((panel) => {
                        const Icon = panel.icon;
                        const isComingSoon = panel.comingSoon;
                        if (isComingSoon) {
                          return (
                            <div
                              key={panel.type}
                              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left opacity-50"
                            >
                              <Icon className="h-3.5 w-3.5 shrink-0 text-[#f3f0ed]/45" />
                              <span className="flex-1 truncate text-[12.5px] font-medium text-[#f3f0ed]/85">
                                {t(`actions.${panel.actionKey}`)}
                              </span>
                              <span className="rounded-full bg-[#a2dd00]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#a2dd00]">
                                {t('comingSoon')}
                              </span>
                            </div>
                          );
                        }
                        return (
                          <button
                            key={panel.type}
                            onClick={() => handleAddPanel(panel.type)}
                            className="group/btn flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-[#f3f0ed]/[0.045] active:bg-[#f3f0ed]/[0.06]"
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0 text-[#f3f0ed]/45 transition-colors group-hover/btn:text-[#a2dd00]" />
                            <span className="flex-1 truncate text-[12.5px] font-medium text-[#f3f0ed]/85 transition-colors group-hover/btn:text-[#f3f0ed]">
                              {t(`actions.${panel.actionKey}`)}
                            </span>
                            {panel.isNew ? (
                              <span className="rounded-full bg-[#a2dd00]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#a2dd00]">
                                {t('newBadge')}
                              </span>
                            ) : (
                              <ChevronRight className="h-3 w-3 shrink-0 text-[#f3f0ed]/0 transition-all group-hover/btn:translate-x-0.5 group-hover/btn:text-[#a2dd00]/70" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              </div>
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
