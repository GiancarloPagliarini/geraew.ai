import {
  Image as ImageIcon,
  LayoutGrid,
  Mic,
  ScanFace,
  SquarePlay,
  type LucideIcon,
} from 'lucide-react';

export type Kind = 'image' | 'video' | 'voice' | 'avatar';

/** Filtros do topo → tipos de geração aceitos pela API (separados por vírgula). */
export const GALLERY_FILTERS: { id: string; icon: LucideIcon; types?: string }[] = [
  { id: 'all', icon: LayoutGrid },
  { id: 'image', icon: ImageIcon, types: 'TEXT_TO_IMAGE,IMAGE_TO_IMAGE,FACE_SWAP,VIRTUAL_TRY_ON' },
  { id: 'video', icon: SquarePlay, types: 'TEXT_TO_VIDEO,IMAGE_TO_VIDEO,MOTION_CONTROL,REFERENCE_VIDEO,SPOKEN_VIDEO' },
  { id: 'voice', icon: Mic, types: 'VOICE_CLONE' },
  { id: 'avatars', icon: ScanFace, types: 'AVATAR_VIDEO' },
];

export function kindOf(type: string): Kind {
  const t = type.toUpperCase();
  if (t === 'AVATAR_VIDEO') return 'avatar';
  if (t === 'VOICE_CLONE') return 'voice';
  if (t.includes('VIDEO') || t.includes('MOTION')) return 'video';
  return 'image';
}

export const KIND_ICONS: Record<Kind, LucideIcon> = {
  image: ImageIcon,
  video: SquarePlay,
  voice: Mic,
  avatar: ScanFace,
};
