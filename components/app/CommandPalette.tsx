'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CornerDownLeft, Image as ImageIcon, Mic, Search } from 'lucide-react';
import { cn, normalizeSearch } from '@/lib/utils';
import {
  DEFAULT_PALETTE_RECENTS,
  PALETTE_COMMANDS,
  type PaletteCommand,
} from '@/lib/home-nav';
import { useShell } from '@/components/app/shell-context';

const RECENTS_KEY = 'geraew-palette-recents';

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (raw) {
      const ids = (JSON.parse(raw) as string[]).filter((id) =>
        PALETTE_COMMANDS.some((c) => c.id === id),
      );
      if (ids.length > 0) return ids.slice(0, 3);
    }
  } catch { /* storage indisponível */ }
  return DEFAULT_PALETTE_RECENTS;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="flex h-[22px] min-w-[22px] items-center justify-center rounded-md border border-app-hairline-2 bg-app-bg px-1.5 font-mono text-[11px] leading-none text-app-muted">
      {children}
    </kbd>
  );
}

interface Row {
  command: PaletteCommand;
  group: 'recents' | 'navigation';
}

export function CommandPalette() {
  const { paletteOpen, paletteClosing } = useShell();
  // monta o dialog do zero a cada abertura (estado sempre limpo) e mantém
  // montado durante a animação de saída
  if (!paletteOpen && !paletteClosing) return null;
  return <PaletteDialog closing={paletteClosing} />;
}

