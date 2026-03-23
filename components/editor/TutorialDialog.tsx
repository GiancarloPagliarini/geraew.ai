'use client';

import { GraduationCap, ImageIcon, VideoIcon, UserRound, PlayCircle, X } from 'lucide-react';
import { useState } from 'react';

const tutorials = [
  {
    id: 'image',
    icon: ImageIcon,
    showVideo: true,
    title: 'Gerar sua primeira imagem',
    description:
      'Aprenda a usar o painel de geração de imagens para criar artes incríveis com IA em poucos cliques.',
    steps: [
      'Abra o painel "Gerar Imagem".',
      'Descreva a imagem que deseja criar no campo de prompt.',
      'Escolha o estilo e as configurações desejadas.',
      'Clique em "Gerar" e aguarde o resultado.',
    ],
  },
  {
    id: 'video',
    icon: VideoIcon,
    showVideo: true,
    title: 'Gerar um vídeo',
    description:
      'Transforme imagens ou prompts em vídeos animados de alta qualidade usando modelos de IA de última geração.',
    steps: [
      'Abra o painel "Gerar Vídeo".',
      'Selecione uma imagem base ou escreva um prompt de vídeo.',
      'Ajuste a duração e o estilo do vídeo.',
      'Clique em "Gerar Vídeo" e aguarde o processamento.',
    ],
  },
  {
    id: 'influencer',
    icon: UserRound,
    showVideo: false,
    title: 'Criar sua IA Influencer',
    description:
      'Crie uma influencer digital completa com identidade visual, personalidade e consistência visual entre gerações.',
    steps: [
      'Acesse o painel "Criar Influencer".',
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

  if (!open) return null;

  return (
    <aside className="aside-in-left fixed inset-0 z-50 flex flex-col border-r border-[#f3f0ed]/[0.07] bg-[#1a2123] text-[#f3f0ed] overflow-hidden sm:static sm:h-full sm:w-xl sm:shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#f3f0ed]/[0.05] bg-gradient-to-b from-[#f3f0ed]/[0.02] to-transparent px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#a2dd00]/10">
            <GraduationCap className="h-3.5 w-3.5 text-[#a2dd00]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#f3f0ed]/60">Tutoriais</h2>
            <p className="text-xs text-[#f3f0ed]/30">Aprenda a usar todas as funcionalidades</p>
          </div>
        </div>
        <button
          onClick={() => { onOpenChange(false); setSelected(null); }}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[#f3f0ed]/30 hover:bg-[#f3f0ed]/5 hover:text-[#f3f0ed]/70 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden px-4 py-3 gap-3">
        <div className="flex overflow-y-auto sidebar-scroll flex-1">
          {selected && selectedTutorial ? (
            <div className="flex flex-col gap-4">
              <button
                onClick={handleBack}
                className="self-start text-xs font-medium text-[#a2dd00] hover:text-[#a2dd00]/80 transition-colors"
              >
                &larr; Voltar para tutoriais
              </button>

              {/* Video placeholder */}
              {selectedTutorial.showVideo && (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#f3f0ed]/[0.03] ring-1 ring-[#f3f0ed]/[0.07] flex flex-col items-center justify-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#a2dd00]/10 ring-1 ring-[#a2dd00]/20">
                    <PlayCircle className="h-7 w-7 text-[#a2dd00]" />
                  </div>
                  <p className="text-xs text-[#f3f0ed]/30 font-medium">Vídeo em breve</p>
                </div>
              )}

              {/* Info */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <selectedTutorial.icon className="h-4 w-4 text-[#a2dd00]" />
                  <h3 className="text-md font-semibold text-[#f3f0ed]">{selectedTutorial.title}</h3>
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
              {tutorials.map(({ id, icon: Icon, title, description }) => (
                <button
                  key={id}
                  onClick={() => setSelected(id)}
                  className="group flex items-start gap-4 rounded-xl bg-[#f3f0ed]/[0.03] ring-[#f3f0ed]/[0.06] hover:ring-[#a2dd00]/30 hover:bg-[#a2dd00]/[0.04] p-4 text-left transition-all"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#a2dd00]/10 ring-1 ring-[#a2dd00]/20 group-hover:bg-[#a2dd00]/15 transition-colors">
                    <Icon className="h-5 w-5 text-[#a2dd00]" />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[#f3f0ed]">{title}</span>
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
          <div className="flex items-center justify-between border-t border-[#f3f0ed]/[0.07] pt-3">
            <span className="text-[10px] font-medium tracking-wider text-[#f3f0ed]/30 uppercase">
              {tutorials.length} tutoriais disponíveis
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
