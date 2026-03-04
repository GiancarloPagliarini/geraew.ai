'use client';

import '@xyflow/react/dist/style.css';

import {
  Node,
  NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import { ImageIcon, PersonStanding, Plus, Video } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useEditor } from '@/lib/editor-context';
import { BottomToolbar } from '../editor/BottomToolbar';
import { CanvasContextMenu } from './CanvasContextMenu';
import { PanelNode } from './PanelNode';
import Image from 'next/image';

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
  const { selectedNodeId, setSelectedNodeId, setNodePanelType } = useEditor();

  const handleAddPanel = useCallback(
    (type: string) => {
      if (type !== 'generate-image' && type !== 'create-influencer' && type !== 'generate-video') return;

      // Place the new panel near the center of the visible viewport
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
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setSelectedNodeId(null);
  }, [selectedNodeId, setNodes, setSelectedNodeId]);

  return (
    <>
      <CanvasContextMenu onAddPanel={handleAddPanel}>
        <div className="h-full w-full">
          <ReactFlow
            nodes={nodes}
            edges={[]}
            onNodesChange={onNodesChange}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            onViewportChange={(vp) => setZoom(vp.zoom)}
            panOnDrag
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
        onZoomIn={() => zoomIn({ duration: 250 })}
        onZoomOut={() => zoomOut({ duration: 250 })}
        onResetZoom={() => {
          setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 });
          setZoom(1);
        }}
        onAdd={() => handleAddPanel('generate-image')}
        onAddInfluencer={() => handleAddPanel('create-influencer')}
        onAddVideo={() => handleAddPanel('generate-video')}
        onDelete={handleDelete}
        onFitView={() => fitView({ duration: 300, padding: 0.2 })}
      />

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
          <div className="pointer-events-auto flex flex-col items-center gap-4">
            <Image
              src="/logo_2.svg"
              alt="Geraew AI"
              width={64}
              height={64}
              className="rounded-md animate-pulse"
            />
            <div className="text-center">
              <h2 className="text-sm font-semibold text-[#f3f0ed]">Comece a criar</h2>
              <p className="mt-1 text-xs text-[#f3f0ed]/35">
                Escolha o que deseja criar
              </p>
            </div>
            <div className="flex flex-col items-center justify-center gap-2">
              <button
                onClick={() => handleAddPanel('generate-image')}
                className="flex items-center gap-2 rounded-full bg-[#a2dd00] px-5 py-2 text-xs font-bold text-[#1a2123] transition-all hover:brightness-110 active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                Gerar imagem
              </button>

              <button
                onClick={() => handleAddPanel('create-influencer')}
                className="flex items-center gap-2 rounded-full border border-[#a2dd00]/40 bg-[#a2dd00]/10 px-5 py-2 text-xs font-bold text-[#a2dd00] transition-all hover:border-[#a2dd00]/70 hover:bg-[#a2dd00]/20 active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                Criar AI Influencer
              </button>

              <button
                onClick={() => handleAddPanel('generate-video')}
                className="flex items-center gap-2 rounded-full border border-[#a2dd00]/40 bg-[#a2dd00]/10 px-5 py-2 text-xs font-bold text-[#a2dd00] transition-all hover:border-[#a2dd00]/70 hover:bg-[#a2dd00]/20 active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                Gerar vídeo
              </button>
            </div>
          </div>
        </div >
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
