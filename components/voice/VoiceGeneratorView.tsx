'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Mic, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { CreationsPanel } from '@/components/image/CreationsPanel';
import { VoiceConfigPanel } from '@/components/voice/VoiceConfigPanel';
import { useGenerationTracker } from '@/components/image/use-generation-tracker';
import { kindOf } from '@/components/gallery/kind';
import type { PendingGeneration } from '@/components/image/types';

const MAX_TABS = 10;

interface Tab {
  id: number;
}

export function VoiceGeneratorView() {
  const t = useTranslations('home');
  const searchParams = useSearchParams();
  const initialTool = (['tts', 'clone'] as const).find((id) => id === searchParams.get('tool'));

  const [tabs, setTabs] = useState<Tab[]>([{ id: 1 }]);
  const [activeId, setActiveId] = useState(1);
  // mobile: alterna entre configurar e ver criações (split-view não cabe lado a lado)
  const [mobileView, setMobileView] = useState<'config' | 'creations'>('config');
  // gerações em andamento por aba — viram os previews aurora nas Criações
  const [pendingByTab, setPendingByTab] = useState<Record<number, PendingGeneration[]>>({});
  const nextId = useRef(2);
  const promptFocusers = useRef<Record<number, () => void>>({});

  // recupera gerações ainda em andamento após um reload da página
  const { accessToken } = useAuth();
  const recovery = useGenerationTracker();
  const recoveredOnce = useRef(false);
  useEffect(() => {
    if (!accessToken || recoveredOnce.current) return;
    recoveredOnce.current = true;
    (async () => {
      try {
        const [pendingPage, processingPage] = await Promise.all([
          api.generations.list(accessToken, { status: 'PENDING', limit: 20 }),
          api.generations.list(accessToken, { status: 'PROCESSING', limit: 20 }),
        ]);
        [...pendingPage.data, ...processingPage.data]
          .filter((gen) => kindOf(gen.type) === 'voice')
          .forEach((gen) => recovery.track(gen.id, gen.prompt?.trim() || ''));
      } catch { /* sem recuperação — a lista atualiza quando concluírem */ }
    })();
  }, [accessToken, recovery]);

  const allPending = useMemo(
    () => [...recovery.pending, ...Object.values(pendingByTab).flat()],
    [recovery.pending, pendingByTab],
  );

  // no mobile, ao iniciar uma geração (pendência nova), pula para as Criações
  // para o usuário ver o preview; no desktop é inócuo (toggle escondido)
  const prevPendingCount = useRef(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (allPending.length > prevPendingCount.current) setMobileView('creations');
    prevPendingCount.current = allPending.length;
  }, [allPending.length]);

  const addTab = () => {
    if (tabs.length >= MAX_TABS) {
      toast.info(t('image.maxTabs', { max: MAX_TABS }));
      return;
    }
    const id = nextId.current++;
    setTabs((prev) => [...prev, { id }]);
    setActiveId(id);
  };

  const closeTab = (id: number) => {
    setTabs((prev) => {
      if (prev.length <= 1) return prev;
      const remaining = prev.filter((tab) => tab.id !== id);
      if (id === activeId) {
        const idx = prev.findIndex((tab) => tab.id === id);
        const neighbor = remaining[Math.max(0, idx - 1)];
        setActiveId(neighbor.id);
      }
      return remaining;
    });
    setPendingByTab((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    delete promptFocusers.current[id];
  };

  const handlePendingChange = useCallback((tabId: number, pending: PendingGeneration[]) => {
    // bail por referência: sem isso, o effect do painel + arrow recriada a cada
    // render entram em loop infinito de atualização
    setPendingByTab((prev) => (prev[tabId] === pending ? prev : { ...prev, [tabId]: pending }));
  }, []);

  // reordenação por arrastar (estilo navegador): ao passar sobre outra aba
  // durante o drag, elas trocam de posição na hora
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const reorderOnDragOver = (overId: number) => {
    const fromId = draggingId;
    if (fromId === null || fromId === overId) return;
    setTabs((prev) => {
      const fromIdx = prev.findIndex((tab) => tab.id === fromId);
      const toIdx = prev.findIndex((tab) => tab.id === overId);
      if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* abas de geração (estilo navegador, até MAX_TABS simultâneas) */}
      <div className="flex items-end gap-1 overflow-x-auto border-b border-app-hairline px-5 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={active}
              tabIndex={0}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(tab.id));
                setDraggingId(tab.id);
                setActiveId(tab.id);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                reorderOnDragOver(tab.id);
              }}
              onDrop={(e) => e.preventDefault()}
              onDragEnd={() => setDraggingId(null)}
              onClick={() => setActiveId(tab.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setActiveId(tab.id);
              }}
              className={cn(
                'group flex shrink-0 cursor-pointer items-center gap-2 rounded-t-[10px] px-4 py-2.5 text-[13px] font-semibold transition-colors duration-200 ease-app',
                active
                  ? '-mb-px border border-b-0 border-app-hairline bg-app-bg text-app-text'
                  : 'text-app-text-2 hover:bg-app-surface/60 hover:text-app-text',
                draggingId === tab.id && 'opacity-60',
              )}
            >
              <Mic
                className={cn('size-[15px]', active ? 'text-app-lime' : 'text-app-muted')}
                strokeWidth={1.8}
              />
              {t('voice.tab')}
              {tabs.length > 1 && (
                <button
                  type="button"
                  aria-label={t('image.closeTab')}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="-mr-1 flex size-[18px] items-center justify-center rounded-md text-app-muted opacity-0 transition-opacity duration-150 ease-app hover:bg-app-card-hover hover:text-app-text group-hover:opacity-100"
                >
                  <X className="size-3" strokeWidth={2} />
                </button>
              )}
            </div>
          );
        })}
        <button
          type="button"
          aria-label={t('image.newTab')}
          onClick={addTab}
          className="mb-1.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-app-muted transition-colors duration-200 ease-app hover:bg-app-surface hover:text-app-text"
        >
          <Plus className="size-4" strokeWidth={1.8} />
        </button>
      </div>

      {/* mobile: alternância entre configurar e criações (lado a lado só no desktop) */}
      <div className="flex shrink-0 gap-1 border-b border-app-hairline p-2 lg:hidden">
        {(['config', 'creations'] as const).map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => setMobileView(view)}
            className={cn(
              'flex-1 rounded-lg py-2 text-[13px] font-semibold transition-colors duration-200 ease-app',
              mobileView === view ? 'bg-app-surface text-app-text' : 'text-app-text-2 hover:text-app-text',
            )}
          >
            {view === 'config' ? t('image.viewConfig') : t('image.creations')}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* config — no desktop os painéis viram filhos diretos (lg:contents);
            no mobile ficam ocultos quando se está vendo as criações */}
        <div
          className={cn(
            'flex min-h-0 w-full flex-1 flex-col lg:contents',
            mobileView === 'creations' && 'max-lg:hidden',
          )}
        >
          {/* uma instância por aba: inativas ficam montadas (estado + polling vivos), só ocultas */}
          {tabs.map((tab) => (
            <VoiceConfigPanel
              key={tab.id}
              hidden={tab.id !== activeId}
              initialTool={tab.id === 1 ? initialTool : undefined}
              onPendingChange={(pending) => handlePendingChange(tab.id, pending)}
              registerFocus={(focus) => {
                promptFocusers.current[tab.id] = focus;
              }}
            />
          ))}
        </div>

        {/* criações (compartilhado entre as abas) — oculto no mobile ao configurar */}
        <div
          className={cn(
            'flex min-h-0 min-w-0 flex-1',
            mobileView === 'config' && 'max-lg:hidden',
          )}
        >
          <CreationsPanel
            pending={allPending}
            defaultFilter="voice"
            onCreateNew={() => promptFocusers.current[activeId]?.()}
          />
        </div>
      </div>
    </div>
  );
}
