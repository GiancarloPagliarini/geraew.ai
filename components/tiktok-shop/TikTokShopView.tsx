'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import {
  BadgeDollarSign,
  ChartNoAxesCombined,
  Crown,
  Flame,
  Lock,
  Medal,
  Percent,
  Radio,
  ShoppingBag,
  Spotlight,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { EmptyState } from '@/components/app/EmptyState';

const PRODUCT_IMAGE_UNAVAILABLE_URL = 'https://s.500fd.com/default/product_default.png';

type Tab = 'recommended' | 'new' | 'sales';

interface RankItem {
  product_id: string;
  title: string;
  cover: string;
  real_price: string;
  currency: string;
  yd_sold_count_show?: string;
  yd_sale_amount_show?: string;
  total_sold_count_show?: string;
  sold_count_inc_rate_show?: string;
  live_count_show?: string;
  author_count_show?: string;
  commission_rate_show?: string;
  category_name?: string[];
  detail_url: string;
  shop_info?: { avatar?: string; name?: string };
}

interface ApiResponse {
  code: number | string;
  data: { rank_list?: RankItem[]; product_list?: RankItem[]; list?: RankItem[] };
}

const TAB_META: { id: Tab; icon: React.ElementType }[] = [
  { id: 'sales', icon: BadgeDollarSign },
  { id: 'recommended', icon: ChartNoAxesCombined },
  { id: 'new', icon: Star },
];
const TAB_I18N: Record<Tab, { short: string; subtitle: string }> = {
  sales: { short: 'tabs.salesShort', subtitle: 'tabs.salesSubtitle' },
  recommended: { short: 'tabs.recommendedShort', subtitle: 'tabs.recommendedSubtitle' },
  new: { short: 'tabs.newShort', subtitle: 'tabs.newSubtitle' },
};

function GrowthBadge({ value }: { value?: string }) {
  if (!value || value === '-' || value === '0%') return null;
  const isNeg = value.startsWith('-');
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-black tabular-nums ring-1',
        isNeg
          ? 'bg-red-500/10 text-red-400 ring-red-500/20'
          : 'bg-app-lime/10 text-app-lime ring-app-lime/20',
      )}
    >
      {isNeg ? <TrendingDown className="size-2" /> : <TrendingUp className="size-2" />}
      {value}
    </span>
  );
}

function StatBadge({
  icon: Icon,
  label,
  value,
  highlighted,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-2 py-1.5 ring-1 transition-colors',
        highlighted ? 'bg-[#a2dd00]/10 ring-[#a2dd00]/25' : 'bg-white/[0.03] ring-white/[0.04]',
      )}
    >
      <Icon className={cn('size-3 shrink-0', highlighted ? 'text-[#a2dd00]' : 'text-white/30')} />
      <div className="min-w-0">
        <p className={cn('truncate text-[10px] leading-none', highlighted ? 'text-[#a2dd00]/70' : 'text-white/35')}>
          {label}
        </p>
        <p className={cn('text-[11.5px] font-bold leading-tight tabular-nums', highlighted ? 'text-[#a2dd00]' : 'text-white/80')}>
          {value}
        </p>
      </div>
    </div>
  );
}

