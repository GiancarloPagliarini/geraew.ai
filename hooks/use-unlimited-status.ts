'use client';

import { useQuery } from '@tanstack/react-query';
import { api, UnlimitedStatus } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

/**
 * Busca o status do modo ilimitado do usuário: elegibilidade, modelos
 * liberados, contagem nas últimas 24h e se há job ativo. Refetch curto
 * porque o `usageCount` e `hasActiveJob` mudam ao longo da sessão.
 */
export function useUnlimitedStatus() {
  const { accessToken } = useAuth();

  return useQuery<UnlimitedStatus>({
    queryKey: ['unlimited', 'status'],
    queryFn: () => api.generations.getUnlimitedStatus(accessToken!),
    enabled: !!accessToken,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Helper: verifica se uma combinação modelVariant + resolution está liberada
 * no plano atual do usuário.
 */
export function isUnlimitedModelAllowed(
  status: UnlimitedStatus | undefined,
  modelVariant: string | undefined | null,
  resolution: string,
): boolean {
  if (!status?.eligible || !modelVariant) return false;
  const entry = status.models.find((m) => m.modelVariant === modelVariant);
  return entry?.resolutions.includes(resolution as never) ?? false;
}

/**
 * Mapa de slug de modelo (como exibido nos seletores) para modelVariant
 * (chave no plano ilimitado). Mantém em sync com getModelVariant() do backend.
 */
const MODEL_SLUG_TO_VARIANT: Record<string, string> = {
  // Imagens
  'gemini-3.1-flash-image-preview': 'NB2',
  'gemini-3-pro-image-preview': 'NBP',
  'nano-banana-2': 'NB2',
  'nano-banana-pro': 'NBP',
  'sem-censura': 'SEM_CENSURA',
  'gpt-image-2': 'GPT_IMAGE_2',
  // Vídeos (lembrar: GERAEW_* = Vertex, exibido como "Veo 3.1"; VEO_* = KIE)
  'geraew-fast': 'GERAEW_FAST',
  'geraew-quality': 'GERAEW_QUALITY',
  'veo-3.1-fast-generate-001': 'GERAEW_FAST',
  'veo-3.1-generate-001': 'GERAEW_QUALITY',
  'veo3_fast': 'VEO_FAST',
  'veo3': 'VEO_MAX',
};

export function getModelVariantFromSlug(
  slug: string | undefined | null,
): string | null {
  if (!slug) return null;
  return MODEL_SLUG_TO_VARIANT[slug] ?? null;
}

/**
 * Verifica se o slug do modelo está coberto pelo plano ilimitado atual
 * (em alguma resolução). Útil pra decidir mostrar/esconder o ícone do
 * modo ilimitado nas opções do seletor.
 */
export function isModelSlugInUnlimitedPlan(
  status: UnlimitedStatus | undefined,
  slug: string | undefined | null,
): boolean {
  if (!status?.eligible) return false;
  const variant = getModelVariantFromSlug(slug);
  if (!variant) return false;
  return status.models.some((m) => m.modelVariant === variant);
}

const IMAGE_VARIANTS = new Set(['NB2', 'NBP', 'SEM_CENSURA', 'GPT_IMAGE_2']);
const VIDEO_VARIANTS = new Set([
  'GERAEW_FAST',
  'GERAEW_QUALITY',
  'VEO_FAST',
  'VEO_MAX',
]);

const VARIANT_TO_DEFAULT_SLUG: Record<string, string> = {
  NB2: 'gemini-3.1-flash-image-preview',
  NBP: 'gemini-3-pro-image-preview',
  GERAEW_FAST: 'geraew-fast',
  GERAEW_QUALITY: 'geraew-quality',
};

/**
 * Retorna o primeiro slug de modelo do tipo solicitado que está liberado no
 * plano ilimitado do usuário. Útil pra trocar automaticamente o modelo ao
 * ativar o toggle quando o atual não está no plano.
 */
export function getFirstUnlimitedSlugForType(
  status: UnlimitedStatus | undefined,
  type: 'image' | 'video',
): string | null {
  if (!status?.eligible) return null;
  const allowed = type === 'image' ? IMAGE_VARIANTS : VIDEO_VARIANTS;
  for (const m of status.models) {
    if (allowed.has(m.modelVariant)) {
      const slug = VARIANT_TO_DEFAULT_SLUG[m.modelVariant];
      if (slug) return slug;
    }
  }
  return null;
}

/**
 * Retorna a primeira resolução liberada no plano para um dado modelVariant.
 * Usado para ajustar automaticamente a resolução ao ativar o modo ilimitado.
 */
export function getFirstUnlimitedResolutionForVariant(
  status: UnlimitedStatus | undefined,
  variant: string | null | undefined,
): string | null {
  if (!status?.eligible || !variant) return null;
  const entry = status.models.find((m) => m.modelVariant === variant);
  return entry?.resolutions[0] ?? null;
}
