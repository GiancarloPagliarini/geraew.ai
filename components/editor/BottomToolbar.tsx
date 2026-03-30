'use client';

import { AudioWaveform, Fullscreen, Hand, HelpCircle, ImageIcon, LayoutGrid, Minus, MousePointer2, PersonStanding, Plus, Repeat2, Shirt, Trash2, Video, Wrench, X } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useEditor } from '@/lib/editor-context';
import { useState } from 'react';

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
  onAddMotionControl: () => void;
  onAddVirtualTryOn: () => void;
  onAddFaceSwap: () => void;
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
  onAddMotionControl,
  onAddVirtualTryOn,
  onAddFaceSwap,
  onDelete,
  onFitView,
}: BottomToolbarProps) {
  const { leftPanelOpen } = useEditor();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <TooltipProvider>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen((v) => !v)}
        className={`pointer-events-auto absolute bottom-5 left-1/2 z-50 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-[#a2dd00]/40 bg-[#1a2123]/90 shadow-[0_0_20px_rgba(162,221,0,0.25)] backdrop-blur-md transition-all sm:hidden ${mobileOpen || leftPanelOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <Wrench className="h-4.5 w-4.5 text-[#f3f0ed]/60" />
      </button>

      <div className={`pointer-events-none absolute top-3 left-1/2 z-50 w-[calc(100%-1rem)] -translate-x-1/2 sm:top-auto sm:bottom-5 sm:w-auto ${leftPanelOpen ? 'hidden sm:block' : ''} ${!mobileOpen ? 'hidden sm:block' : ''}`}>
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
            tooltip="Mover canvas"
            active={!isSelectMode}
            onClick={() => isSelectMode && onToggleSelectMode()}
          >
            <Hand className="h-4 w-4" />
          </ModeButton>

          <div className="hidden sm:block">
            <ModeButton
              tooltip="Selecionar nodes (arrastar para selecionar vários)"
              active={isSelectMode}
              onClick={() => !isSelectMode && onToggleSelectMode()}
            >
              <MousePointer2 className="h-4 w-4" />
            </ModeButton>
          </div>

          <div className="mx-1 h-4 w-px bg-[#f3f0ed]/[0.08] sm:mx-1.5" />

          {/* Add panels */}
          <ToolbarButton tooltip="Gerar imagem" onClick={onAddImage}>
            <ImageIcon className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton tooltip="Criar AI Influencer" onClick={onAddInfluencer}>
            <PersonStanding className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton tooltip="Gerar Vídeo" onClick={onAddVideo}>
            <Video className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton tooltip="Copiar movimentos" onClick={onAddMotionControl}>
            <AudioWaveform className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton tooltip="Provador Virtual" onClick={onAddVirtualTryOn}>
            <Shirt className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton tooltip="Troca de Rosto" onClick={onAddFaceSwap}>
            <Repeat2 className="h-4 w-4" />
          </ToolbarButton>
          {/*
          <ToolbarButton tooltip="Painel customizável" onClick={onAdd}>
            <LayoutGrid className="h-4 w-4" />
          </ToolbarButton> */}

          <div className="mx-1 h-4 w-px bg-[#f3f0ed]/[0.08] sm:mx-1.5" />

          {/* Zoom */}
          <div className="flex items-center">
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
              <TooltipContent side="bottom" sideOffset={8}>
                Resetar zoom
              </TooltipContent>
            </Tooltip>

            <ToolbarButton tooltip="Ampliar" onClick={onZoomIn}>
              <Plus className="h-4 w-4" />
            </ToolbarButton>

            <div className="mx-1 h-4 w-px bg-[#f3f0ed]/8 sm:mx-1.5" />
          </div>

          {/* Actions */}
          <ToolbarButton tooltip="Excluir selecionado" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton tooltip="Encaixar na tela" onClick={onFitView}>
            <Fullscreen className="h-4 w-4" />
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
