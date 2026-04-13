'use client';

import {
  Flame, X, TrendingUp, TrendingDown, ShoppingBag, Users, Radio,
  Loader2, Percent, ChartNoAxesCombined,
  BadgeDollarSign, Star, Crown, Lock,
  Spotlight
} from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Medal } from '@phosphor-icons/react';
import { useAuth } from '@/lib/auth-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────────

type Tab = 'recommended' | 'new' | 'sales';

interface RankItem {
  product_id: string;
  title: string;
  cover: string;
  real_price: string;
  currency: string;
  sold_count_show?: string;
  yd_sold_count_show?: string;
  yd_sale_amount_show?: string;
  total_sold_count_show?: string;
  total_sale_amount_show?: string;
  sold_count_inc_rate_show?: string;
  aweme_count_show?: string;
  live_count_show?: string;
  author_count_show?: string;
  total_author_count_show?: string;
  commission_rate_show?: string;
  category_name?: string[];
  detail_url: string;
  shop_info?: {
    avatar?: string;
    name?: string;
  };
}

interface ApiResponse {
  code: number | string;
  data: {
    rank_list?: RankItem[];
    product_list?: RankItem[];
    list?: RankItem[];
  };
}

// ── Tabs config ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; shortLabel: string; icon: React.ElementType; subtitle: string }[] = [
  { id: 'sales', icon: BadgeDollarSign, label: 'Produtos com mais vendas', shortLabel: 'Mais vendas', subtitle: 'TOP 10 Produtos com mais vendas no TikTok BR' },
  { id: 'recommended', icon: ChartNoAxesCombined, label: 'Produtos mais populares', shortLabel: 'Populares', subtitle: 'TOP 10 Produtos mais populares do TikTok BR' },
  { id: 'new', icon: Star, label: 'Novos produtos', shortLabel: 'Novos', subtitle: 'TOP 10 Lançamentos em alta no TikTok BR' },
];

// ── Growth badge ───────────────────────────────────────────────────────────────

