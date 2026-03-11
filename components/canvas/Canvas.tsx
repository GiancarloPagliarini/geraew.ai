'use client';

import '@xyflow/react/dist/style.css';

import {
  Node,
  NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import { ImageIcon, PersonStanding, Video } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
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

const initialNodes: Node[] = [];

// ─── inner canvas — lives inside ReactFlowProvider ───────────────────────────

function CanvasContent() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const { zoomIn, zoomOut, setViewport, fitView, screenToFlowPosition } = useReactFlow();
  const [zoom, setZoom] = useState(1);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const { selectedNodeId, setSelectedNodeId, setNodePanelType } = useEditor();

  const handleAddPanel = useCallback(
    (type: string) => {
      if (type !== 'generate-image' && type !== 'create-influencer' && type !== 'generate-video' && type !== 'generic') return;

      const position = screenToFlowPosition({ x: window.innerWidth / 2 - 160, y: 160 });
      const id = `${type}-${Date.now()}`;
      const newNode: Node = {
        id,
        type: 'panel',
        position,
        data: { panelType: type },
        dragHandle: '.panel-drag-handle',
        style: PANEL_NODE_STYLE,
      };

      setNodes((nds) => [...nds, newNode]);
      setNodePanelType(id, type);
    },
    [screenToFlowPosition, setNodes, setNodePanelType]
  );

  const handleDelete = useCallback(() => {
    setNodes((nds) => {
      const selected = nds.filter((n) => n.selected);
      if (selected.length > 0) return nds.filter((n) => !n.selected);
      if (selectedNodeId) return nds.filter((n) => n.id !== selectedNodeId);
      return nds;
    });
    setSelectedNodeId(null);
  }, [selectedNodeId, setNodes, setSelectedNodeId]);

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
            onViewportChange={(vp) => setZoom(vp.zoom)}
            panOnDrag={!isSelectMode}
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
          />
        </div>
      </CanvasContextMenu>

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
        onDelete={handleDelete}
        onFitView={() => fitView({ duration: 300, padding: 0.2 })}
      />

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
          <div className="pointer-events-auto flex flex-col items-center gap-6">
            <Image
              src="/logo_2.svg"
              alt="Geraew AI"
              width={64}
              height={64}
              className="rounded-md animate-pulse"
            />
            <div className="text-center">
              <h2 className="text-md font-semibold text-[#f3f0ed]">Tudo pronto!</h2>
              <p className="mt-1 text-sm text-[#f3f0ed]/35">
                Escolha o que você deseja criar
              </p>
            </div>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => handleAddPanel('generate-image')}
                className="group flex h-40 w-40 flex-col items-center justify-center gap-4 rounded-2xl border border-[#f3f0ed]/[0.08] bg-[#1e494b]/20 transition-all hover:border-[#a2dd00]/30 hover:bg-[#1e494b]/40 active:scale-95"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#f3f0ed]/[0.08] bg-[#1e494b]/30 transition-all group-hover:border-[#a2dd00]/30 group-hover:bg-[#a2dd00]/10">
                  <ImageIcon className="h-6 w-6 text-[#f3f0ed]/50 transition-colors group-hover:text-[#a2dd00]" />
                </div>
                <span className="text-sm font-medium text-[#f3f0ed]/90">Gerar imagem</span>
              </button>

              <button
                onClick={() => handleAddPanel('create-influencer')}
                className="group flex h-40 w-40 flex-col items-center justify-center gap-4 rounded-2xl border border-[#f3f0ed]/[0.08] bg-[#1e494b]/20 transition-all hover:border-[#a2dd00]/30 hover:bg-[#1e494b]/40 active:scale-95"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#f3f0ed]/[0.08] bg-[#1e494b]/30 transition-all group-hover:border-[#a2dd00]/30 group-hover:bg-[#a2dd00]/10">
                  <PersonStanding className="h-6 w-6 text-[#f3f0ed]/50 transition-colors group-hover:text-[#a2dd00]" />
                </div>
                <span className="text-sm font-medium text-[#f3f0ed]/90">Criar influencer</span>
              </button>

              <button
                onClick={() => handleAddPanel('generate-video')}
                className="group flex h-40 w-40 flex-col items-center justify-center gap-4 rounded-2xl border border-[#f3f0ed]/[0.08] bg-[#1e494b]/20 transition-all hover:border-[#a2dd00]/30 hover:bg-[#1e494b]/40 active:scale-95"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#f3f0ed]/[0.08] bg-[#1e494b]/30 transition-all group-hover:border-[#a2dd00]/30 group-hover:bg-[#a2dd00]/10">
                  <Video className="h-6 w-6 text-[#f3f0ed]/50 transition-colors group-hover:text-[#a2dd00]" />
                </div>
                <span className="text-sm font-medium text-[#f3f0ed]/90">Gerar vídeo</span>
              </button>
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
