'use client';

import { Node, NodeProps, useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';
import { useEditor } from '@/lib/editor-context';
import { idbLoad, idbSave } from '@/lib/panel-idb';
import { GenerateImagePanel } from '../editor/GenerateImagePanel';
import { CreateInfluencerPanel } from '../editor/CreateInfluencerPanel';
import { GenerateVideoPanel } from '../editor/GenerateVideoPanel';
import { MotionControlPanel } from '../editor/MotionControlPanel';
import { VirtualTryOnPanel } from '../editor/VirtualTryOnPanel';
import { FaceSwapPanel } from '../editor/FaceSwapPanel';

const PANEL_NODE_STYLE = {
  background: 'transparent',
  border: 'none',
  padding: 0,
  borderRadius: 0,
  boxShadow: 'none',
  width: 'auto',
} as const;

// localStorage key prefix per panel type (undefined = no persistence)
const STORAGE_KEY_PREFIX: Partial<Record<string, string>> = {
  'generate-image': 'geraew-panel-image-',
  'generate-video': 'geraew-panel-video-',
  'motion-control': 'geraew-panel-motion-control-',
  'virtual-try-on': 'geraew-panel-virtual-try-on-',
  'face-swap': 'geraew-panel-face-swap-',
};

export function PanelNode({ id, data, selected }: NodeProps) {
  const { setNodes, getNodes } = useReactFlow();
  const { selectedNodeId, setSelectedNodeId, setNodePanelType } = useEditor();

  const handleClose = useCallback(() => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  }, [id, selectedNodeId, setNodes, setSelectedNodeId]);

  const handleDuplicate = useCallback(async () => {
    const panelType = data.panelType as string;
    const newId = `${panelType}-${Date.now()}`;

    // Copy localStorage state to the new node, resetting generation state
    const prefix = STORAGE_KEY_PREFIX[panelType];
    if (prefix) {
      try {
        const oldStorageKey = `${prefix}${id}`;
        const newStorageKey = `${prefix}${newId}`;

        const raw = localStorage.getItem(oldStorageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.genState = 'idle';
          parsed.generationId = null;
          parsed.generatedVideoUrls = [];
          parsed.generatedVideoUrl = null;
          parsed.generatedImageUrl = null;
          localStorage.setItem(newStorageKey, JSON.stringify(parsed));
        }

        // Copy IndexedDB images to the new node
        const idbData = await idbLoad(`${oldStorageKey}-images`);
        if (idbData) {
          await idbSave(`${newStorageKey}-images`, idbData);
        }
      } catch { /* ignore */ }
    }

    // Place the duplicate slightly offset from the original
    const currentNode = getNodes().find((n) => n.id === id);
    const position = currentNode
      ? { x: currentNode.position.x + 344, y: currentNode.position.y + 24 }
      : { x: 100, y: 100 };

    const newNode: Node = {
      id: newId,
      type: 'panel',
      position,
      data: { panelType },
      dragHandle: '.panel-drag-handle',
      style: PANEL_NODE_STYLE,
    };

    setNodes((nds) => [...nds, newNode]);
    setNodePanelType(newId, panelType);
  }, [id, data.panelType, getNodes, setNodes, setNodePanelType]);

  const isSelected = selected || selectedNodeId === id;

  const panelMap: Record<string, React.ReactNode> = {
    'generate-image': <GenerateImagePanel nodeId={id} onClose={handleClose} onDuplicate={handleDuplicate} />,
    'create-influencer': <CreateInfluencerPanel nodeId={id} onClose={handleClose} onDuplicate={handleDuplicate} />,
    'generate-video': <GenerateVideoPanel nodeId={id} onClose={handleClose} onDuplicate={handleDuplicate} />,
    'motion-control': <MotionControlPanel nodeId={id} onClose={handleClose} onDuplicate={handleDuplicate} />,
    'virtual-try-on': <VirtualTryOnPanel nodeId={id} onClose={handleClose} onDuplicate={handleDuplicate} />,
    'face-swap': <FaceSwapPanel nodeId={id} onClose={handleClose} onDuplicate={handleDuplicate} />,
  };

  const panel = panelMap[data.panelType as string];
  if (!panel) return null;

  return (
    <div
      className="panel-enter-animate rounded-2xl transition-shadow duration-200"
      style={isSelected ? { boxShadow: '0 0 0 1.5px rgba(162, 221, 0, 0.45)' } : undefined}
    >
      {panel}
    </div>
  );
}
