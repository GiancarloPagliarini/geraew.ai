'use client';

import { useEditor } from './editor-context';

/**
 * Returns the image URL produced by the panel connected to this node's
 * `image-in` target handle, or null if nothing is connected / nothing has
 * been generated yet.
 *
 * The connection map (target → source) is maintained by Canvas via
 * `setImageConnections`. The source URL comes from `nodeImages`, which
 * each generation panel updates via `setNodeImage(nodeId, url)` when it
 * finishes.
 */
export function useIncomingImage(nodeId: string): string | null {
  const { imageConnections, nodeImages } = useEditor();
  const sourceId = imageConnections[nodeId];
  if (!sourceId) return null;
  return nodeImages[sourceId] ?? null;
}

/**
 * Fetches an image URL and returns a `{ base64, mime_type, preview }` object
 * compatible with what most panels store for uploaded references.
 */
export async function urlToImagePayload(url: string): Promise<{ base64: string; mime_type: string; preview: string }> {
  const res = await fetch(url);
  const blob = await res.blob();
  const mime = blob.type || 'image/jpeg';
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return { base64: dataUrl.split(',')[1], mime_type: mime, preview: dataUrl };
}
