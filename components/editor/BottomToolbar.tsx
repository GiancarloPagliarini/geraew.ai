'use client';

import { Hand, HelpCircle, ImageIcon, Minus, MousePointer2, PersonStanding, Plus, Trash2, Video } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BottomToolbarProps {
  zoom: number;
  isSelectMode: boolean;
  onToggleSelectMode: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onAdd: () => void;
  onAddImage: () => void;
  onAddInfluencer: () => void;
  onAddVideo: () => void;
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
  onAdd,
  onAddImage,
  onAddInfluencer,
  onAddVideo,
  onDelete,
  onFitView,
}: BottomToolbarProps) {
  return (
    <TooltipProvider>
      <div className="pointer-events-none absolute bottom-5 left-1/2 z-50 -translate-x-1/2">
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-[#f3f0ed]/[0.08] bg-[#1a2123]/90 px-2 py-1.5 shadow-2xl backdrop-blur-md">

          {/* Mode toggle — Hand / Pointer */}
          <ModeButton
            tooltip="Mover canvas"
            active={!isSelectMode}
            onClick={() => isSelectMode && onToggleSelectMode()}
          >
            <Hand className="h-4 w-4" />
          </ModeButton>

          <ModeButton
            tooltip="Selecionar nodes (arrastar para selecionar vários)"
            active={isSelectMode}
            onClick={() => !isSelectMode && onToggleSelectMode()}
          >
            <MousePointer2 className="h-4 w-4" />
          </ModeButton>

          <div className="mx-1.5 h-4 w-px bg-[#f3f0ed]/[0.08]" />

          {/* Add panels
          <ToolbarButton tooltip="Adicionar painel" onClick={onAdd}>
            <Plus className="h-4 w-4" />
          </ToolbarButton> */}

          <ToolbarButton tooltip="Gerar imagem" onClick={onAddImage}>
            <ImageIcon className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton tooltip="Criar AI Influencer" onClick={onAddInfluencer}>
            <PersonStanding className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton tooltip="Gerar Vídeo" onClick={onAddVideo}>
            <Video className="h-4 w-4" />
          </ToolbarButton>

          <div className="mx-1.5 h-4 w-px bg-[#f3f0ed]/[0.08]" />

          {/* Zoom */}
          <ToolbarButton tooltip="Reduzir" onClick={onZoomOut}>
            <Minus className="h-4 w-4" />
          </ToolbarButton>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onResetZoom}
                className="flex h-7 min-w-[3rem] items-center justify-center rounded-full px-2 text-xs font-semibold text-[#f3f0ed]/60 transition-all hover:bg-[#a2dd00]/10 hover:text-[#a2dd00]"
              >
                {Math.round(zoom * 100)}%
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              Resetar zoom
            </TooltipContent>
          </Tooltip>

          <ToolbarButton tooltip="Ampliar" onClick={onZoomIn}>
            <Plus className="h-4 w-4" />
          </ToolbarButton>

          <div className="mx-1.5 h-4 w-px bg-[#f3f0ed]/[0.08]" />

          {/* Actions */}
          <ToolbarButton tooltip="Excluir selecionado" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton tooltip="Encaixar na tela" onClick={onFitView}>
            <HelpCircle className="h-4 w-4" />
          </ToolbarButton>
        </div>
      </div>
    </TooltipProvider>
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
          className="flex h-7 w-7 items-center justify-center rounded-full text-[#f3f0ed]/40 transition-all hover:bg-[#a2dd00]/10 hover:text-[#a2dd00]"
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
