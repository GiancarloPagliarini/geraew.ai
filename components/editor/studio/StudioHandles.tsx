'use client';

import { Handle, Position } from '@xyflow/react';
import { Image as ImageIcon, Type } from 'lucide-react';

const HANDLE_BASE = '!h-7 !w-7 !rounded-full !border-0 !bg-[#1a2123] !shadow-md transition-colors hover:!bg-[#1e494b]';

export function StudioImageInputHandle() {
  return (
    <Handle
      type="target"
      position={Position.Left}
      id="image-in"
      className={`${HANDLE_BASE} !-translate-x-1/2`}
      style={{ top: '50%' }}
    >
      <ImageIcon className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-[#f3f0ed]/70" />
    </Handle>
  );
}

export function StudioImageOutputHandle() {
  return (
    <Handle
      type="source"
      position={Position.Right}
      id="image-out"
      className={`${HANDLE_BASE} !translate-x-1/2`}
      style={{ top: '50%' }}
    >
      <ImageIcon className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-[#f3f0ed]/70" />
    </Handle>
  );
}

export function StudioTextInputHandle() {
  return (
    <Handle
      type="target"
      position={Position.Left}
      id="text-in"
      className={`${HANDLE_BASE} !-translate-x-1/2`}
      style={{ top: 'calc(50% + 36px)' }}
    >
      <Type className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-[#f3f0ed]/70" />
    </Handle>
  );
}

export function StudioTextOutputHandle() {
  return (
    <Handle
      type="source"
      position={Position.Right}
      id="text-out"
      className={`${HANDLE_BASE} !translate-x-1/2`}
      style={{ top: '50%' }}
    >
      <Type className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-[#f3f0ed]/70" />
    </Handle>
  );
}