function PaletteDialog({ closing }: { closing: boolean }) {
  const t = useTranslations('home');
  const router = useRouter();
  const { closePalette } = useShell();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [recents, setRecents] = useState<string[]>(loadRecents);

  const rows = useMemo<Row[]>(() => {
    if (query.trim()) {
      const q = normalizeSearch(query);
      return PALETTE_COMMANDS.filter((c) =>
        normalizeSearch(t(`palette.commands.${c.id}`)).includes(q),
      ).map((command) => ({ command, group: 'navigation' as const }));
    }
    const recentRows: Row[] = recents
      .map((id) => PALETTE_COMMANDS.find((c) => c.id === id))
      .filter((c): c is PaletteCommand => !!c)
      .map((command) => ({ command, group: 'recents' as const }));
    const navRows: Row[] = PALETTE_COMMANDS.filter((c) => c.nav).map((command) => ({
      command,
      group: 'navigation' as const,
    }));
    return [...recentRows, ...navRows];
  }, [query, recents, t]);

  const run = useCallback(
    (command: PaletteCommand, newTab = false) => {
      if (command.soon) {
        toast.info(t('soon'));
        return;
      }
      if (!command.href) return;
      setRecents((prev) => {
        const next = [command.id, ...prev.filter((id) => id !== command.id)].slice(0, 3);
        try { localStorage.setItem(RECENTS_KEY, JSON.stringify(next)); } catch { /* noop */ }
        return next;
      });
      closePalette();
      if (newTab) window.open(command.href, '_blank', 'noopener');
      else router.push(command.href);
    },
    [closePalette, router, t],
  );

  useEffect(() => {
    if (closing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePalette();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, rows.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const row = rows[selected];
        if (row) run(row.command, e.ctrlKey || e.metaKey);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closing, rows, selected, closePalette, run]);

  const groups: { key: Row['group']; label: string }[] = [
    { key: 'recents', label: t('palette.recents') },
    { key: 'navigation', label: t('palette.navigation') },
  ];

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-[rgba(8,10,11,0.7)] backdrop-blur-[6px]',
        closing ? 'pointer-events-none animate-overlay-out' : 'animate-overlay-in',
      )}
      onClick={closePalette}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('palette.title')}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'mx-auto mt-[11vh] flex max-h-[72vh] w-[min(760px,calc(100vw-32px))] flex-col overflow-hidden rounded-[18px] border border-app-hairline-2 bg-app-card shadow-[0_30px_80px_rgba(0,0,0,0.6)]',
          closing ? 'animate-dialog-out' : 'animate-dialog-in',
        )}
      >
        {/* input */}
        <div className="flex items-center gap-3 border-b border-app-hairline px-5 py-4">
          <Search className="size-5 shrink-0 text-app-muted" strokeWidth={1.8} />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            placeholder={t('palette.placeholder')}
            className="w-full min-w-0 bg-transparent text-[17px] text-app-text outline-none placeholder:text-app-muted"
          />
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label={t('palette.voiceSearch')}
              onClick={() => toast.info(t('soon'))}
              className="flex size-7 items-center justify-center rounded-lg text-app-muted transition-colors duration-200 ease-app hover:bg-app-surface hover:text-app-text"
            >
              <Mic className="size-[17px]" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              aria-label={t('palette.imageSearch')}
              onClick={() => toast.info(t('soon'))}
              className="flex size-7 items-center justify-center rounded-lg text-app-muted transition-colors duration-200 ease-app hover:bg-app-surface hover:text-app-text"
            >
              <ImageIcon className="size-[17px]" strokeWidth={1.8} />
            </button>
            <Kbd>Ctrl K</Kbd>
          </div>
        </div>

        {/* resultados */}
        <div className="min-h-0 flex-1 overflow-y-auto p-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {rows.length === 0 && (
            <p className="px-3 py-8 text-center text-[14px] text-app-muted">{t('palette.empty')}</p>
          )}
          {groups.map(({ key, label }) => {
            const items = rows.filter((r) => r.group === key);
            if (items.length === 0) return null;
            return (
              <div key={key} className="mb-1">
                <p className="px-3 pb-1.5 pt-2.5 text-[11px] font-bold uppercase tracking-[0.9px] text-app-muted">
                  {label}
                </p>
                {items.map((row) => {
                  const idx = rows.indexOf(row);
                  const { command } = row;
                  const Icon = command.icon;
                  const isSelected = idx === selected;
                  return (
                    <button
                      key={`${row.group}-${command.id}`}
                      type="button"
                      onMouseEnter={() => setSelected(idx)}
                      onClick={(e) => run(command, e.ctrlKey || e.metaKey)}
                      className={cn(
                        'flex w-full items-center gap-3.5 rounded-xl px-3 py-2 text-left transition-colors duration-150 ease-app',
                        isSelected && 'bg-app-surface ring-1 ring-inset ring-app-hairline-2',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-[38px] shrink-0 items-center justify-center rounded-[10px] border transition-colors duration-150 ease-app',
                          isSelected
                            ? 'border-[rgba(162,221,0,0.4)] bg-[rgba(162,221,0,0.16)]'
                            : 'border-[rgba(162,221,0,0.18)] bg-[rgba(162,221,0,0.07)]',
                        )}
                      >
                        <Icon className="size-[18px] text-app-lime" strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-app-text">
                        {t(`palette.commands.${command.id}`)}
                      </span>
                      {command.soon ? (
                        <span className="shrink-0 rounded-md border border-app-hairline-2 px-1.5 py-0.5 font-mono text-[11px] text-app-muted">
                          {t('soon')}
                        </span>
                      ) : command.shortcut ? (
                        <Kbd>Ctrl ⇧ {command.shortcut}</Kbd>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* rodapé */}
        <div className="flex items-center gap-5 border-t border-app-hairline px-5 py-3 text-[12.5px] text-app-text-2">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            {t('palette.navigate')}
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd>
            {t('palette.select')}
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>ESC</Kbd>
            {t('palette.close')}
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <Kbd>
              <span className="flex items-center gap-0.5">
                Ctrl <CornerDownLeft className="size-3" strokeWidth={2} />
              </span>
            </Kbd>
            {t('palette.newTab')}
          </span>
        </div>
      </div>
    </div>
  );
}
