import { getNodesBounds, getViewportForBounds, type Node } from '@xyflow/react';
import { toJpeg } from 'html-to-image';

// Proporção 3:2, igual aos cards da listagem de workspaces.
const THUMB_WIDTH = 640;
const THUMB_HEIGHT = 426;

/**
 * Gera um snapshot JPEG (data URL) do canvas enquadrando todos os nós —
 * vira a thumbnail do card na listagem de workspaces. Retorna null se não
 * houver o que capturar ou se a captura falhar (ex.: imagem sem CORS).
 */
export async function captureCanvasThumbnail(
  container: HTMLElement,
  nodes: Node[],
): Promise<string | null> {
  if (nodes.length === 0) return null;
  const viewportEl = container.querySelector<HTMLElement>('.react-flow__viewport');
  if (!viewportEl) return null;

  const bounds = getNodesBounds(nodes);
  const viewport = getViewportForBounds(bounds, THUMB_WIDTH, THUMB_HEIGHT, 0.05, 1, 0.12);

  try {
    return await toJpeg(viewportEl, {
      width: THUMB_WIDTH,
      height: THUMB_HEIGHT,
      backgroundColor: '#161d1f',
      quality: 0.7,
      pixelRatio: 1,
      skipFonts: true,
      style: {
        width: `${THUMB_WIDTH}px`,
        height: `${THUMB_HEIGHT}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    });
  } catch {
    return null;
  }
}
