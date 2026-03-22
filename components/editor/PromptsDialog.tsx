'use client';

import { Type, Copy, Check, X, ImageIcon, Film } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useEditor } from '@/lib/editor-context';

const promptTemplates = [
  {
    id: 'cinematic-portrait',
    title: 'Retrato Cinematográfico',
    image: null,
    prompt:
      'Cinematic portrait of a woman with dramatic lighting, shallow depth of field, film grain, golden hour, shot on 35mm film, professional photography, bokeh background',
  },
  {
    id: 'anime-character',
    title: 'Personagem Anime',
    image: null,
    prompt:
      'Anime-style character illustration, vibrant colors, detailed eyes, dynamic pose, studio Ghibli inspired, cel shading, high quality digital art',
  },
  {
    id: 'product-photo',
    title: 'Foto de Produto',
    image: null,
    prompt:
      'Professional product photography on a clean white background, studio lighting, soft shadows, high resolution, commercial quality, minimalist composition',
  },
  {
    id: 'fantasy-landscape',
    title: 'Paisagem Fantasia',
    image: null,
    prompt:
      'Epic fantasy landscape, floating islands in the sky, waterfalls, magical atmosphere, volumetric lighting, concept art, matte painting, ultra detailed, 8k resolution',
  },
  {
    id: 'cyberpunk-city',
    title: 'Cidade Cyberpunk',
    image: null,
    prompt:
      'Cyberpunk city at night, neon lights reflecting on wet streets, flying cars, holographic billboards, rain, futuristic architecture, blade runner style, moody atmosphere',
  },
  {
    id: 'watercolor-art',
    title: 'Arte em Aquarela',
    image: null,
    prompt:
      'Beautiful watercolor painting, soft color blending, delicate brush strokes, artistic composition, pastel tones, fine art style, elegant and ethereal',
  },
  {
    id: '3d-render',
    title: 'Render 3D Realista',
    image: null,
    prompt:
      'Photorealistic 3D render, octane render, ray tracing, global illumination, subsurface scattering, PBR materials, studio lighting, ultra high detail',
  },
  {
    id: 'vintage-photo',
    title: 'Foto Vintage',
    image: null,
    prompt:
      'Vintage photograph from the 1970s, warm color palette, slight film grain, retro aesthetic, nostalgic mood, faded colors, analog photography look',
  },
];

interface PromptsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromptsDialog({ open, onOpenChange }: PromptsDialogProps) {
  const { requestPanelWithPrompt } = useEditor();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleCopy(prompt: string, id: string) {
    await navigator.clipboard.writeText(prompt);
    setCopiedId(id);
    toast.success('Prompt copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleOpenPanel(panelType: 'generate-image' | 'generate-video', prompt: string) {
    requestPanelWithPrompt({ panelType, prompt });
  }

  if (!open) return null;

  return (
    <aside className="aside-in-left fixed inset-0 z-50 flex flex-col border-r border-[#f3f0ed]/[0.07] bg-[#1a2123] text-[#f3f0ed] overflow-hidden sm:static sm:h-full sm:w-xl sm:shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#f3f0ed]/[0.05] bg-gradient-to-b from-[#f3f0ed]/[0.02] to-transparent px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#a2dd00]/10">
            <Type className="h-3.5 w-3.5 text-[#a2dd00]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#f3f0ed]/60">Fábrica de Prompts</h2>
            <p className="hidden text-xs text-[#f3f0ed]/30 sm:block">Escolha um prompt e abra em um painel</p>
          </div>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[#f3f0ed]/30 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 px-3 py-3 gap-4 overflow-y-auto sidebar-scroll sm:px-4">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {promptTemplates.map(({ id, title, image, prompt }) => (
            <div
              key={id}
              className="group relative flex flex-col rounded-xl bg-[#f3f0ed]/[0.03] ring-1 ring-[#f3f0ed]/[0.06] hover:ring-[#a2dd00]/30 hover:bg-[#a2dd00]/[0.04] text-left transition-all overflow-hidden"
            >
              {/* Image placeholder */}
              <div className="relative w-full aspect-[4/3] bg-[#f3f0ed]/[0.02] flex items-center justify-center">
                {image ? (
                  <img src={image} alt={title} className="w-full h-full object-cover" />
                ) : (
                  <Type className="h-8 w-8 text-[#f3f0ed]/10" />
                )}
              </div>

              {/* Title + prompt preview */}
              <div className="px-2.5 py-2 border-t border-[#f3f0ed]/5 sm:px-3 sm:py-2.5">
                <p className="text-xs font-bold text-[#f3f0ed] sm:text-sm">{title}</p>
                <p className="mt-1 text-[10px] text-[#f3f0ed]/30 line-clamp-2 leading-relaxed hidden sm:block">
                  {prompt}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 px-2.5 pb-2 sm:gap-1.5 sm:px-3 sm:pb-2.5">
                <button
                  onClick={() => handleOpenPanel('generate-image', prompt)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#a2dd00]/10 px-2 py-1.5 text-[10px] font-bold text-[#a2dd00] ring-1 ring-[#a2dd00]/20 hover:bg-[#a2dd00]/20 transition-colors"
                >
                  <ImageIcon className="h-3 w-3" />
                  Imagem
                </button>
                <button
                  onClick={() => handleOpenPanel('generate-video', prompt)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#a2dd00]/10 px-2 py-1.5 text-[10px] font-bold text-[#a2dd00] ring-1 ring-[#a2dd00]/20 hover:bg-[#a2dd00]/20 transition-colors"
                >
                  <Film className="h-3 w-3" />
                  Vídeo
                </button>
                <button
                  onClick={() => handleCopy(prompt, id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#f3f0ed]/30 ring-1 ring-[#f3f0ed]/[0.06] hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 transition-colors"
                >
                  {copiedId === id ? (
                    <Check className="h-3 w-3 text-[#a2dd00]" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-[#f3f0ed]/[0.07] pt-3">
          <span className="text-[10px] font-medium tracking-wider text-[#f3f0ed]/30 uppercase">
            {promptTemplates.length} prompts disponíveis
          </span>
        </div>
      </div>
    </aside>
  );
}
