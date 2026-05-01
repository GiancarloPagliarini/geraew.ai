'use client';

import { ChevronRight, Fullscreen, Hand, Minus, MousePointer2, Plus, Trash2, Wrench, X } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEditor } from '@/lib/editor-context';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PANEL_GROUPS, PanelGroup, PanelType } from '@/lib/panel-groups';

interface BottomToolbarProps {
  zoom: number;
  isSelectMode: boolean;
  onToggleSelectMode: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onAddPanel: (type: PanelType) => void;
  onDelete: () => void;
  onFitView: () => void;
}

export function BottomToolbar({
  zoom,
  isSelectMode,
  onToggleSelectMode,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onAddPanel,
  onDelete,
  onFitView,
}: BottomToolbarProps) {
  const t = useTranslations('editor.bottomToolbar');
  const { leftPanelOpen } = useEditor();
  const [mobileOpen, setMobileOpen] = useState(true);
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);

  return (
    <TooltipProvider>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen((v) => !v)}
        className={`pointer-events-auto absolute bottom-5 left-1/2 z-50 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-[#a2dd00]/40 bg-[#1a2123]/90 shadow-[0_0_20px_rgba(162,221,0,0.25)] backdrop-blur-md transition-all sm:hidden ${mobileOpen || leftPanelOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <Wrench className="h-4.5 w-4.5 text-[#f3f0ed]/60" />
      </button>

      <div className={`pointer-events-none absolute top-3.5 left-1/2 z-50 w-[calc(100%-1rem)] -translate-x-1/2 sm:top-auto sm:bottom-5 sm:w-auto ${leftPanelOpen ? 'hidden sm:block' : ''} ${!mobileOpen ? 'hidden sm:block' : ''}`}>
        <div className="pointer-events-auto relative flex items-center justify-center gap-0.5 rounded-full border border-[#f3f0ed]/[0.08] bg-[#1a2123]/90 px-1.5 py-1.5 shadow-2xl backdrop-blur-md sm:px-2">

          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[#f3f0ed]/40 transition-all hover:bg-[#f3f0ed]/10 hover:text-[#f3f0ed] sm:hidden"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="mx-0.5 h-4 w-px bg-[#f3f0ed]/[0.08] sm:hidden" />

          {/* Mode toggle — Hand / Pointer */}
          <ModeButton
            tooltip={t('moveCanvas')}
            active={!isSelectMode}
            onClick={() => isSelectMode && onToggleSelectMode()}
          >
            <Hand className="h-4 w-4" />
          </ModeButton>

          <div className="hidden sm:block">
            <ModeButton
              tooltip={t('selectNodes')}
              active={isSelectMode}
              onClick={() => !isSelectMode && onToggleSelectMode()}
            >
              <MousePointer2 className="h-4 w-4" />
            </ModeButton>
          </div>

          <div className="mx-1 h-4 w-px bg-[#f3f0ed]/[0.08] sm:mx-1.5" />

          {/* Add panels — grouped */}
          {PANEL_GROUPS.map((group) => (
            <GroupButton
              key={group.id}
              group={group}
              onAddPanel={onAddPanel}
              t={t}
              open={openGroupId === group.id}
              onOpenChange={(open) => setOpenGroupId(open ? group.id : null)}
            />
          ))}

          <div className="mx-1 h-4 w-px bg-[#f3f0ed]/[0.08] sm:mx-1.5" />

          {/* Zoom */}
          <div className="flex items-center">
            <ToolbarButton tooltip={t('zoomOut')} onClick={onZoomOut}>
              <Minus className="h-4 w-4" />
            </ToolbarButton>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onResetZoom}
                  className="flex h-7 min-w-[3rem] items-center justify-center rounded-full text-xs font-semibold text-[#f3f0ed]/60 transition-all hover:bg-[#a2dd00]/10 hover:text-[#a2dd00]"
                >
                  {Math.round(zoom * 100)}%
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>
                {t('resetZoom')}
              </TooltipContent>
            </Tooltip>

            <ToolbarButton tooltip={t('zoomIn')} onClick={onZoomIn}>
              <Plus className="h-4 w-4" />
            </ToolbarButton>

            <div className="mx-1 h-4 w-px bg-[#f3f0ed]/8 sm:mx-1.5" />
          </div>

          {/* Actions */}
          <div className="hidden sm:block">
            <ToolbarButton tooltip={t('deleteSelected')} onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </ToolbarButton>
          </div>

          <ToolbarButton tooltip={t('fitView')} onClick={onFitView}>
            <Fullscreen className="h-4 w-4" />
          </ToolbarButton>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ─── Group button — opens a dropdown listing the panels in the group ─────────

function GroupButton({
  group,
  onAddPanel,
  t,
  open,
  onOpenChange,
}: {
  group: PanelGroup;
  onAddPanel: (type: PanelType) => void;
  t: ReturnType<typeof useTranslations>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const GroupIcon = group.icon;
  const groupTooltip = t(`group${group.id.charAt(0).toUpperCase()}${group.id.slice(1)}`);

  // Single-panel groups bypass the dropdown
  if (group.panels.length === 1) {
    const only = group.panels[0];
    if (only.comingSoon) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <button
                disabled
                aria-label={t(only.actionKey)}
                className="relative flex h-7 w-7 items-center justify-center rounded-full text-[#f3f0ed]/25"
              >
                <GroupIcon className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[#a2dd00]" />
              </button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            {t(only.actionKey)} — {t('comingSoon')}
          </TooltipContent>
        </Tooltip>
      );
    }
    return (
      <ToolbarButton tooltip={t(only.actionKey)} onClick={() => onAddPanel(only.type)}>
        <GroupIcon className="h-4 w-4" />
        {only.isNew ? (
          <span className="pointer-events-none absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[#a2dd00] shadow-[0_0_6px_rgba(162,221,0,0.8)]" />
        ) : null}
      </ToolbarButton>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange} modal={false}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-7 w-7 items-center justify-center rounded-full text-[#f3f0ed]/40 transition-all hover:bg-[#a2dd00]/10 hover:text-[#a2dd00] data-[state=open]:bg-[#a2dd00]/15 data-[state=open]:text-[#a2dd00]"
              aria-label={groupTooltip}
            >
              <GroupIcon className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8}>
          {groupTooltip}
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent
        side="top"
        align="center"
        sideOffset={12}
        className="min-w-[12rem] overflow-hidden rounded-xl border border-white/[0.08] bg-[#1a2123]/85 p-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_10px_30px_-12px_rgba(0,0,0,0.55)] backdrop-blur-2xl backdrop-saturate-150"
      >
        {group.panels.map((panel) => {
          const Icon = panel.icon;
          const isComingSoon = panel.comingSoon;
          const isNew = panel.isNew;
          return (
            <DropdownMenuItem
              key={panel.type}
              disabled={isComingSoon}
              onSelect={(e) => {
                if (isComingSoon) {
                  e.preventDefault();
                  return;
                }
                onAddPanel(panel.type);
              }}
              className={`group/item flex items-center gap-2.5 rounded-md px-2 py-1.5 outline-none transition-colors ${
                isComingSoon
                  ? 'opacity-50'
                  : 'cursor-pointer data-[highlighted]:bg-[#f3f0ed]/[0.045]'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-[#f3f0ed]/45 transition-colors group-data-[highlighted]/item:text-[#a2dd00]" />
              <span className="flex-1 truncate text-[12.5px] font-medium text-[#f3f0ed]/85 transition-colors group-data-[highlighted]/item:text-[#f3f0ed]">
                {t(panel.actionKey)}
              </span>
              {isComingSoon ? (
                <span className="rounded-full bg-[#a2dd00]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#a2dd00]">
                  {t('comingSoon')}
                </span>
              ) : isNew ? (
                <span className="rounded-full bg-[#a2dd00]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#a2dd00]">
                  {t('newBadge')}
                </span>
              ) : (
                <ChevronRight className="h-3 w-3 shrink-0 text-[#f3f0ed]/0 transition-all group-data-[highlighted]/item:translate-x-0.5 group-data-[highlighted]/item:text-[#a2dd00]/70" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Mode button (Hand / Pointer) — has active state ─────────────────────────

function ModeButton({
  children,
  tooltip,
  active,
  onClick,
}: {
  children: React.ReactNode;
  tooltip: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className="flex h-7 w-7 items-center justify-center rounded-full transition-all"
          style={{
            background: active ? 'rgba(162,221,0,0.15)' : 'transparent',
            color: active ? '#a2dd00' : 'rgba(243,240,237,0.4)',
          }}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Default toolbar button ───────────────────────────────────────────────────

function ToolbarButton({
  children,
  tooltip,
  onClick,
}: {
  children: React.ReactNode;
  tooltip: string;
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className="relative flex h-7 w-7 items-center justify-center rounded-full text-[#f3f0ed]/40 transition-all hover:bg-[#a2dd00]/10 hover:text-[#a2dd00]"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
