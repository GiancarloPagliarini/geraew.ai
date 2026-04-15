'use client';

import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { AudioWaveform, ImageIcon, ImageUpscale, Mic, Repeat2, Shirt, User, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface CanvasContextMenuProps {
    children: React.ReactNode;
    onAddPanel?: (type: string) => void;
}

export function CanvasContextMenu({ children, onAddPanel }: CanvasContextMenuProps) {
    const t = useTranslations('editor.contextMenu');
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => { setIsMobile(window.innerWidth < 640); }, []);

    const menuItems = [
        { type: 'generate-image', icon: ImageIcon, label: t('items.generateImage.label'), description: t('items.generateImage.description') },
        { type: 'create-influencer', icon: User, label: t('items.createInfluencer.label'), description: t('items.createInfluencer.description') },
        { type: 'generate-video', icon: Video, label: t('items.generateVideo.label'), description: t('items.generateVideo.description') },
        { type: 'motion-control', icon: AudioWaveform, label: t('items.motionControl.label'), description: t('items.motionControl.description') },
        { type: 'virtual-try-on', icon: Shirt, label: t('items.virtualTryOn.label'), description: t('items.virtualTryOn.description') },
        { type: 'face-swap', icon: Repeat2, label: t('items.faceSwap.label'), description: t('items.faceSwap.description') },
        { type: 'upscale', icon: ImageUpscale, label: 'Upscale', description: 'Aprimora a qualidade da imagem em 2K' },
        { type: 'generate-voice', icon: Mic, label: t('items.generateVoice.label'), description: t('items.generateVoice.description'), comingSoon: true },
    ];

    if (isMobile) return <>{children}</>;

    return (
        <ContextMenu>
            <ContextMenuTrigger className="flex h-full w-full" asChild>
                {children}
            </ContextMenuTrigger>

            <ContextMenuContent
                className="w-64 overflow-hidden rounded-2xl border border-[#f3f0ed]/[0.08] bg-[#1a2123] p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl"
            >
                <ContextMenuLabel className="mb-1 px-3 py-2 text-[10px] font-bold tracking-[0.15em] text-[#f3f0ed]/35">
                    {t('heading')}
                </ContextMenuLabel>

                {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <ContextMenuItem
                            key={item.type}
                            onSelect={(e) => {
                                if (item.comingSoon) { e.preventDefault(); return; }
                                onAddPanel?.(item.type);
                            }}
                            className={`group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 outline-none transition-all focus:bg-[#1e494b]/40 data-highlighted:bg-[#1e494b]/40 ${item.comingSoon ? 'opacity-60 cursor-default' : ''}`}
                        >
                            {/* Icon box */}
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#f3f0ed]/[0.08] bg-[#1e494b]/30 transition-all group-focus:border-[#a2dd00]/30 group-focus:bg-[#a2dd00]/10">
                                <Icon className="h-4 w-4 text-[#f3f0ed]/50 transition-colors group-focus:text-[#a2dd00]" />
                            </div>

                            {/* Text */}
                            <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-sm font-semibold text-[#f3f0ed]/90">
                                    {item.label}
                                </span>
                                <span className="text-xs text-[#f3f0ed]/35">
                                    {item.description}
                                </span>
                            </div>

                            {/* Coming soon badge */}
                            {item.comingSoon && (
                                <div className="flex items-center gap-1 rounded-full border border-[#a2dd00]/30 bg-[#a2dd00]/5 px-2 py-0.5 shrink-0">
                                    <span className="text-[10px] font-medium text-[#a2dd00]/70">{t('comingSoon')}</span>
                                    <div className="flex items-center gap-0.5">
                                        <span className="h-0.5 w-0.5 rounded-full bg-[#a2dd00]/70 animate-bounce [animation-delay:0ms]" />
                                        <span className="h-0.5 w-0.5 rounded-full bg-[#a2dd00]/70 animate-bounce [animation-delay:150ms]" />
                                        <span className="h-0.5 w-0.5 rounded-full bg-[#a2dd00]/70 animate-bounce [animation-delay:300ms]" />
                                    </div>
                                </div>
                            )}
                        </ContextMenuItem>
                    );
                })}

                <ContextMenuSeparator className="my-1.5 bg-[#f3f0ed]/[0.06]" />

                <ContextMenuItem className="group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 outline-none transition-all focus:bg-[#f3f0ed]/[0.04] data-[highlighted]:bg-[#f3f0ed]/[0.04]">
                    <span className="text-xs text-[#f3f0ed]/30 transition-colors group-focus:text-[#f3f0ed]/60">
                        {t('moreSoon')}
                    </span>
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}
