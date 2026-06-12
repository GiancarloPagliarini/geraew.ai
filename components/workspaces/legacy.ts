import { api } from '@/lib/api';

// Chaves usadas pelo canvas antes do multi-workspace (um único canvas global).
const LEGACY_NODES_KEY = 'geraew-canvas-nodes';
const LEGACY_EDGES_KEY = 'geraew-canvas-edges';
const LEGACY_VIEWPORT_KEY = 'geraew-canvas-viewport';

function clearLegacyKeys() {
  localStorage.removeItem(LEGACY_NODES_KEY);
  localStorage.removeItem(LEGACY_EDGES_KEY);
  localStorage.removeItem(LEGACY_VIEWPORT_KEY);
}

/**
 * Importa o canvas legado do localStorage como primeiro workspace do usuário.
 * Retorna true se algo foi importado (a listagem deve ser revalidada).
 */
export async function importLegacyCanvas(accessToken: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const rawNodes = localStorage.getItem(LEGACY_NODES_KEY);
    if (!rawNodes) return false;

    const nodes = JSON.parse(rawNodes) as unknown;
    if (!Array.isArray(nodes) || nodes.length === 0) {
      clearLegacyKeys();
      return false;
    }

    const edges = JSON.parse(localStorage.getItem(LEGACY_EDGES_KEY) ?? '[]') as unknown;
    const viewport = JSON.parse(localStorage.getItem(LEGACY_VIEWPORT_KEY) ?? 'null') as {
      x: number;
      y: number;
      zoom: number;
    } | null;

    await api.workspaces.create(accessToken, {
      nodes,
      edges: Array.isArray(edges) ? edges : [],
      ...(viewport ? { viewport } : {}),
    });
    clearLegacyKeys();
    return true;
  } catch {
    // mantém as chaves para tentar de novo na próxima visita
    return false;
  }
}
