'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Ellipsis,
  Heart,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  UserRound,
  Waypoints,
  X,
} from 'lucide-react';
import { cn, formatRelativeTime, normalizeSearch } from '@/lib/utils';
import { api, type WorkspaceSummary } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { EmptyState } from '@/components/app/EmptyState';
import { importLegacyCanvas } from '@/components/workspaces/legacy';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const menuItemClass =
  'cursor-pointer rounded-lg px-2.5 py-2 text-[13px] text-app-text-2 focus:bg-app-surface focus:text-app-text';

interface CardProps {
  item: WorkspaceSummary;
  onOpen: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onToggleFavorite: (item: WorkspaceSummary) => void;
  onDelete: (id: string) => void;
}

function WorkspaceCard({ item, onOpen, onRename, onToggleFavorite, onDelete }: CardProps) {
  const t = useTranslations('home');
  const locale = useLocale();
  const [renaming, setRenaming] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [imgError, setImgError] = useState(false);
  const showThumb = !!item.thumbnailUrl && !imgError;
  // ao escolher "Renomear", impede o menu de devolver o foco ao trigger
  // (senão ele rouba o autoFocus do input)
  const renameFocusRef = useRef(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // garante o foco mesmo se o Radix restaurar o foco depois do mount do input
  useEffect(() => {
    if (!renaming) return;
    const timer = setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 80);
    return () => clearTimeout(timer);
  }, [renaming]);
  const title = item.name.trim() || t('workspaces.untitled');

  const commitRename = (value: string) => {
    setRenaming(false);
    const name = value.trim();
    if (name && name !== item.name) onRename(item.id, name);
  };

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => onOpen(item.id)}
        className="block w-full text-left transition-transform duration-200 ease-app hover:-translate-y-0.5"
      >
        <div className="relative aspect-[3/2] overflow-hidden rounded-xl border border-app-hairline bg-[linear-gradient(135deg,#1d2628,#161d1f)] transition-colors duration-200 ease-app group-hover:border-app-hairline-2">
          {showThumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnailUrl!}
              alt=""
              loading="lazy"
              onError={() => setImgError(true)}
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            /* sem thumbnail (ou falhou): preview abstrato de canvas (aurora) */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/aurora-collage.svg"
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          )}
          {item.favorite && (
            <Heart
              className="absolute left-2.5 top-2.5 size-4 text-app-lime"
              strokeWidth={2}
              fill="currentColor"
            />
          )}
        </div>
      </button>

      {/* menu de ações — aparece no hover */}
      <DropdownMenu onOpenChange={(open) => !open && setDeleteArmed(false)}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t('shell.more')}
            className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-lg bg-[rgba(13,16,17,0.65)] text-app-text opacity-0 backdrop-blur-md transition-opacity duration-200 ease-app hover:bg-[rgba(13,16,17,0.85)] focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
          >
            <Ellipsis className="size-4" strokeWidth={1.8} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={6}
          className="w-52 rounded-xl border-app-hairline-2 bg-app-card p-1.5 text-app-text shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
          onCloseAutoFocus={(e) => {
            if (renameFocusRef.current) {
              e.preventDefault();
              renameFocusRef.current = false;
            }
          }}
        >
          <DropdownMenuItem
            className={menuItemClass}
            onSelect={() => {
              renameFocusRef.current = true;
              setRenaming(true);
            }}
          >
            <Pencil className="size-4" strokeWidth={1.8} />
            {t('workspaces.rename')}
          </DropdownMenuItem>
          <DropdownMenuItem className={menuItemClass} onSelect={() => onToggleFavorite(item)}>
            <Heart
              className="size-4"
              strokeWidth={1.8}
              fill={item.favorite ? 'currentColor' : 'none'}
            />
            {item.favorite ? t('workspaces.unfavorite') : t('workspaces.favorite')}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-app-hairline" />
          <DropdownMenuItem
            className="cursor-pointer rounded-lg px-2.5 py-2 text-[13px] text-red-400 focus:bg-app-surface focus:text-red-400"
            onSelect={(e) => {
              if (!deleteArmed) {
                e.preventDefault();
                setDeleteArmed(true);
                return;
              }
              onDelete(item.id);
            }}
          >
            <Trash2 className="size-4 text-red-400" strokeWidth={1.8} />
            {deleteArmed ? t('workspaces.confirmDelete') : t('workspaces.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {renaming ? (
        <input
          ref={renameInputRef}
          autoFocus
          defaultValue={item.name}
          maxLength={120}
          onBlur={(e) => commitRename(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              e.currentTarget.value = item.name;
              e.currentTarget.blur();
            }
          }}
          className="mt-2 w-full rounded-md border border-[rgba(162,221,0,0.4)] bg-app-surface px-2 py-1 text-[14px] font-semibold text-app-text outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => onOpen(item.id)}
          className="mt-2.5 block w-full truncate text-left text-[14px] font-semibold text-app-text"
        >
          {title}
        </button>
      )}
      <p className="mt-0.5 font-mono text-[12px] text-app-muted">
        {formatRelativeTime(item.updatedAt, locale)}
      </p>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="mt-7 grid gap-x-7 gap-y-8 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i}>
          <div className="aspect-[3/2] skeleton-app rounded-xl bg-app-surface" />
          <div className="mt-2.5 h-4 w-2/3 skeleton-app rounded bg-app-surface" />
          <div className="mt-1.5 h-3 w-1/3 skeleton-app rounded bg-app-surface" />
        </div>
      ))}
    </div>
  );
}

