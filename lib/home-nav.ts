import {
  AudioLines,
  BadgePercent,
  Copy,
  Flame,
  FolderOpen,
  House,
  Image,
  LayoutGrid,
  Library,
  Mic,
  PersonStanding,
  Rss,
  ScanFace,
  Search,
  SlidersHorizontal,
  SquarePlay,
  Wand2,
  Waypoints,
  type LucideIcon,
} from 'lucide-react';
import { URL_LOCALES } from '@/i18n/config';

export interface HomeNavItem {
  /** chave i18n em `home.nav.*` */
  id: string;
  icon: LucideIcon;
  /** rota de destino quando a tela já existe */
  href?: string;
  /** ação especial em vez de navegação */
  action?: 'palette';
  /** tela ainda não construída — exibe "Em breve" */
  soon?: boolean;
}

// TODO(reestruturação): apontar gerar-imagens/videos/tts/clonar para as novas
// telas dedicadas quando saírem do workspace.
export const MAIN_NAV: HomeNavItem[] = [
  { id: 'inicio', icon: House, href: '/home' },
  { id: 'pesquisar', icon: Search, action: 'palette' },
  { id: 'comunidade', icon: Rss, href: '/community' },
  { id: 'galeria', icon: FolderOpen, href: '/gallery' },
  { id: 'prompts', icon: Library, href: '/prompt-library' },
];

/** Título exibido na topbar por rota (telas internas do shell). */
export const SCREEN_TITLES: Record<string, { id: string; icon: LucideIcon }> = {
  '/prompt-library': { id: 'prompts', icon: Library },
  '/gallery': { id: 'galeria', icon: FolderOpen },
  '/clone-prompt': { id: 'clonarPrompt', icon: Copy },
  '/tools': { id: 'todasFerramentas', icon: LayoutGrid },
  '/image': { id: 'imagem', icon: Image },
  '/video': { id: 'video', icon: SquarePlay },
  '/voice': { id: 'textoParaVoz', icon: Mic },
  '/community': { id: 'comunidade', icon: Rss },
  '/pricing': { id: 'precos', icon: BadgePercent },
};

/**
 * O proxy de i18n prefixa as URLs do browser com o locale (/pt-br/..., /en/...,
 * /es/...). Remove o prefixo para comparar com as rotas internas do shell.
 */
export function stripLocalePrefix(pathname: string): string {
  const segments = pathname.split('/');
  if (segments[1] && (URL_LOCALES as readonly string[]).includes(segments[1].toLowerCase())) {
    const rest = '/' + segments.slice(2).join('/');
    return rest === '/' ? '/' : rest;
  }
  return pathname;
}

export const TOOLS_NAV: HomeNavItem[] = [
  { id: 'todasFerramentas', icon: LayoutGrid, href: '/tools' },
  { id: 'workspace', icon: Waypoints, href: '/workspaces' },
  { id: 'gerarImagens', icon: Image, href: '/image' },
  { id: 'gerarVideos', icon: SquarePlay, href: '/video' },
  { id: 'textoParaVoz', icon: Mic, href: '/voice' },
  { id: 'clonarPrompt', icon: Copy, href: '/clone-prompt' },
];

export interface QuickAction {
  /** chave i18n em `home.quick.*` (title/desc) */
  id: string;
  icon: LucideIcon;
  href: string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'workspace', icon: Waypoints, href: '/workspaces' },
  { id: 'imagem', icon: Image, href: '/image' },
  { id: 'video', icon: SquarePlay, href: '/video' },
  { id: 'audio', icon: AudioLines, href: '/voice' },
  { id: 'avatares', icon: ScanFace, href: '/workspace' },
  { id: 'tiktokShop', icon: Flame, href: '/workspace' },
];

/** Painel "Ferramentas" do dashboard (atalhos fixados — só telas já em produção) */
export const PINNED_TOOLS: QuickAction[] = [
  { id: 'workspace', icon: Waypoints, href: '/workspaces' },
  { id: 'gerarImagens', icon: Image, href: '/image' },
  { id: 'gerarVideos', icon: SquarePlay, href: '/video' },
  { id: 'textoParaVoz', icon: Mic, href: '/voice' },
  { id: 'melhorarImagem', icon: Wand2, href: '/image' },
  { id: 'clonarPrompt', icon: Copy, href: '/clone-prompt' },
  { id: 'copiarMovimentos', icon: PersonStanding, href: '/video' },
  { id: 'clonarVoz', icon: AudioLines, href: '/voice' },
];

// ─── Command palette (Ctrl K) ────────────────────────────────────────────────

export interface PaletteCommand {
  /** chave i18n em `home.palette.commands.*` */
  id: string;
  icon: LucideIcon;
  href?: string;
  soon?: boolean;
  /** tecla do atalho global Ctrl+Shift+<tecla> */
  shortcut?: string;
  /** aparece no grupo Navegação quando não há busca */
  nav?: boolean;
}

export const PALETTE_COMMANDS: PaletteCommand[] = [
  // navegação (com atalhos)
  { id: 'abrirGaleria', icon: FolderOpen, href: '/gallery', shortcut: 'G', nav: true },
  { id: 'criarImagem', icon: Image, href: '/image', shortcut: 'F', nav: true },
  { id: 'editarImagem', icon: SlidersHorizontal, href: '/workspace', shortcut: 'E', nav: true },
  { id: 'criarVideo', icon: SquarePlay, href: '/video', shortcut: 'V', nav: true },
  { id: 'textoParaVoz', icon: Mic, href: '/voice', shortcut: 'T', nav: true },
  { id: 'criarWorkspace', icon: Waypoints, href: '/workspace', shortcut: 'L', nav: true },
  // ações extras (aparecem em Recentes/busca)
  { id: 'visitarComunidade', icon: Rss, href: '/community' },
  { id: 'abrirGeradorImagens', icon: Image, href: '/image' },
  { id: 'abrirTextoParaVoz', icon: Mic, href: '/voice' },
];

/** Recentes padrão exibidos até o usuário usar a palette. */
export const DEFAULT_PALETTE_RECENTS = [
  'visitarComunidade',
  'abrirGeradorImagens',
  'abrirTextoParaVoz',
];
