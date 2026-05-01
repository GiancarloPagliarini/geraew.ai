import type { LucideIcon } from 'lucide-react';
import {
  AudioLines,
  AudioWaveform,
  ImageIcon,
  ImagePlus,
  ImageUpscale,
  Mic,
  PersonStanding,
  Repeat2,
  Shirt,
  Video,
  Wand2,
} from 'lucide-react';

export type PanelType =
  | 'generate-image'
  | 'create-influencer'
  | 'generate-video'
  | 'motion-control'
  | 'virtual-try-on'
  | 'face-swap'
  | 'upscale'
  | 'generate-audio';

export type PanelGroupId = 'image' | 'video' | 'edit' | 'audio';

export interface PanelMeta {
  type: PanelType;
  icon: LucideIcon;
  /** key in editor.canvas.actions and editor.bottomToolbar */
  actionKey: string;
  /** key in editor.contextMenu.items */
  contextKey: string;
  /** When true, panel is shown but not selectable — UI must render a "Em breve" badge. */
  comingSoon?: boolean;
  /** When true, panel is selectable and UI must render a "Novo" badge / dot. */
  isNew?: boolean;
}

export interface PanelGroup {
  id: PanelGroupId;
  icon: LucideIcon;
  panels: PanelMeta[];
}

export const PANEL_GROUPS: PanelGroup[] = [
  {
    id: 'image',
    icon: ImagePlus,
    panels: [
      { type: 'generate-image', icon: ImageIcon, actionKey: 'generateImage', contextKey: 'generateImage' },
      { type: 'create-influencer', icon: PersonStanding, actionKey: 'createInfluencer', contextKey: 'createInfluencer' },
    ],
  },
  {
    id: 'video',
    icon: Video,
    panels: [
      { type: 'generate-video', icon: Video, actionKey: 'generateVideo', contextKey: 'generateVideo' },
      { type: 'motion-control', icon: AudioWaveform, actionKey: 'copyMotion', contextKey: 'motionControl' },
    ],
  },
  {
    id: 'edit',
    icon: Wand2,
    panels: [
      { type: 'virtual-try-on', icon: Shirt, actionKey: 'virtualTryOn', contextKey: 'virtualTryOn' },
      { type: 'face-swap', icon: Repeat2, actionKey: 'faceSwap', contextKey: 'faceSwap' },
      { type: 'upscale', icon: ImageUpscale, actionKey: 'upscale', contextKey: 'upscale' },
    ],
  },
  {
    id: 'audio',
    icon: AudioLines,
    panels: [
      { type: 'generate-audio', icon: Mic, actionKey: 'generateAudio', contextKey: 'generateVoice', comingSoon: true },
    ],
  },
];

export const PANEL_ICONS: Record<PanelType, LucideIcon> = PANEL_GROUPS.reduce(
  (acc, group) => {
    for (const p of group.panels) acc[p.type] = p.icon;
    return acc;
  },
  {} as Record<PanelType, LucideIcon>,
);
