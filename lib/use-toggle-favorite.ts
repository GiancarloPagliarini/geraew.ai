'use client';

import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { api, type GalleryItem, type PaginatedResponse } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type FavItem = { id: string; isFavorited?: boolean };
type GalleryInfinite = InfiniteData<PaginatedResponse<GalleryItem>>;

/** caches afetados: criações (['image-creations', filter, favOnly]) e galeria (['gallery', ...]) */
const isFavCache = (queryKey: readonly unknown[]) =>
  queryKey[0] === 'image-creations' || queryKey[0] === 'gallery';

/**
 * Aplica o novo estado de favorito num cache de lista infinita. Em views de
 * "apenas favoritos" (favOnly), remove o item ao desfavoritar para ele sumir na hora.
 */
function applyFavorite(
  data: GalleryInfinite | undefined,
  id: string,
  newVal: boolean,
  dropWhenUnfavorited: boolean,
): GalleryInfinite | undefined {
  if (!data?.pages) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      data:
        dropWhenUnfavorited && !newVal
          ? page.data.filter((it) => it.id !== id)
          : page.data.map((it) => (it.id === id ? { ...it, isFavorited: newVal } : it)),
    })),
  };
}

/**
 * Favorita/desfavorita uma criação com update otimista no cache (sem refetch,
 * evitando o reflow da galeria). Sincroniza tanto as criações quanto a galeria.
 */
export function useToggleFavorite() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const t = useTranslations('home.gallery');

  return useMutation({
    mutationFn: (item: FavItem) =>
      item.isFavorited
        ? api.gallery.unfavorite(accessToken!, item.id)
        : api.gallery.favorite(accessToken!, item.id),
    onMutate: async (item) => {
      const newVal = !item.isFavorited;
      const queries = queryClient
        .getQueryCache()
        .findAll()
        .filter((q) => isFavCache(q.queryKey));
      const snapshot = queries.map((q) => [q.queryKey, q.state.data] as const);
      await queryClient.cancelQueries({ predicate: (q) => isFavCache(q.queryKey) });
      for (const q of queries) {
        const favOnly = q.queryKey[0] === 'image-creations' && q.queryKey[2] === true;
        queryClient.setQueryData<GalleryInfinite>(q.queryKey, (data) =>
          applyFavorite(data, item.id, newVal, favOnly),
        );
      }
      return { snapshot };
    },
    onError: (_err, _item, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error(t('favoriteError'));
    },
    onSuccess: (_data, item) => {
      toast.success(item.isFavorited ? t('unfavorited') : t('favorited'));
    },
  });
}
