/**
 * Capabilities of each video generation model.
 *
 * Single source of truth for "what can model X do" — UI reads from here
 * instead of branching on `isKieModel`/`isGrokModel`. To add a new model,
 * add an entry below and a branch in `handleGenerate` that calls the
 * matching API route.
 */

export type ResolutionOption = {
  value: string; // internal enum: 'RES_480P' | 'RES_720P' | 'RES_1080P' | 'RES_4K'
  label: string; // display: '480p', '720p', ...
};

export type AspectRatioOption = {
  value: string;    // internal: '16-9'
  apiValue: string; // sent to provider: '16:9' | 'Auto' | etc.
  label: string;    // display in button: '16:9'
};

export type DurationConfig =
  | { type: 'preset'; options: string[]; default: string }
  | { type: 'slider'; min: number; max: number; step: number; default: string };

export interface VideoModelCapabilities {
  resolutions: ResolutionOption[];
  aspectRatios: AspectRatioOption[];
  duration: DurationConfig;

  // Áudio
  audio: 'toggle' | 'always-on' | 'always-off';

  // Quantidade (1 = sempre 1; 'multi' = usuário escolhe 1..4)
  samples: 'single' | 'multi';

  // Negative prompt
  supportsNegativePrompt: boolean;

  // Modos de input
  supportsTextMode: boolean;
  supportsImageMode: boolean;
  supportsReferenceMode: boolean;
}

// ─── Definições por família ──────────────────────────────────────────

const GERAEW: VideoModelCapabilities = {
  resolutions: [
    { value: 'RES_720P', label: '720p' },
    { value: 'RES_1080P', label: '1080p' },
    { value: 'RES_4K', label: '4K' },
  ],
  aspectRatios: [
    { value: '9-16', apiValue: '9:16', label: '9:16' },
    { value: '16-9', apiValue: '16:9', label: '16:9' },
  ],
  duration: { type: 'preset', options: ['4s', '6s', '8s'], default: '8s' },
  audio: 'toggle',
  samples: 'multi',
  supportsNegativePrompt: true,
  supportsTextMode: true,
  supportsImageMode: true,
  supportsReferenceMode: true,
};

const KIE_VEO: VideoModelCapabilities = {
  resolutions: [
    { value: 'RES_720P', label: '720p' },
    { value: 'RES_1080P', label: '1080p' },
    { value: 'RES_4K', label: '4K' },
  ],
  aspectRatios: [
    { value: '9-16', apiValue: '9:16', label: '9:16' },
    { value: '1-1', apiValue: 'Auto', label: 'Auto' },
    { value: '16-9', apiValue: '16:9', label: '16:9' },
  ],
  duration: { type: 'preset', options: ['8s'], default: '8s' },
  audio: 'always-on',
  samples: 'single',
  supportsNegativePrompt: false,
  supportsTextMode: true,
  supportsImageMode: true,
  supportsReferenceMode: true,
};

const GROK_IMAGINE: VideoModelCapabilities = {
  resolutions: [
    { value: 'RES_480P', label: '480p' },
    { value: 'RES_720P', label: '720p' },
  ],
  aspectRatios: [
    { value: '2-3', apiValue: '2:3', label: '2:3' },
    { value: '3-2', apiValue: '3:2', label: '3:2' },
    { value: '1-1', apiValue: '1:1', label: '1:1' },
    { value: '9-16', apiValue: '9:16', label: '9:16' },
    { value: '16-9', apiValue: '16:9', label: '16:9' },
  ],
  duration: { type: 'slider', min: 6, max: 30, step: 1, default: '6s' },
  audio: 'always-off',
  samples: 'single',
  supportsNegativePrompt: false,
  supportsTextMode: false,
  supportsImageMode: true,
  supportsReferenceMode: false,
};

const VIDEO_MODEL_CAPABILITIES: Record<string, VideoModelCapabilities> = {
  'geraew-fast': GERAEW,
  'geraew-quality': GERAEW,
  'veo3_fast': KIE_VEO,
  'veo3': KIE_VEO,
  'grok-imagine': GROK_IMAGINE,
};

export function getVideoModelCapabilities(slug: string): VideoModelCapabilities {
  return VIDEO_MODEL_CAPABILITIES[slug] ?? GERAEW;
}

/**
 * Converte o valor interno de proporção ('16-9') para o aspect_ratio que
 * o provider espera. Usa o `apiValue` configurado no modelo — assim cada
 * provider pode ter convenções diferentes ('1:1' vs 'Auto', etc).
 */
export function proportionToApiAspectRatio(
  caps: VideoModelCapabilities,
  proportion: string,
): string {
  const match = caps.aspectRatios.find((a) => a.value === proportion);
  return match?.apiValue ?? caps.aspectRatios[0]?.apiValue ?? '16:9';
}
