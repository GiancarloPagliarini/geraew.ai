'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Download, Expand, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

const mockImages = [
  { id: '1', src: '/mulher_escrevendo_carta.png', prompt: 'Mulher escrevendo carta' },
];

interface GalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GalleryDialog({ open, onOpenChange }: GalleryDialogProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const selectedImage = mockImages.find((img) => img.id === selected);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border-[#f3f0ed]/[0.08] bg-[#1a2123] text-[#f3f0ed] sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col [&_[data-slot=dialog-close]]:text-[#f3f0ed]/50 [&_[data-slot=dialog-close]]:hover:text-[#f3f0ed]"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#f3f0ed]">
            <ImageIcon className="h-4 w-4 text-[#a2dd00]" />
            Galeria
          </DialogTitle>
          <DialogDescription className="text-[#f3f0ed]/40">
            Suas imagens geradas com IA
          </DialogDescription>
        </DialogHeader>

        {/* Image grid */}
        <div className="overflow-y-auto sidebar-scroll flex-1 -mx-1 px-1">
          {selected && selectedImage ? (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setSelected(null)}
                className="self-start text-xs font-medium text-[#a2dd00] hover:text-[#a2dd00]/80 transition-colors"
              >
                &larr; Voltar para galeria
              </button>
              <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-[#f3f0ed]/[0.03]">
                <Image
                  src={selectedImage.src}
                  alt={selectedImage.prompt}
                  fill
                  className="object-contain"
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#f3f0ed]/60">{selectedImage.prompt}</p>
                <a
                  href={selectedImage.src}
                  download
                  className="flex items-center gap-1.5 rounded-md bg-[#a2dd00]/10 px-3 py-1.5 text-xs font-medium text-[#a2dd00] hover:bg-[#a2dd00]/20 transition-colors"
                >
                  <Download className="h-3 w-3" />
                  Download
                </a>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {mockImages.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setSelected(img.id)}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-[#f3f0ed]/[0.03] ring-1 ring-[#f3f0ed]/[0.06] hover:ring-[#a2dd00]/40 transition-all"
                >
                  <Image
                    src={img.src}
                    alt={img.prompt}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 inset-x-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] font-medium text-white truncate">{img.prompt}</p>
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Expand className="h-3.5 w-3.5 text-white drop-shadow" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        {!selected && (
          <div className="flex items-center justify-between border-t border-[#f3f0ed]/[0.07] pt-3 -mx-6 px-6">
            <span className="text-[10px] font-medium tracking-wider text-[#f3f0ed]/30 uppercase">
              {mockImages.length} imagens
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
