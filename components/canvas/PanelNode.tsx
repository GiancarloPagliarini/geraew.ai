'use client';

import { NodeProps, useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';
import { useEditor } from '@/lib/editor-context';
import { GenerateImagePanel } from '../editor/GenerateImagePanel';
import { CreateInfluencerPanel } from '../editor/CreateInfluencerPanel';
import { GenerateVideoPanel } from '../editor/GenerateVideoPanel';

export function PanelNode({ id, data }: NodeProps) {
  const { setNodes } = useReactFlow();
  const { selectedNodeId, setSelectedNodeId } = useEditor();

  const handleClose = useCallback(() => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  }, [id, selectedNodeId, setNodes, setSelectedNodeId]);

  if (data.panelType === 'generate-image') {
    return <GenerateImagePanel nodeId={id} onClose={handleClose} />;
  }
  if (data.panelType === 'create-influencer') {
    return <CreateInfluencerPanel nodeId={id} onClose={handleClose} />;
  }
  if (data.panelType === 'generate-video') {
    return <GenerateVideoPanel nodeId={id} onClose={handleClose} />;
  }
  return null;
}
