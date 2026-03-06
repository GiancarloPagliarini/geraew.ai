'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Coins, GraduationCap, ImageIcon, VideoIcon, UserRound, PlayCircle } from 'lucide-react';
import { useState } from 'react';

const tutorials = [
  {
    id: 'image',
    icon: ImageIcon,
    title: 'Gerar sua primeira imagem',
    credits: 30,
    description:
      'Aprenda a usar o painel de geração de imagens para criar artes incríveis com IA em poucos cliques.',
    steps: [
      'Abra o painel "Gerar Imagem" na barra lateral direita.',
      'Descreva a imagem que deseja criar no campo de prompt.',
      'Escolha o estilo e as configurações desejadas.',
      'Clique em "Gerar" e aguarde o resultado.',
    ],
  },
  {
    id: 'video',
    icon: VideoIcon,
    title: 'Gerar um vídeo',
    credits: 40,
    description:
      'Transforme imagens ou prompts em vídeos animados de alta qualidade usando modelos de IA de última geração.',
    steps: [
      'Abra o painel "Gerar Vídeo" na barra lateral direita.',
      'Selecione uma imagem base ou escreva um prompt de vídeo.',
      'Ajuste a duração e o estilo do vídeo.',
      'Clique em "Gerar Vídeo" e aguarde o processamento.',
    ],
  },
  {
    id: 'influencer',
    icon: UserRound,
    title: 'Criar sua IA Influencer',
    credits: 50,
    description:
      'Crie uma influencer digital completa com identidade visual, personalidade e consistência visual entre gerações.',
    steps: [
      'Acesse o painel "Criar Influencer" na barra lateral direita.',
      'Defina o nome, personalidade e estilo visual da sua influencer.',
      'Gere o modelo base da sua influencer com IA.',
      'Use a influencer criada para gerar imagens e vídeos consistentes.',
    ],
  },
];

interface TutorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TutorialDialog({ open, onOpenChange }: TutorialDialogProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const selectedTutorial = tutorials.find((t) => t.id === selected);

  function handleBack() {
    setSelected(null);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSelected(null); }}>
      <DialogContent className="border-[#f3f0ed]/[0.08] bg-[#1a2123] text-[#f3f0ed] sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col [&_[data-slot=dialog-close]]:text-[#f3f0ed]/50 [&_[data-slot=dialog-close]]:hover:text-[#f3f0ed]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#f3f0ed]">
            <GraduationCap className="h-4 w-4 text-[#a2dd00]" />
            Tutoriais
          </DialogTitle>
          <DialogDescription className="text-[#f3f0ed]/40">
            Aprenda a usar todas as funcionalidades da plataforma
          </DialogDescription>
        </DialogHeader>

        <div className="flex overflow-y-auto sidebar-scroll p-2 flex-1 -mx-1 px-1">
          {selected && selectedTutorial ? (
            <div className="flex flex-col gap-4">
              <button
                onClick={handleBack}
                className="self-start text-xs font-medium text-[#a2dd00] hover:text-[#a2dd00]/80 transition-colors"
              >
                &larr; Voltar para tutoriais
              </button>

              {/* Video placeholder */}
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#f3f0ed]/[0.03] ring-1 ring-[#f3f0ed]/[0.07] flex flex-col items-center justify-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#a2dd00]/10 ring-1 ring-[#a2dd00]/20">
                  <PlayCircle className="h-7 w-7 text-[#a2dd00]" />
                </div>
                <p className="text-xs text-[#f3f0ed]/30 font-medium">Vídeo em breve</p>
              </div>

              {/* Info */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <selectedTutorial.icon className="h-4 w-4 text-[#a2dd00]" />
                  <h3 className="text-md font-semibold text-[#f3f0ed]">{selectedTutorial.title}</h3>
                  <span className="flex items-center gap-1 rounded-full bg-[#a2dd00]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#a2dd00] ring-1 ring-[#a2dd00]/20">
                    <Coins className="h-2.5 w-2.5" />
                    +{selectedTutorial.credits} créditos ao assistir
                  </span>
                </div>
                <p className="text-sm text-[#f3f0ed]/50 leading-relaxed">{selectedTutorial.description}</p>
              </div>

              {/* Steps */}
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-bold tracking-widest text-[#f3f0ed]/30 uppercase">Passo a passo</p>
                <ol className="flex flex-col gap-2">
                  {selectedTutorial.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex text-sm h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#a2dd00]/10 text-[10px] font-bold text-[#a2dd00]">
                        {i + 1}
                      </span>
                      <span className="text-sm text-[#f3f0ed]/60 leading-relaxed pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {tutorials.map(({ id, icon: Icon, title, description, credits }) => (
                <button
                  key={id}
                  onClick={() => setSelected(id)}
                  className="group flex items-start gap-4 rounded-xl bg-[#f3f0ed]/[0.03] ring-1 ring-[#f3f0ed]/[0.06] hover:ring-[#a2dd00]/30 hover:bg-[#a2dd00]/[0.04] p-4 text-left transition-all"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#a2dd00]/10 ring-1 ring-[#a2dd00]/20 group-hover:bg-[#a2dd00]/15 transition-colors">
                    <Icon className="h-5 w-5 text-[#a2dd00]" />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[#f3f0ed]">{title}</span>
                      <span className="flex items-center gap-1 rounded-full bg-[#a2dd00]/10 px-2 py-0.5 text-[10px] font-bold text-[#a2dd00] ring-1 ring-[#a2dd00]/20">
                        <Coins className="h-2.5 w-2.5" />
                        +{credits} créditos
                      </span>
                    </div>
                    <span className="text-xs text-[#f3f0ed]/40 leading-relaxed">{description}</span>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                    <PlayCircle className="h-5 w-5 text-[#f3f0ed]/20 group-hover:text-[#a2dd00]/60 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {!selected && (
          <div className="flex items-center justify-between border-t border-[#f3f0ed]/[0.07] pt-3 -mx-6 px-6">
            <span className="text-[10px] font-medium tracking-wider text-[#f3f0ed]/30 uppercase">
              {tutorials.length} tutoriais disponíveis
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
