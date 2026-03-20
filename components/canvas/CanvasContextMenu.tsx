'use client';

import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { AudioWaveform, ImageIcon, Mic, User, Video } from 'lucide-react';

interface CanvasContextMenuProps {
    children: React.ReactNode;
    onAddPanel?: (type: string) => void;
}

const menuItems = [
    {
        type: 'generate-image',
        icon: ImageIcon,
        label: 'Gerar Imagem',
        description: 'Criar imagem com IA',
    },
    {
        type: 'create-influencer',
        icon: User,
        label: 'Criar Influencer',
        description: 'Construa sua AI influencer',
    },
    {
        type: 'generate-video',
        icon: Video,
        label: 'Gerar Vídeo',
        description: 'Criar vídeo com IA',
    },
    {
        type: 'motion-control',
        icon: AudioWaveform,
        label: 'Motion Control',
        description: 'Substituir sujeito no vídeo',
    },
    {
        type: 'generate-voice',
        icon: Mic,
        label: 'Gerar Voz',
        description: 'Texto para áudio com IA',
    },
];

export function CanvasContextMenu({ children, onAddPanel }: CanvasContextMenuProps) {
    return (
        <ContextMenu>
            <ContextMenuTrigger className="flex h-full w-full" asChild>
                {children}
            </ContextMenuTrigger>

            <ContextMenuContent
                className="w-64 overflow-hidden rounded-2xl border border-[#f3f0ed]/[0.08] bg-[#1a2123] p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl"
            >
                <ContextMenuLabel className="mb-1 px-3 py-2 text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
                    O QUE VOCÊ QUER GERAR?
                </ContextMenuLabel>

                {menuItems.map((item, i) => {
                    const Icon = item.icon;
                    return (
                        <ContextMenuItem
                            key={item.type}
                            onSelect={() => onAddPanel?.(item.type)}
                            className="group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 outline-none transition-all focus:bg-[#1e494b]/40 data-[highlighted]:bg-[#1e494b]/40"
                        >
                            {/* Icon box */}
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#f3f0ed]/[0.08] bg-[#1e494b]/30 transition-all group-focus:border-[#a2dd00]/30 group-focus:bg-[#a2dd00]/10">
                                <Icon className="h-4 w-4 text-[#f3f0ed]/50 transition-colors group-focus:text-[#a2dd00]" />
                            </div>

                            {/* Text */}
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-[#f3f0ed]/90">
                                    {item.label}
                                </span>
                                <span className="text-xs text-[#f3f0ed]/35">
                                    {item.description}
                                </span>
                            </div>
                        </ContextMenuItem>
                    );
                })}

                <ContextMenuSeparator className="my-1.5 bg-[#f3f0ed]/[0.06]" />

                <ContextMenuItem className="group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 outline-none transition-all focus:bg-[#f3f0ed]/[0.04] data-[highlighted]:bg-[#f3f0ed]/[0.04]">
                    <span className="text-xs text-[#f3f0ed]/30 transition-colors group-focus:text-[#f3f0ed]/60">
                        Mais opções em breve...
                    </span>
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}
