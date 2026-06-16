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
  MicVocal,
  PersonStanding,
  Replace,
  Rss,
  ScanFace,
  Search,
  Shirt,
  SquarePlay,
  UserRound,
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
  '/avatar': { id: 'avatar', icon: ScanFace },
  '/tiktok-shop': { id: 'tiktokShop', icon: Flame },
  '/community': { id: 'comunidade', icon: Rss },
  '/pricing': { id: 'precos', icon: BadgePercent },
  '/perfil': { id: 'perfil', icon: UserRound },
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

/**
 * Navegação inferior do mobile (substitui a sidebar abaixo de `lg`).
 * Início · Pesquisar · Comunidade · Galeria · Workspace · Ferramentas.
 */
export const MOBILE_NAV: HomeNavItem[] = [
  { id: 'inicio', icon: House, href: '/home' },
  { id: 'pesquisar', icon: Search, action: 'palette' },
  { id: 'comunidade', icon: Rss, href: '/community' },
  { id: 'galeria', icon: FolderOpen, href: '/gallery' },
  { id: 'workspace', icon: Waypoints, href: '/workspaces' },
  { id: 'ferramentas', icon: LayoutGrid, href: '/tools' },
];

export const TOOLS_NAV: HomeNavItem[] = [
  { id: 'todasFerramentas', icon: LayoutGrid, href: '/tools' },
  { id: 'workspace', icon: Waypoints, href: '/workspaces' },
  { id: 'gerarImagens', icon: Image, href: '/image' },
  { id: 'gerarVideos', icon: SquarePlay, href: '/video' },
  { id: 'avatar', icon: ScanFace, href: '/avatar' },
  { id: 'textoParaVoz', icon: Mic, href: '/voice' },
  { id: 'clonarPrompt', icon: Copy, href: '/clone-prompt' },
  { id: 'tiktokShop', icon: Flame, href: '/tiktok-shop' },
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
  { id: 'avatares', icon: ScanFace, href: '/avatar' },
  { id: 'tiktokShop', icon: Flame, href: '/tiktok-shop' },
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
  /** aparece no grupo Navegação quando não há busca */
  nav?: boolean;
}

export const PALETTE_COMMANDS: PaletteCommand[] = [
  // navegação principal — grupo Navegação por padrão
  { id: 'gerarImagens', icon: Image, href: '/image', nav: true },
  { id: 'gerarVideos', icon: SquarePlay, href: '/video', nav: true },
  { id: 'textoParaVoz', icon: Mic, href: '/voice', nav: true },
  { id: 'abrirGaleria', icon: FolderOpen, href: '/gallery', nav: true },
  { id: 'criarWorkspace', icon: Waypoints, href: '/workspaces', nav: true },
  // demais ferramentas (aparecem na busca)
  { id: 'provadorVirtual', icon: Shirt, href: '/image?tool=try-on' },
  { id: 'trocaDeRosto', icon: Replace, href: '/image?tool=face-swap' },
  { id: 'melhorarImagem', icon: Wand2, href: '/image?tool=upscale' },
  { id: 'copiarMovimentos', icon: PersonStanding, href: '/video?tool=motion-control' },
  { id: 'clonarVoz', icon: MicVocal, href: '/voice?tool=clone' },
  { id: 'avatar', icon: ScanFace, href: '/avatar' },
  { id: 'tiktokShop', icon: Flame, href: '/tiktok-shop' },
  { id: 'clonarPrompt', icon: Copy, href: '/clone-prompt' },
  { id: 'bibliotecaPrompts', icon: Library, href: '/prompt-library' },
  { id: 'visitarComunidade', icon: Rss, href: '/community' },
  { id: 'todasFerramentas', icon: LayoutGrid, href: '/tools' },
  { id: 'precos', icon: BadgePercent, href: '/pricing' },
  { id: 'perfil', icon: UserRound, href: '/perfil' },
];

/** Recentes padrão exibidos até o usuário usar a palette. */
export const DEFAULT_PALETTE_RECENTS = [
  'visitarComunidade',
  'gerarImagens',
  'textoParaVoz',
];
