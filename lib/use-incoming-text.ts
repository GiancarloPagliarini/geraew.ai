'use client';

import { useEditor } from './editor-context';

/**
 * Returns the text/prompt published by the panel connected to this node's
 * `text-in` target handle (typically a PromptSourcePanel via `setNodeText`),
 * or null if nothing is connected.
 */
export function useIncomingText(nodeId: string): string | null {
  const { textConnections, nodeTexts } = useEditor();
  const sourceId = textConnections[nodeId];
  if (!sourceId) return null;
  const value = nodeTexts[sourceId];
  return typeof value === 'string' ? value : null;
}