export function WorkspacesView() {
  const t = useTranslations('home');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, accessToken } = useAuth();
  const [favOnly, setFavOnly] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const migrationRan = useRef(false);

  const { data, isPending } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => api.workspaces.list(accessToken!),
    enabled: !!accessToken && !!user,
  });

  // importa o canvas legado (localStorage) como primeiro workspace, uma única vez
  useEffect(() => {
    if (!accessToken || migrationRan.current) return;
    migrationRan.current = true;
    importLegacyCanvas(accessToken).then((imported) => {
      if (imported) queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    });
  }, [accessToken, queryClient]);

  const createMutation = useMutation({
    mutationFn: () => api.workspaces.create(accessToken!),
    onSuccess: (ws) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      router.push(`/workspace?id=${ws.id}`);
    },
    onError: () => toast.error(t('workspaces.error')),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.workspaces.update(accessToken!, id, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspaces'] }),
    onError: () => toast.error(t('workspaces.error')),
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) =>
      api.workspaces.update(accessToken!, id, { favorite }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspaces'] }),
    onError: () => toast.error(t('workspaces.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.workspaces.remove(accessToken!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success(t('workspaces.deleted'));
    },
    onError: () => toast.error(t('workspaces.error')),
  });

  const items = useMemo(() => {
    const all = data ?? [];
    const q = normalizeSearch(query.trim());
    return all.filter((w) => {
      if (favOnly && !w.favorite) return false;
      if (q && !normalizeSearch(w.name.trim() || t('workspaces.untitled')).includes(q)) return false;
      return true;
    });
  }, [data, favOnly, query, t]);

  const openWorkspace = (id: string) => router.push(`/workspace?id=${id}`);

  return (
    // toda a área é o container de scroll, no padrão das demais telas
    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-app">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col px-6 pb-16 pt-7 lg:px-11">
        {/* cabeçalho */}
        <h1 className="text-[28px] font-bold tracking-[-0.6px] text-app-text sm:text-4xl">
          {t('workspaces.title')}
        </h1>
        <p className="mt-1.5 text-[14px] text-app-text-2 sm:text-[15px]">{t('workspaces.subtitle')}</p>

        {/* abas + ações */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="flex h-10 items-center gap-2 rounded-full bg-app-surface px-4 text-[13.5px] font-semibold text-app-text"
            >
              <UserRound className="size-4 text-app-lime" strokeWidth={1.8} />
              {t('workspaces.mine')}
            </button>
            {/* TODO(workspaces): habilitar quando colaboração/compartilhamento existir */}
            <button
              type="button"
              disabled
              title={t('soon')}
              className="flex h-10 cursor-not-allowed items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold text-app-muted max-sm:hidden"
            >
              <Lock className="size-4" strokeWidth={1.8} />
              {t('workspaces.shared')}
            </button>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              aria-label={t('workspaces.new')}
              className="flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border border-app-hairline-2 px-4 text-[13.5px] font-semibold text-app-text transition-colors duration-200 ease-app hover:bg-app-surface disabled:opacity-60 max-sm:w-10 max-sm:px-0"
            >
              {createMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" strokeWidth={1.8} />
              ) : (
                <Plus className="size-4" strokeWidth={1.8} />
              )}
              <span className="max-sm:hidden">{t('workspaces.new')}</span>
            </button>
            <button
              type="button"
              aria-label={t('workspaces.favorites')}
              aria-pressed={favOnly}
              onClick={() => setFavOnly((v) => !v)}
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ease-app hover:bg-app-surface',
                favOnly ? 'text-app-lime' : 'text-app-text-2 hover:text-app-text',
              )}
            >
              <Heart
                className="size-[18px]"
                strokeWidth={1.8}
                fill={favOnly ? 'currentColor' : 'none'}
              />
            </button>
            {/* TODO(workspaces): filtros (data, tipo) quando fizerem sentido */}
            <button
              type="button"
              disabled
              title={t('soon')}
              aria-label={t('workspaces.filters')}
              className="flex size-10 shrink-0 cursor-not-allowed items-center justify-center rounded-full text-app-muted max-sm:hidden"
            >
              <SlidersHorizontal className="size-[18px]" strokeWidth={1.8} />
            </button>
            {searchOpen ? (
              <div className="flex h-10 w-[200px] items-center gap-2 rounded-full border border-app-hairline bg-app-surface px-3.5 transition-colors duration-200 ease-app focus-within:border-[rgba(162,221,0,0.4)] sm:w-[260px]">
                <Search className="size-4 shrink-0 text-app-muted" strokeWidth={1.8} />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('workspaces.searchPlaceholder')}
                  className="w-full bg-transparent text-[13.5px] text-app-text outline-none placeholder:text-app-muted"
                />
                <button
                  type="button"
                  aria-label={t('palette.close')}
                  onClick={() => {
                    setSearchOpen(false);
                    setQuery('');
                  }}
                  className="text-app-muted transition-colors duration-200 ease-app hover:text-app-text"
                >
                  <X className="size-4" strokeWidth={1.8} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                aria-label={t('workspaces.searchPlaceholder')}
                onClick={() => setSearchOpen(true)}
                className="flex size-10 items-center justify-center rounded-full text-app-text-2 transition-colors duration-200 ease-app hover:bg-app-surface hover:text-app-text"
              >
                <Search className="size-[18px]" strokeWidth={1.8} />
              </button>
            )}
          </div>
        </div>

        {/* grade de workspaces */}
        {isPending ? (
          <GridSkeleton />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Waypoints}
            title={t('workspaces.empty')}
            hint={t('workspaces.emptyHint')}
            cta={{ label: t('workspaces.new'), onClick: () => createMutation.mutate() }}
            className="mt-7"
          />
        ) : (
          <div className="mt-7 grid gap-x-7 gap-y-8 [grid-template-columns:repeat(auto-fill,minmax(210px,1fr))]">
            {items.map((item) => (
              <WorkspaceCard
                key={item.id}
                item={item}
                onOpen={openWorkspace}
                onRename={(id, name) => renameMutation.mutate({ id, name })}
                onToggleFavorite={(w) =>
                  favoriteMutation.mutate({ id: w.id, favorite: !w.favorite })
                }
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
