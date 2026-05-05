import {
  AudioWaveform,
  Image as ImageIcon,
  ImageUpscale,
  Repeat2,
  Shirt,
  Video,
  type LucideIcon,
} from 'lucide-react';

export interface ConnectionOption {
  panelType: string;
  label: string;
  icon: LucideIcon;
}

// Options that an image-output port can be connected to (i.e. accept an image as primary input)
export const IMAGE_OUTPUT_TARGETS: ConnectionOption[] = [
  { panelType: 'generate-video', label: 'Gerar Vídeo', icon: Video },
  { panelType: 'motion-control', label: 'Copiar Movimento', icon: AudioWaveform },
  { panelType: 'upscale', label: 'Upscale', icon: ImageUpscale },
  { panelType: 'face-swap', label: 'Face Swap', icon: Repeat2 },
  { panelType: 'virtual-try-on', label: 'Try-On', icon: Shirt },
  { panelType: 'generate-image', label: 'Gerar Imagem', icon: ImageIcon },
];

// Options that a text-output port can be connected to (i.e. accept text as a prompt input)
export const TEXT_OUTPUT_TARGETS: ConnectionOption[] = [
  { panelType: 'generate-image', label: 'Gerar Imagem', icon: ImageIcon },
  { panelType: 'generate-video', label: 'Gerar Vídeo', icon: Video },
];

/** Returns the target handle id paired with a source handle id (or null if unsupported). */
export function getTargetHandleForSource(sourceHandle: string | null | undefined): string | null {
  if (sourceHandle === 'image-out') return 'image-in';
  if (sourceHandle === 'text-out') return 'text-in';
  return null;
}

/** Returns the panel options matching a given source handle id. */
export function getOptionsForSource(sourceHandle: string | null | undefined): ConnectionOption[] {
  if (sourceHandle === 'image-out') return IMAGE_OUTPUT_TARGETS;
  if (sourceHandle === 'text-out') return TEXT_OUTPUT_TARGETS;
  return [];
}
