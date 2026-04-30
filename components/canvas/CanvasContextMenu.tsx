'use client';

import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PANEL_GROUPS, PanelType } from '@/lib/panel-groups';

interface CanvasContextMenuProps {
    children: React.ReactNode;
    onAddPanel?: (type: PanelType) => void;
}

export function CanvasContextMenu({ children, onAddPanel }: CanvasContextMenuProps) {
    const t = useTranslations('editor.contextMenu');
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => { setIsMobile(window.innerWidth < 640); }, []);

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

                {PANEL_GROUPS.map((group) => {
                    const GroupIcon = group.icon;

                    // Single-panel group → flat item
                    if (group.panels.length === 1) {
                        const panel = group.panels[0];
                        const PanelIcon = panel.icon;
                        const isComingSoon = panel.comingSoon;
                        const isNew = panel.isNew;
                        return (
                            <ContextMenuItem
                                key={group.id}
                                disabled={isComingSoon}
                                onSelect={(e) => {
                                    if (isComingSoon) {
                                        e.preventDefault();
                                        return;
                                    }
                                    onAddPanel?.(panel.type);
                                }}
                                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 outline-none transition-all ${
                                    isComingSoon
                                        ? 'opacity-50'
                                        : 'cursor-pointer focus:bg-[#1e494b]/40 data-[highlighted]:bg-[#1e494b]/40'
                                }`}
                            >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#f3f0ed]/[0.08] bg-[#1e494b]/30 transition-all group-focus:border-[#a2dd00]/30 group-focus:bg-[#a2dd00]/10 group-data-[highlighted]:border-[#a2dd00]/30 group-data-[highlighted]:bg-[#a2dd00]/10">
                                    <PanelIcon className="h-4 w-4 text-[#f3f0ed]/50 transition-colors group-focus:text-[#a2dd00] group-data-[highlighted]:text-[#a2dd00]" />
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                    <span className="flex items-center gap-2 text-sm font-semibold text-[#f3f0ed]/90">
                                        {t(`items.${panel.contextKey}.label`)}
                                        {isComingSoon && <ComingSoonBadge label={t('comingSoon')} />}
                                        {!isComingSoon && isNew && <NewBadge label={t('newBadge')} />}
                                    </span>
                                    <span className="text-xs text-[#f3f0ed]/35">
                                        {t(`items.${panel.contextKey}.description`)}
                                    </span>
                                </div>
                            </ContextMenuItem>
                        );
                    }

                    // Multi-panel group → submenu
                    return (
                        <ContextMenuSub key={group.id}>
                            <ContextMenuSubTrigger
                                className="group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 outline-none transition-all focus:bg-[#1e494b]/40 data-[state=open]:bg-[#1e494b]/40"
                            >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#a2dd00]/20 bg-[#a2dd00]/[0.06] transition-all">
                                    <GroupIcon className="h-4 w-4 text-[#a2dd00]" />
                                </div>
                                <div className="flex flex-1 min-w-0 items-center">
                                    <span className="text-sm font-semibold text-[#f3f0ed]/90">
                                        {t(`groups.${group.id}`)}
                                    </span>
                                </div>
                            </ContextMenuSubTrigger>

                            <ContextMenuSubContent
                                sideOffset={8}
                                className="w-64 overflow-hidden rounded-2xl border border-[#f3f0ed]/[0.08] bg-[#1a2123] p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl"
                            >
                                {group.panels.map((panel) => {
                                    const Icon = panel.icon;
                                    const isComingSoon = panel.comingSoon;
                                    const isNew = panel.isNew;
                                    return (
                                        <ContextMenuItem
                                            key={panel.type}
                                            disabled={isComingSoon}
                                            onSelect={(e) => {
                                                if (isComingSoon) {
                                                    e.preventDefault();
                                                    return;
                                                }
                                                onAddPanel?.(panel.type);
                                            }}
                                            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 outline-none transition-all ${
                                                isComingSoon
                                                    ? 'opacity-50'
                                                    : 'cursor-pointer focus:bg-[#1e494b]/40 data-[highlighted]:bg-[#1e494b]/40'
                                            }`}
                                        >
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#f3f0ed]/[0.08] bg-[#1e494b]/30 transition-all group-focus:border-[#a2dd00]/30 group-focus:bg-[#a2dd00]/10 group-data-[highlighted]:border-[#a2dd00]/30 group-data-[highlighted]:bg-[#a2dd00]/10">
                                                <Icon className="h-4 w-4 text-[#f3f0ed]/50 transition-colors group-focus:text-[#a2dd00] group-data-[highlighted]:text-[#a2dd00]" />
                                            </div>
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <span className="flex items-center gap-2 text-sm font-semibold text-[#f3f0ed]/90">
                                                    {t(`items.${panel.contextKey}.label`)}
                                                    {isComingSoon && <ComingSoonBadge label={t('comingSoon')} />}
                                                    {!isComingSoon && isNew && <NewBadge label={t('newBadge')} />}
                                                </span>
                                                <span className="text-xs text-[#f3f0ed]/35">
                                                    {t(`items.${panel.contextKey}.description`)}
                                                </span>
                                            </div>
                                        </ContextMenuItem>
                                    );
                                })}
                            </ContextMenuSubContent>
                        </ContextMenuSub>
                    );
                })}
            </ContextMenuContent>
        </ContextMenu>
    );
}

function ComingSoonBadge({ label }: { label: string }) {
    return (
        <span className="rounded-full bg-[#a2dd00]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#a2dd00]">
            {label}
        </span>
    );
}

function NewBadge({ label }: { label: string }) {
    return (
        <span className="rounded-full bg-[#a2dd00]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#a2dd00]">
            {label}
        </span>
    );
}