function GrowthBadge({ value }: { value?: string }) {
  if (!value) return null;
  const isNeg = value.startsWith('-');
  if (value === '-' || value === '0%') return null;

  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-black ring-1 tabular-nums ${isNeg ? 'text-red-400 bg-red-500/10 ring-red-500/20' : 'text-[#a2dd00] bg-[#a2dd00]/10 ring-[#a2dd00]/20'
      }`}>
      {isNeg ? <TrendingDown className="h-2 w-2" /> : <TrendingUp className="h-2 w-2" />}
      {value}
    </span>
  );
}

// ── Product Card ───────────────────────────────────────────────────────────────

function ProductCard({ item, rank, highlight }: { item: RankItem; rank: number; highlight?: 'sales' | 'affiliates' }) {
  const rankColors: Record<number, string> = {
    1: 'text-yellow-400 bg-yellow-400/15 ring-yellow-400/30',
    2: 'text-zinc-300 bg-zinc-300/10 ring-zinc-300/20',
    3: 'text-amber-600 bg-amber-600/10 ring-amber-600/25',
  };

  const hasCommission = item.commission_rate_show && item.commission_rate_show !== '-';

  return (
    <div className="group relative flex flex-col rounded-xl ring-1 ring-white/[0.06] bg-[#1d2527] hover:ring-[#a2dd00]/25 hover:bg-landing-card transition-all duration-300 overflow-hidden">
      {/* Thumbnail */}
      <div className="relative aspect-square overflow-hidden bg-[#161e20]">
        <img
          src={item.cover}
          alt={item.title}
          className="h-full w-full object-cover transition-transform duration-500 will-change-transform group-hover:scale-[1.05]"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.style.display = 'none';
            const ph = img.nextElementSibling as HTMLElement | null;
            if (ph?.dataset.placeholder) ph.style.display = 'flex';
          }}
        />
        <div data-placeholder="1" className="absolute inset-0 items-center justify-center bg-linear-to-br from-[#1d2527] to-[#161e20]" style={{ display: 'none' }}>
          <ShoppingBag className="h-8 w-8 text-white/[0.06]" />
        </div>

        {/* Rank */}
        {rank === 1 ? (
          <div className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 ring-1 ring-yellow-400/40">
            <Crown className="h-3.5 w-3.5 text-black" />
          </div>
        ) : rank === 2 ? (
          <div className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 ring-1 ring-zinc-300/60">
            <Medal className="h-3.5 w-3.5 text-zinc-500" weight="fill" />
          </div>
        ) : (
          <div className={`absolute top-2 left-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ring-1 ${rank <= 3 ? rankColors[rank] : 'text-white bg-black/70 ring-white/20'}`}>
            {rank}
          </div>
        )}


        {/* Gradient + price */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 p-2">
          <p className="text-sm font-black text-white leading-none">{item.real_price}</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 p-2.5 flex-1">
        <p className="text-[10px] font-medium text-white/70 line-clamp-2 leading-relaxed">{item.title}</p>

        {/* Shop */}
        <div className="flex items-center gap-1.5">
          {item.shop_info?.avatar && (
            <img src={item.shop_info.avatar} alt={item.shop_info.name} className="h-4 w-4 rounded-full ring-1 ring-white/10 shrink-0" loading="lazy" referrerPolicy="no-referrer"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          <span className="text-[9px] text-white/35 truncate">{item.shop_info?.name}</span>
        </div>

        {/* Category */}
        {item.category_name?.[0] && (
          <span className="self-start text-[8px] font-bold uppercase tracking-wider text-[#a2dd00]/60 bg-[#a2dd00]/[0.07] px-1.5 py-0.5 rounded-full ring-1 ring-[#a2dd00]/10 truncate max-w-full">
            {item.category_name[0]}
          </span>
        )}

        <div className="h-px bg-white/[0.04]" />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-1.5">
          {item.yd_sold_count_show && <StatBadge icon={ShoppingBag} label="Vendas hoje" value={item.yd_sold_count_show} highlighted={highlight === 'sales'} />}
          {item.yd_sale_amount_show && <StatBadge icon={TrendingUp} label="Faturamento" value={item.yd_sale_amount_show} />}
          {item.author_count_show && <StatBadge icon={Users} label="Afiliados" value={item.author_count_show} highlighted={highlight === 'affiliates'} />}
          {item.live_count_show && <StatBadge icon={Radio} label="Lives" value={item.live_count_show} />}
          {hasCommission && <StatBadge icon={Percent} label="Comissão" value={item.commission_rate_show!} />}
        </div>

        {/* Growth */}
        {item.sold_count_inc_rate_show && (
          <div className="mt-0.5">
            <GrowthBadge value={item.sold_count_inc_rate_show} />
          </div>
        )}

        {/* Total */}
        {item.total_sold_count_show && (
          <div className="mt-auto flex items-center justify-between rounded-lg bg-white/2 px-2 py-1.5 ring-1 ring-white/4">
            <span className="text-[9px] text-white/25">Total acumulado</span>
            <span className="text-[10px] font-bold text-white/55 tabular-nums">{item.total_sold_count_show} vendas</span>
          </div>
        )}

        {/* CTA */}
        <button className="cursor-pointer mt-1 w-full rounded-lg bg-[#a2dd00]/10 py-1.5 text-[10px] font-black text-[#a2dd00] ring-1 ring-[#a2dd00]/20 transition-all duration-200 hover:bg-[#a2dd00]/20 hover:ring-[#a2dd00]/40 active:scale-[0.98]">
          Usar produto
        </button>
      </div>
    </div>
  );
}

function StatBadge({ icon: Icon, label, value, highlighted }: { icon: React.ElementType; label: string; value: string; highlighted?: boolean }) {
  return (
    <div className={`flex items-center gap-1 rounded-lg px-1.5 py-1 ring-1 transition-colors ${highlighted ? 'bg-[#a2dd00]/10 ring-[#a2dd00]/25' : 'bg-white/3 ring-white/4'}`}>
      <Icon className={`h-2.5 w-2.5 shrink-0 ${highlighted ? 'text-[#a2dd00]' : 'text-white/25'}`} />
      <div className="min-w-0">
        <p className={`text-[9px] leading-none truncate ${highlighted ? 'text-[#a2dd00]/60' : 'text-white/25'}`}>{label}</p>
        <p className={`text-[10px] font-bold leading-tight tabular-nums ${highlighted ? 'text-[#a2dd00]' : 'text-white/70'}`}>{value}</p>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

interface TrendingProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrendingProductsDialog({ open, onOpenChange }: TrendingProductsDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('sales');

  const { accessToken, user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.users.me(accessToken!),
    enabled: !!accessToken,
    staleTime: 5 * 60_000,
  });

  const currentPlanSlug = (profile?.plan as Record<string, unknown> | null)?.slug as string | null ?? null;
  const isFreePlan = !user || currentPlanSlug === 'free' || !currentPlanSlug;

  const [items, setItems] = useState<RankItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const fetchRef = useRef(0);

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
      // different endpoints return different keys
      const list = json.data?.rank_list ?? json.data?.product_list ?? json.data?.list ?? [];
      if (list.length > 0) {
        setItems(list);
      } else {
        setError(true);
      }
    } catch {
      if (id === fetchRef.current) setError(true);
    } finally {
      if (id === fetchRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchProducts(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeTab]);

  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); }
    else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => { setMounted(false); setClosing(false); }, 200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!mounted) return null;

  const activeTabConfig = TABS.find((t) => t.id === activeTab)!;

  return (
    <aside className={`${closing ? 'aside-out-left' : 'aside-in-left'} fixed inset-0 z-50 flex flex-col border-r border-landing-text/[0.07] bg-[#171f21] text-landing-text overflow-hidden sm:static sm:h-full sm:w-xl sm:shrink-0`}>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#f3f0ed]/[0.05] bg-gradient-to-b from-[#f3f0ed]/[0.02] to-transparent px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#a2dd00]/10">
            <Flame className="h-3.5 w-3.5 text-[#a2dd00]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#f3f0ed]/80">Ranking TikTok Shop</h2>
            <p className="hidden sm:block text-xs text-landing-text/30">{activeTabConfig.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] flex items-center gap-1 font-black tracking-widest text-[#a2dd00] bg-[#a2dd00]/10 px-2 py-0.5 rounded-full ring-1 ring-[#a2dd00]/25">
            <Spotlight className="h-3.5 w-3.5 text-[#a2dd00]" />
            TOP 10
          </span>
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-landing-text/30 hover:bg-landing-text/5 hover:text-landing-text/70 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-3 pt-2.5 pb-2 border-b border-white/5">
        {TABS.map(({ id, label, shortLabel, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => { if (!isActive) setActiveTab(id); }}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 sm:py-1.5 text-[10px] font-bold transition-all ${isActive
                ? 'bg-[#a2dd00]/15 text-[#a2dd00] ring-1 ring-[#a2dd00]/25'
                : 'text-white/30 hover:text-white/60 hover:bg-white/4'
                }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="inline sm:hidden">{shortLabel}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <div className="flex-1 overflow-y-auto sidebar-scroll">
          {loading && (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-white/15" />
                <span className="text-xs font-semibold animate-pulse text-white/50">Rankeando produtos...</span>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-3 px-4 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/10">
                <Flame className="h-5 w-5 text-red-400/60" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white/50">Não foi possível carregar</p>
                <p className="text-[10px] text-white/25 mt-0.5">Verifique sua conexão e tente novamente</p>
              </div>
              <button
                onClick={() => fetchProducts(activeTab)}
                className="rounded-lg bg-[#a2dd00]/10 px-3 py-1.5 text-[10px] font-bold text-[#a2dd00] ring-1 ring-[#a2dd00]/20 hover:bg-[#a2dd00]/20 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className={`grid grid-cols-2 gap-2 p-3 ${isFreePlan ? 'blur-sm pointer-events-none select-none' : ''}`}>
              {items.map((item, i) => (
                <ProductCard
                  key={item.product_id}
                  item={item}
                  rank={i + 1}
                  highlight={activeTab === 'sales' ? 'sales' : activeTab === 'recommended' ? 'affiliates' : undefined}
                />
              ))}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="flex items-center justify-center py-24">
              <p className="text-xs text-white/25">Nenhum produto encontrado</p>
            </div>
          )}
        </div>

        {/* Paywall overlay */}
        {isFreePlan && !loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-6 text-center bg-[#171f21]/70 backdrop-blur-[2px]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#a2dd00]/10 ring-1 ring-[#a2dd00]/20">
              <Lock className="h-6 w-6 text-[#a2dd00]" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-white/80">Recurso exclusivo para assinantes</p>
              <p className="text-[11px] text-white/40 leading-relaxed">
                Assine o plano Starter ou superior para visualizar os produtos em alta no TikTok Shop.
              </p>
            </div>
            <a
              href="/creditos"
              className="rounded-xl bg-[#a2dd00] px-5 py-2 text-xs font-black text-black hover:bg-[#b8f000] transition-colors"
            >
              Ver planos
            </a>
          </div>
        )}
      </div>
    </aside>
  );
}