function ProductCard({
  item,
  rank,
  highlight,
  onUse,
}: {
  item: RankItem;
  rank: number;
  highlight?: 'sales' | 'affiliates';
  onUse: (item: RankItem) => void;
}) {
  const t = useTranslations('editorDialogs.trendingProducts.card');
  const rankColors: Record<number, string> = {
    1: 'text-yellow-400 bg-yellow-400/15 ring-yellow-400/30',
    2: 'text-zinc-300 bg-zinc-300/10 ring-zinc-300/20',
    3: 'text-amber-600 bg-amber-600/10 ring-amber-600/25',
  };
  const hasCommission = item.commission_rate_show && item.commission_rate_show !== '-';

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl bg-[#1d2527] ring-1 ring-white/[0.06] transition-all duration-300 hover:bg-landing-card hover:ring-[#a2dd00]/25">
      <div className="relative aspect-square overflow-hidden bg-[#161e20]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.cover}
          alt={item.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.style.display = 'none';
            const ph = img.nextElementSibling as HTMLElement | null;
            if (ph?.dataset.placeholder) ph.style.display = 'flex';
          }}
        />
        <div
          data-placeholder="1"
          className="absolute inset-0 items-center justify-center bg-gradient-to-br from-[#1d2527] to-[#161e20]"
          style={{ display: 'none' }}
        >
          <ShoppingBag className="size-8 text-white/[0.06]" />
        </div>

        {rank === 1 ? (
          <div className="absolute left-2 top-2 flex size-6 items-center justify-center rounded-full bg-yellow-400 ring-1 ring-yellow-400/40">
            <Crown className="size-3.5 text-black" />
          </div>
        ) : rank === 2 ? (
          <div className="absolute left-2 top-2 flex size-6 items-center justify-center rounded-full bg-zinc-200 ring-1 ring-zinc-300/60">
            <Medal className="size-3.5 fill-zinc-500 text-zinc-500" />
          </div>
        ) : (
          <div
            className={cn(
              'absolute left-2 top-2 flex size-5 items-center justify-center rounded-full text-[10px] font-black ring-1',
              rank <= 3 ? rankColors[rank] : 'bg-black/70 text-white ring-white/20',
            )}
          >
            {rank}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-2.5">
          <p className="text-[17px] font-black leading-none text-white">{item.real_price}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3">
        <p className="line-clamp-2 text-[12.5px] font-medium leading-relaxed text-white/80">{item.title}</p>

        <div className="flex items-center gap-1.5">
          {item.shop_info?.avatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.shop_info.avatar}
              alt={item.shop_info.name}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="size-4 shrink-0 rounded-full ring-1 ring-white/10"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <span className="truncate text-[10.5px] text-white/40">{item.shop_info?.name}</span>
        </div>

        {item.category_name?.[0] && (
          <span className="max-w-full self-start truncate rounded-full bg-[#a2dd00]/[0.07] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#a2dd00]/70 ring-1 ring-[#a2dd00]/10">
            {item.category_name[0]}
          </span>
        )}

        <div className="h-px bg-white/[0.05]" />

        <div className="grid grid-cols-2 gap-1.5">
          {item.yd_sold_count_show && <StatBadge icon={ShoppingBag} label={t('salesToday')} value={item.yd_sold_count_show} highlighted={highlight === 'sales'} />}
          {item.yd_sale_amount_show && <StatBadge icon={TrendingUp} label={t('revenue')} value={item.yd_sale_amount_show} />}
          {item.author_count_show && <StatBadge icon={Users} label={t('affiliates')} value={item.author_count_show} highlighted={highlight === 'affiliates'} />}
          {item.live_count_show && <StatBadge icon={Radio} label={t('lives')} value={item.live_count_show} />}
          {hasCommission && <StatBadge icon={Percent} label={t('commission')} value={item.commission_rate_show!} />}
        </div>

        {item.sold_count_inc_rate_show && (
          <div className="mt-0.5">
            <GrowthBadge value={item.sold_count_inc_rate_show} />
          </div>
        )}

        {item.total_sold_count_show && (
          <div className="mt-auto flex items-center justify-between rounded-lg bg-white/[0.02] px-2.5 py-1.5 ring-1 ring-white/[0.04]">
            <span className="text-[10px] text-white/30">{t('totalAccumulated')}</span>
            <span className="text-[11px] font-bold tabular-nums text-white/60">
              {item.total_sold_count_show} {t('salesSuffix')}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={() => onUse(item)}
          className="mt-1 w-full rounded-lg bg-[#a2dd00]/10 py-2 text-[12px] font-black text-[#a2dd00] ring-1 ring-[#a2dd00]/25 transition-all duration-200 hover:bg-[#a2dd00]/20"
        >
          {t('useProduct')}
        </button>
      </div>
    </div>
  );
}

export function TikTokShopView() {
  const t = useTranslations('editorDialogs.trendingProducts');
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('sales');
  const [items, setItems] = useState<RankItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const fetchRef = useRef(0);

  const { data: profile } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.users.me(accessToken!),
    enabled: !!accessToken,
    staleTime: 5 * 60_000,
  });
  const currentPlanSlug = ((profile?.plan as Record<string, unknown> | null)?.slug as string | null) ?? null;
  const isFreePlan = !user || currentPlanSlug === 'free' || !currentPlanSlug;

  const fetchProducts = useCallback(async (tab: Tab) => {
    const id = ++fetchRef.current;
    setLoading(true);
    setError(false);
    setItems([]);
    try {
      const res = await fetch(`/api/v1/trending-products?tab=${tab}`);
      if (!res.ok) throw new Error('upstream');
      const json: ApiResponse = await res.json();
      if (id !== fetchRef.current) return;
      const list = json.data?.rank_list ?? json.data?.product_list ?? json.data?.list ?? [];
      if (list.length > 0) setItems(list);
      else setError(true);
    } catch {
      if (id === fetchRef.current) setError(true);
    } finally {
      if (id === fetchRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !accessToken) return;
    fetchProducts(activeTab);
  }, [activeTab, user, accessToken, fetchProducts]);

  const handleUse = (item: RankItem) => {
    if (!item.cover || item.cover === PRODUCT_IMAGE_UNAVAILABLE_URL) return;
    const params = new URLSearchParams({ prompt: item.title, ref: item.cover });
    router.push(`/image?${params.toString()}`);
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-app">
      <div className="mx-auto w-full max-w-[1500px] px-6 pb-16">
        {/* cabeçalho + abas (sticky) — bg estende além do padding para cobrir a
            borda dos cards das pontas ao rolar */}
        <div className="sticky top-0 z-20 -mx-6 bg-app-bg px-6 pb-4 pt-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px] text-app-text-2">{t(TAB_I18N[activeTab].subtitle)}</p>
          <span className="flex items-center gap-1.5 rounded-full bg-app-lime/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-app-lime ring-1 ring-app-lime/25">
            <Spotlight className="size-3.5" />
            {t('top10')}
          </span>
        </div>

        {/* abas */}
        <div className="mt-4 flex gap-1.5">
          {TAB_META.map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors duration-200 ease-app',
                activeTab === id
                  ? 'bg-app-lime text-app-lime-ink'
                  : 'bg-app-surface text-app-text-2 hover:text-app-text',
              )}
            >
              <Icon className="size-[15px]" />
              {t(TAB_I18N[id].short)}
            </button>
          ))}
        </div>
        </div>

        {/* conteúdo */}
        <div className="relative mt-2">
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="overflow-hidden rounded-[16px] border border-app-hairline">
                  <div className="aspect-square skeleton-app bg-app-surface" />
                  <div className="space-y-2 p-3.5">
                    <div className="h-3.5 w-full skeleton-app rounded bg-app-surface" />
                    <div className="h-3 w-1/2 skeleton-app rounded bg-app-surface" />
                    <div className="mt-1 h-9 w-full skeleton-app rounded-[10px] bg-app-surface" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <EmptyState
              icon={Flame}
              title={t('loadErrorTitle')}
              hint={t('loadErrorHint')}
              cta={{ label: t('retry'), onClick: () => fetchProducts(activeTab) }}
            />
          ) : items.length === 0 ? (
            <EmptyState icon={ShoppingBag} title={t('noProducts')} />
          ) : (
            <div
              className={cn(
                'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5',
                isFreePlan && 'pointer-events-none select-none blur-sm',
              )}
            >
              {items.map((item, i) => (
                <ProductCard
                  key={item.product_id}
                  item={item}
                  rank={i + 1}
                  highlight={activeTab === 'sales' ? 'sales' : activeTab === 'recommended' ? 'affiliates' : undefined}
                  onUse={handleUse}
                />
              ))}
            </div>
          )}

          {/* paywall — plano gratuito */}
          {isFreePlan && !loading && !error && items.length > 0 && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-app-bg/70 px-6 text-center backdrop-blur-[2px]">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-app-lime/10 ring-1 ring-app-lime/20">
                <Lock className="size-6 text-app-lime" />
              </span>
              <div className="space-y-1">
                <p className="text-[15px] font-bold text-app-text">{t('paywallTitle')}</p>
                <p className="max-w-sm text-[12.5px] leading-relaxed text-app-text-2">{t('paywallDescription')}</p>
              </div>
              <button
                type="button"
                onClick={() => router.push('/pricing')}
                className="rounded-[10px] bg-app-lime px-5 py-2.5 text-[13px] font-semibold text-app-lime-ink transition-colors hover:bg-app-lime-hover"
              >
                {t('viewPlans')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
