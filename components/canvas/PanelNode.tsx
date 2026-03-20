'use client';

import { Node, NodeProps, useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';
import { useEditor } from '@/lib/editor-context';
import { GenerateImagePanel } from '../editor/GenerateImagePanel';
import { CreateInfluencerPanel } from '../editor/CreateInfluencerPanel';
import { GenerateVideoPanel } from '../editor/GenerateVideoPanel';
import { MotionControlPanel } from '../editor/MotionControlPanel';
import { GenericPanel } from '../editor/GenericPanel';

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
};

export function PanelNode({ id, data }: NodeProps) {
  const { setNodes, getNodes } = useReactFlow();
  const { selectedNodeId, setSelectedNodeId, setNodePanelType } = useEditor();

  const handleClose = useCallback(() => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  }, [id, selectedNodeId, setNodes, setSelectedNodeId]);

  const handleDuplicate = useCallback(() => {
    const panelType = data.panelType as string;
    const newId = `${panelType}-${Date.now()}`;

    // Copy localStorage state to the new node, resetting generation state
    const prefix = STORAGE_KEY_PREFIX[panelType];
    if (prefix) {
      try {
        const raw = localStorage.getItem(`${prefix}${id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.genState = 'idle';
          parsed.generationId = null;
          parsed.generatedVideoUrls = [];
          parsed.generatedVideoUrl = null;
          parsed.generatedImageUrl = null;
          localStorage.setItem(`${prefix}${newId}`, JSON.stringify(parsed));
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

  if (data.panelType === 'generate-image') {
    return <GenerateImagePanel nodeId={id} onClose={handleClose} onDuplicate={handleDuplicate} />;
  }
  if (data.panelType === 'create-influencer') {
    return <CreateInfluencerPanel nodeId={id} onClose={handleClose} onDuplicate={handleDuplicate} />;
  }
  if (data.panelType === 'generate-video') {
    return <GenerateVideoPanel nodeId={id} onClose={handleClose} onDuplicate={handleDuplicate} />;
  }
  if (data.panelType === 'motion-control') {
    return <MotionControlPanel nodeId={id} onClose={handleClose} onDuplicate={handleDuplicate} />;
  }
  if (data.panelType === 'generic') {
    return <GenericPanel nodeId={id} onClose={handleClose} onDuplicate={handleDuplicate} />;
  }
  return null;
}
