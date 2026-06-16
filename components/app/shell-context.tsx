'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

const SIDEBAR_KEY = 'geraew-app-sidebar-collapsed';

// Store externo para o estado da sidebar (persiste no localStorage).
// O primeiro render do cliente PRECISA ser igual ao do servidor ("expandida"),
// senão os useId do radix divergem (hydration mismatch); o valor salvo só é
// aplicado depois da montagem, via hydrate().
let collapsedCache = false;
let sidebarHydrated = false;
const sidebarListeners = new Set<() => void>();

const sidebarStore = {
  get(): boolean {
    return collapsedCache;
  },
  hydrate() {
    if (sidebarHydrated) return;
    sidebarHydrated = true;
    let value = false;
    try {
      const stored = localStorage.getItem(SIDEBAR_KEY);
      value = stored !== null ? stored === '1' : window.innerWidth < 768;
    } catch { /* storage indisponível */ }
    if (value !== collapsedCache) {
      collapsedCache = value;
      sidebarListeners.forEach((listener) => listener());
    }
  },
  set(value: boolean) {
    collapsedCache = value;
    try { localStorage.setItem(SIDEBAR_KEY, value ? '1' : '0'); } catch { /* noop */ }
    sidebarListeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    sidebarListeners.add(listener);
    return () => sidebarListeners.delete(listener);
  },
};

/** Duração da animação de saída da palette (ver --animate-dialog-out). */
const PALETTE_EXIT_MS = 180;

type PaletteState = 'closed' | 'open' | 'closing';

interface ShellContextValue {
  /** palette visível e interativa */
  paletteOpen: boolean;
  /** palette rodando a animação de saída (ainda montada) */
  paletteClosing: boolean;
  openPalette: () => void;
  closePalette: () => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [paletteState, setPaletteState] = useState<PaletteState>('closed');
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sidebarCollapsed = useSyncExternalStore(
    sidebarStore.subscribe,
    () => sidebarStore.get(),
    () => false,
  );

  // aplica o estado salvo da sidebar só depois da hidratação
  useEffect(() => {
    sidebarStore.hydrate();
  }, []);

  const openPalette = useCallback(() => {
    if (exitTimer.current) clearTimeout(exitTimer.current);
    setPaletteState('open');
  }, []);

  const closePalette = useCallback(() => {
    setPaletteState((s) => {
      if (s !== 'open') return s;
      if (exitTimer.current) clearTimeout(exitTimer.current);
      exitTimer.current = setTimeout(() => setPaletteState('closed'), PALETTE_EXIT_MS);
      return 'closing';
    });
  }, []);

  useEffect(() => {
    return () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteState((s) => {
          if (s === 'open') {
            if (exitTimer.current) clearTimeout(exitTimer.current);
            exitTimer.current = setTimeout(() => setPaletteState('closed'), PALETTE_EXIT_MS);
            return 'closing';
          }
          if (exitTimer.current) clearTimeout(exitTimer.current);
          return 'open';
        });
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleSidebar = useCallback(() => sidebarStore.set(!sidebarStore.get()), []);

  const paletteOpen = paletteState === 'open';
  const paletteClosing = paletteState === 'closing';

  const value = useMemo(
    () => ({ paletteOpen, paletteClosing, openPalette, closePalette, sidebarCollapsed, toggleSidebar }),
    [paletteOpen, paletteClosing, openPalette, closePalette, sidebarCollapsed, toggleSidebar],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('useShell deve ser usado dentro de ShellProvider');
  return ctx;
}
