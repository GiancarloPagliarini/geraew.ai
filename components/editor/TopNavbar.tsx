'use client';

import { ArrowRight, BadgePercent, BatteryCharging, Clapperboard, Coins, CreditCard, Gift, Loader2, LogIn, LogOut, Plus, Settings, User, Users, Wallet, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { useEditor } from '@/lib/editor-context';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { PlansModal } from './PlansModal';
import { AffiliateProgramModal } from './AffiliateProgramModal';
import { WeeklyClaimWidget } from './WeeklyClaimWidget';
import { useLoginModal } from '@/lib/login-modal-context';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function formatCents(cents: number, locale: string) {
  const intlLocale = locale === 'pt-BR' ? 'pt-BR' : locale === 'es' ? 'es' : 'en-US';
  return (cents / 100).toLocaleString(intlLocale, {
    style: 'currency',
    currency: 'BRL',
  });
}

export function TopNavbar() {
  const t = useTranslations('editorChrome.navbar');
  const tMenu = useTranslations('editorChrome.navbar.menu');
  const locale = useLocale();
  const router = useRouter();
  const { credits, creditsLoading, creditsBalance, studioMode, toggleStudioMode } = useEditor();
  const { user, logout, loading: authLoading, accessToken } = useAuth();
  const { openLoginModal } = useLoginModal();
  const [menuOpen, setMenuOpen] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [affiliateMenuOpen, setAffiliateMenuOpen] = useState(false);
  const [affiliateModalOpen, setAffiliateModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const affiliateMenuRef = useRef<HTMLDivElement>(null);

  const { data: affiliateData, isLoading: affiliateLoading, isFetched: affiliateFetched } = useQuery({
    queryKey: ['affiliate', 'me'],
    queryFn: () => api.affiliates.me(accessToken!),
    enabled: !!user && !!accessToken,
    staleTime: 30_000,
  });

  const { data: userProfile } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.users.me(accessToken!),
    enabled: !!user && !!accessToken,
    staleTime: 60_000,
  });

  const showFeedbackReward = (() => {
    if (!userProfile) return false;
    if (userProfile.feedbackSubmitted) return false;
    const sub = userProfile.subscription as Record<string, unknown> | null;
    const plan = userProfile.plan as Record<string, unknown> | null;
    const status = (sub?.status as string | undefined)?.toLowerCase();
    return status === 'active' && (plan?.slug as string | undefined) !== 'free';
  })();

  const planSlug = (userProfile?.plan as Record<string, unknown> | null)?.slug as string | undefined;
  const planName = ((userProfile?.plan as Record<string, unknown> | null)?.name as string | undefined)
    ?? (planSlug ? planSlug.charAt(0).toUpperCase() + planSlug.slice(1) : undefined);
  const isFreePlan = !planSlug || planSlug === 'free';

  // Fecha o menu ao clicar fora (ignora cliques dentro do aside mobile)
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      const inMenu = menuRef.current?.contains(e.target as Node);
      const inAside = asideRef.current?.contains(e.target as Node);
      if (!inMenu && !inAside) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick, true);
    return () => document.removeEventListener('mousedown', handleClick, true);
  }, [menuOpen]);

  useEffect(() => {
    if (!affiliateMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (!affiliateMenuRef.current?.contains(e.target as Node)) {
        setAffiliateMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick, true);
    return () => document.removeEventListener('mousedown', handleClick, true);
  }, [affiliateMenuOpen]);

  function handleLogout() {
    logout();
    router.push('/');
  }

  if (studioMode) {
    return (
      <>
        <header className="relative z-50 flex h-10 shrink-0 items-center justify-between bg-[#0d1011] px-3">
          <div className="flex items-center gap-2">
            <Image
              src="/logo_2.svg"
              alt={t('logoAlt')}
              width={22}
              height={22}
              className="rounded-md mix-blend-lighten opacity-80"
            />
            <span className="text-[12px] font-medium tracking-wide text-[#f3f0ed]/70">{t('brand')}</span>
          </div>

          <div className="flex items-center gap-1">
            {authLoading ? (
              <div className="h-6 w-40 animate-pulse rounded-full bg-[#f3f0ed]/5" />
            ) : user ? (
              <>
                <div className="flex h-7 items-center gap-1.5 rounded-full bg-[#f3f0ed]/[0.04] px-2.5 text-[11px] font-medium text-[#f3f0ed]/70">
                  <Coins className="h-3 w-3 text-[#a2dd00]" />
                  {creditsLoading ? (
                    <span className="h-2.5 w-8 animate-pulse rounded-full bg-[#f3f0ed]/10" />
                  ) : (
                    <span className="tabular-nums">{new Intl.NumberFormat(locale).format(credits)}</span>
                  )}
                </div>

                <button
                  onClick={() => setPlansModalOpen(true)}
                  title={t('buyCredits')}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[#a2dd00]/12 text-[#a2dd00] transition-all hover:bg-[#a2dd00]/20"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>

                <WeeklyClaimWidget />

                <div ref={affiliateMenuRef} className="relative">
                  <button
                    onClick={() => {
                      if (!affiliateFetched || affiliateLoading) {
                        setAffiliateMenuOpen((v) => !v);
                      } else if (affiliateData) {
                        setAffiliateMenuOpen((v) => !v);
                      } else {
                        setAffiliateModalOpen(true);
                      }
                    }}
                    title={t('becomeAffiliate')}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[#f3f0ed]/45 transition-all hover:bg-[#f3f0ed]/[0.06] hover:text-[#f3f0ed]"
                  >
                    <Users className="h-3.5 w-3.5" />
                  </button>

                  {affiliateMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 overflow-hidden rounded-xl bg-[#1a2123] shadow-2xl backdrop-blur-md">
                      {!affiliateFetched || affiliateLoading ? (
                        <div className="flex items-center justify-center gap-2 px-4 py-8">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#a2dd00]" />
                          <span className="text-xs text-[#f3f0ed]/50">{t('affiliateLoading')}</span>
                        </div>
                      ) : affiliateData ? (
                        <>
                          <div className="flex items-center justify-between px-4 py-3">
                            <div>
                              <p className="text-xs font-medium text-[#f3f0ed]/85">{t('affiliateMenuTitle')}</p>
                              <p className="mt-0.5 font-mono text-[10px] tracking-wide text-[#a2dd00]">
                                {affiliateData.affiliate.code}
                              </p>
                            </div>
                            <span className="rounded-full bg-[#a2dd00]/10 px-2 py-0.5 text-[10px] font-semibold text-[#a2dd00]">
                              {affiliateData.affiliate.commissionPercent}%
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                            <div className="flex flex-col gap-1 rounded-lg bg-[#f3f0ed]/[0.03] p-3">
                              <div className="flex items-center gap-1.5">
                                <Wallet className="h-3 w-3 text-emerald-400" />
                                <span className="text-[9px] font-medium uppercase tracking-wide text-[#f3f0ed]/40">
                                  {t('affiliateAvailable')}
                                </span>
                              </div>
                              <p className="text-sm font-bold tabular-nums text-[#f3f0ed]">
                                {formatCents(affiliateData.summary.availableCommissionCents ?? 0, locale)}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1 rounded-lg bg-[#f3f0ed]/[0.03] p-3">
                              <div className="flex items-center gap-1.5">
                                <Users className="h-3 w-3 text-blue-400" />
                                <span className="text-[9px] font-medium uppercase tracking-wide text-[#f3f0ed]/40">
                                  {t('affiliateReferrals')}
                                </span>
                              </div>
                              <p className="text-sm font-bold tabular-nums text-[#f3f0ed]">
                                {(affiliateData.summary.referredUsers ?? 0).toLocaleString(locale)}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setAffiliateMenuOpen(false);
                              router.push('/painel-afiliado');
                            }}
                            className="flex w-full items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-[#a2dd00] transition-colors hover:bg-[#a2dd00]/5"
                          >
                            {t('affiliateViewPanel')}
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>

                <LocaleSwitcher compact />

                <button
                  onClick={toggleStudioMode}
                  aria-pressed={studioMode}
                  title="Studio Mode"
                  className="hidden h-7 items-center gap-1.5 rounded-full bg-[#a2dd00]/10 px-3 text-[11px] font-medium text-[#a2dd00] transition-all hover:bg-[#a2dd00]/15 md:flex"
                >
                  <Clapperboard className="h-3 w-3" />
                  Studio
                </button>

                <div ref={menuRef} className="relative">
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full transition-opacity hover:opacity-90"
                  >
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} width={28} height={28} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-[#1e494b]">
                        <User className="h-3.5 w-3.5 text-[#f3f0ed]/50" />
                      </span>
                    )}
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-2 hidden w-56 overflow-hidden rounded-xl bg-[#1a2123] shadow-2xl backdrop-blur-md sm:block">
                      <div className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[11px] font-medium text-[#f3f0ed]/80">{user?.name || t('defaultUser')}</p>
                          {planName && (
                            <span
                              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${isFreePlan
                                ? 'bg-[#f3f0ed]/5 text-[#f3f0ed]/50'
                                : 'bg-[#a2dd00]/10 text-[#a2dd00]'
                                }`}
                            >
                              {planName}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] text-[#f3f0ed]/35">{user?.email}</p>
                      </div>
                      <div className="py-1">
                        <DropdownItem icon={User} label={tMenu('profile')} onClick={() => { setMenuOpen(false); router.push('/perfil'); }} />
                        <DropdownItem icon={CreditCard} label={tMenu('credits')} onClick={() => { setMenuOpen(false); router.push('/creditos'); }} />
                        <DropdownItem icon={BadgePercent} label={tMenu('plans')} onClick={() => { setMenuOpen(false); setPlansModalOpen(true); }} />
                        <DropdownItem icon={BatteryCharging} label={tMenu('usage')} onClick={() => { setMenuOpen(false); router.push('/uso'); }} />
                        <DropdownItem icon={Users} label={tMenu('affiliate')} onClick={() => { setMenuOpen(false); router.push('/painel-afiliado'); }} />
                      </div>
                      <div className="flex items-center pr-2">
                        <div className="flex-1 min-w-0">
                          <DropdownItem icon={LogOut} label={tMenu('logout')} danger onClick={() => { setMenuOpen(false); handleLogout(); }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={() => openLoginModal()}
                className="flex h-7 items-center gap-1.5 rounded-full bg-[#a2dd00] px-3 text-[11px] font-bold text-[#1a2123] transition-all hover:brightness-110"
              >
                <LogIn className="h-3 w-3" />
                {t('signIn')}
              </button>
            )}
          </div>
        </header>

        {plansModalOpen && <PlansModal onClose={() => setPlansModalOpen(false)} />}
        {affiliateModalOpen && <AffiliateProgramModal onClose={() => setAffiliateModalOpen(false)} />}
      </>
    );
  }

  return (
    <>
      <header className={`relative z-50 flex h-12 shrink-0 items-center justify-between border-b border-[#f3f0ed]/[0.07] px-2 sm:px-4 ${studioMode ? 'bg-[#0d1011]' : 'bg-[#1a2123]'}`}>
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo_2.svg"
            alt={t('logoAlt')}
            width={32}
            height={32}
            className="rounded-md mix-blend-lighten"
          />
          <span className="hidden text-sm font-medium text-[#f3f0ed] sm:inline">
            {t('brand')}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {authLoading ? (
            /* Skeleton while auth state is loading */
            <div className="flex items-center gap-2">
              <div className="h-7 w-20 animate-pulse rounded-full bg-[#f3f0ed]/10 hidden sm:block" />
              <div className="h-7 w-24 animate-pulse rounded-full bg-[#f3f0ed]/10" />
              <div className="h-8 w-8 animate-pulse rounded-full bg-[#f3f0ed]/10" />
            </div>
          ) : user ? (
            <div className="navbar-fade-in flex items-center gap-1.5 sm:gap-2">
              {/* Credit badge */}
              <div className="flex items-center gap-1.5 rounded-full border border-[#f3f0ed]/10 bg-[#f3f0ed]/5 px-2 py-1.5 sm:px-3">
                <Coins className="h-3.5 w-3.5 text-[#a2dd00]" />
                {creditsLoading ? (
                  <div className="h-3 w-10 animate-pulse rounded-full bg-[#f3f0ed]/10" />
                ) : (
                  <span className="text-xs font-semibold text-[#f3f0ed]">{new Intl.NumberFormat(locale).format(credits)}</span>
                )}
              </div>

              {/* Buy button — accent lime (icon-only on mobile) */}
              <button
                onClick={() => setPlansModalOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-[#a2dd00] p-2 text-xs font-bold text-[#1a2123] transition-all hover:brightness-110 active:scale-95 sm:px-4 sm:py-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('buyCredits')}</span>
              </button>

              {/* Affiliate button — hidden on mobile */}
              <div ref={affiliateMenuRef} className="relative hidden sm:block">
                <button
                  onClick={() => {
                    if (!affiliateFetched || affiliateLoading) {
                      setAffiliateMenuOpen((v) => !v);
                    } else if (affiliateData) {
                      setAffiliateMenuOpen((v) => !v);
                    } else {
                      setAffiliateModalOpen(true);
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-full border border-[#1e494b] px-4 py-1.5 text-xs font-semibold text-[#f3f0ed]/80 transition-all hover:border-[#a2dd00]/50 hover:text-[#f3f0ed]"
                >
                  <Users className="h-3.5 w-3.5" />
                  {t('becomeAffiliate')}
                </button>

                {affiliateMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 overflow-hidden rounded-xl border border-[#f3f0ed]/8 bg-[#1a2123] shadow-2xl">
                    {!affiliateFetched || affiliateLoading ? (
                      <div className="flex items-center justify-center gap-2 px-4 py-8">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#a2dd00]" />
                        <span className="text-xs text-[#f3f0ed]/50">{t('affiliateLoading')}</span>
                      </div>
                    ) : affiliateData ? (
                      <>
                        <div className="flex items-center justify-between border-b border-[#f3f0ed]/6 px-4 py-3">
                          <div>
                            <p className="text-xs font-semibold text-[#f3f0ed]">{t('affiliateMenuTitle')}</p>
                            <p className="mt-0.5 font-mono text-[10px] tracking-wide text-[#a2dd00]">
                              {affiliateData.affiliate.code}
                            </p>
                          </div>
                          <span className="rounded-full border border-[#a2dd00]/30 bg-[#a2dd00]/10 px-2 py-0.5 text-[10px] font-semibold text-[#a2dd00]">
                            {affiliateData.affiliate.commissionPercent}%
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 p-3">
                          <div className="flex flex-col gap-1 rounded-lg border border-[#f3f0ed]/6 bg-[#f3f0ed]/3 p-3">
                            <div className="flex items-center gap-1.5">
                              <Wallet className="h-3 w-3 text-emerald-400" />
                              <span className="text-[9px] font-bold uppercase tracking-wide text-[#f3f0ed]/40">
                                {t('affiliateAvailable')}
                              </span>
                            </div>
                            <p className="text-sm font-bold tabular-nums text-[#f3f0ed]">
                              {formatCents(affiliateData.summary.availableCommissionCents ?? 0, locale)}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1 rounded-lg border border-[#f3f0ed]/6 bg-[#f3f0ed]/3 p-3">
                            <div className="flex items-center gap-1.5">
                              <Users className="h-3 w-3 text-blue-400" />
                              <span className="text-[9px] font-bold uppercase tracking-wide text-[#f3f0ed]/40">
                                {t('affiliateReferrals')}
                              </span>
                            </div>
                            <p className="text-sm font-bold tabular-nums text-[#f3f0ed]">
                              {(affiliateData.summary.referredUsers ?? 0).toLocaleString(locale)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setAffiliateMenuOpen(false);
                            router.push('/painel-afiliado');
                          }}
                          className="flex w-full items-center justify-center gap-1.5 border-t border-[#f3f0ed]/6 px-4 py-2.5 text-xs font-semibold text-[#a2dd00] transition-colors hover:bg-[#a2dd00]/5"
                        >
                          {t('affiliateViewPanel')}
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Feedback reward — only for paid users who haven't submitted yet */}
              {showFeedbackReward && (
                <button
                  onClick={() => router.push('/feedback')}
                  className="group relative hidden items-center gap-1.5 overflow-hidden rounded-full border border-[#a2dd00]/40 bg-[#a2dd00]/10 px-3 py-1.5 text-xs font-semibold text-[#a2dd00] transition-all hover:border-[#a2dd00]/70 hover:bg-[#a2dd00]/15 sm:flex"
                >
                  <span className="pointer-events-none absolute -inset-x-6 -inset-y-2 bg-[radial-gradient(ellipse_at_center,rgba(162,221,0,0.25),transparent_70%)] opacity-60 blur-md transition-opacity group-hover:opacity-100" />
                  <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                    <span className="absolute h-full w-full animate-ping rounded-full bg-[#a2dd00]/60" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-[#a2dd00]" />
                  </span>
                  <Gift className="relative h-3.5 w-3.5" />
                  <span className="relative tabular-nums">
                    {t('feedbackReward', { amount: (2500).toLocaleString(locale) })}
                  </span>
                </button>
              )}

              {/* Weekly claim — opens explanation modal */}
              <WeeklyClaimWidget />
            </div>
          ) : (
            /* Login dropdown for unauthenticated users */
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full bg-[#a2dd00] px-3 py-1.5 text-xs font-bold text-[#1a2123] transition-all hover:brightness-110 active:scale-95"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>{t('signIn')}</span>
              </button>

              {menuOpen && (
                /* Desktop dropdown only */
                <div className="absolute right-0 top-full mt-2 hidden w-64 overflow-hidden rounded-xl border border-[#f3f0ed]/8 bg-[#1a2123] shadow-2xl sm:block">
                  <div className="px-4 py-3 border-b border-[#f3f0ed]/6">
                    <p className="text-xs font-semibold text-[#f3f0ed]">{t('loginTitle')}</p>
                    <p className="mt-0.5 text-[11px] text-[#f3f0ed]/40">{t('loginSubtitle')}</p>
                  </div>
                  <div className="p-3 flex flex-col gap-2">
                    <button
                      onClick={() => { setGoogleLoading(true); window.location.href = '/api/v1/auth/google'; }}
                      disabled={googleLoading}
                      className="flex h-10 w-full items-center justify-center gap-2.5 rounded-lg border border-[#f3f0ed]/10 bg-[#f3f0ed]/5 text-xs font-medium text-[#f3f0ed] transition-all hover:bg-[#f3f0ed]/10 active:scale-[0.98] disabled:opacity-50"
                    >
                      {googleLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
                          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
                          <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" />
                          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" />
                        </svg>
                      )}
                      {googleLoading ? t('redirecting') : t('continueWithGoogle')}
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); openLoginModal(); }}
                      className="flex h-10 w-full items-center justify-center gap-2.5 rounded-lg border border-[#f3f0ed]/10 bg-[#f3f0ed]/5 text-xs font-medium text-[#f3f0ed] transition-all hover:bg-[#f3f0ed]/10 active:scale-[0.98]"
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      {t('signInWithEmail')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {user && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="hidden md:inline-flex">
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      className="hidden h-8 items-center gap-1.5 rounded-full border border-[#1e494b] px-3 text-xs font-semibold text-[#f3f0ed]/40 opacity-60 transition-all md:flex"
                    >
                      <Clapperboard className="h-3.5 w-3.5" />
                      Studio
                    </button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6}>
                  Em breve
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <LocaleSwitcher />

          {/* Settings dropdown — only for logged-in users */}
          {user && <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="group relative flex h-8 w-8 items-center justify-center cursor-pointer"
            >
              {(() => {
                const used = creditsBalance?.planCreditsUsed ?? 0;
                const remaining = creditsBalance?.planCreditsRemaining ?? 0;
                const total = used + remaining;
                const fraction = total > 0 ? remaining / total : 1;
                const R = 17;
                const C = 2 * Math.PI * R;
                const offset = C * (1 - fraction);
                const ringColor = fraction > 0.25 ? '#a2dd00' : fraction > 0.1 ? '#f59e0b' : '#ef4444';
                return (
                  <svg className="pointer-events-none absolute -inset-[3px] h-[38px] w-[38px]" viewBox="0 0 38 38">
                    <circle cx="19" cy="19" r={R} fill="none" stroke="rgba(243,240,237,0.08)" strokeWidth="2" />
                    <circle cx="19" cy="19" r={R} fill="none" stroke={ringColor} strokeWidth="2" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} transform="rotate(-90 19 19)" style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4, 0, 0.2, 1), stroke 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                  </svg>
                );
              })()}
              <span className="pointer-events-none absolute inset-0 rounded-full bg-[#a2dd00]/0 transition-colors group-hover:bg-[#a2dd00]/10" />
              <span className="flex h-8 w-8 overflow-hidden rounded-full border border-transparent transition-all">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} width={32} height={32} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-[#1e494b]">
                    <User className="h-4 w-4 text-[#f3f0ed]/40" />
                  </span>
                )}
              </span>
            </button>

            {menuOpen && (
              /* Desktop dropdown only */
              <div className="absolute right-0 top-full mt-2 hidden w-56 overflow-hidden rounded-xl border border-[#f3f0ed]/8 bg-[#1a2123] shadow-2xl sm:block">
                <div className="border-b border-landing-text/6 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs font-semibold text-landing-text">{user?.name || t('defaultUser')}</p>
                    {planName && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${isFreePlan
                          ? 'border border-[#f3f0ed]/15 bg-[#f3f0ed]/5 text-[#f3f0ed]/60'
                          : 'border border-[#a2dd00]/30 bg-[#a2dd00]/10 text-[#a2dd00]'
                          }`}
                      >
                        {planName}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-landing-text/40">{user?.email}</p>
                </div>
                <div className="py-1.5">
                  <DropdownItem icon={User} label={tMenu('profile')} onClick={() => { setMenuOpen(false); router.push('/perfil'); }} />
                  <DropdownItem icon={CreditCard} label={tMenu('credits')} onClick={() => { setMenuOpen(false); router.push('/creditos'); }} />
                  <DropdownItem icon={BadgePercent} label={tMenu('plans')} onClick={() => { setMenuOpen(false); setPlansModalOpen(true); }} />
                  <DropdownItem icon={BatteryCharging} label={tMenu('usage')} onClick={() => { setMenuOpen(false); router.push('/uso'); }} />
                  <DropdownItem icon={Users} label={tMenu('affiliate')} onClick={() => { setMenuOpen(false); router.push('/painel-afiliado'); }} />
                </div>
                <div className="border-t border-landing-text/6 flex items-center pr-3">
                  <div className="flex-1 min-w-0">
                    <DropdownItem icon={LogOut} label={tMenu('logout')} danger onClick={() => { setMenuOpen(false); handleLogout(); }} />
                  </div>
                  <LocaleSwitcher compact />
                </div>
              </div>
            )}
          </div>}
        </div>
      </header>

      {/* Mobile aside — fora do header para escapar do stacking context */}
      {/* Mobile aside — deslogado */}
      {!user && menuOpen && (
        <div className="fixed inset-0 z-200 sm:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <aside ref={asideRef} className="absolute right-0 top-0 flex h-full w-72 flex-col border-l border-[#f3f0ed]/8 bg-[#1a2123]">
            <div className="flex items-center justify-between border-b border-[#f3f0ed]/6 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-[#f3f0ed]">{t('loginTitle')}</p>
                <p className="mt-0.5 text-[11px] text-[#f3f0ed]/40">{t('loginSubtitle')}</p>
              </div>
              <button onClick={() => setMenuOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-full text-[#f3f0ed]/40 transition-colors hover:bg-[#f3f0ed]/6 hover:text-[#f3f0ed]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-2 p-4">
              <button
                onClick={() => { setGoogleLoading(true); window.location.href = '/api/v1/auth/google'; }}
                disabled={googleLoading}
                className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-[#f3f0ed]/10 bg-[#f3f0ed]/5 text-sm font-medium text-[#f3f0ed] transition-all hover:bg-[#f3f0ed]/10 active:scale-[0.98] disabled:opacity-50"
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
                    <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" />
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" />
                  </svg>
                )}
                {googleLoading ? t('redirecting') : t('continueWithGoogle')}
              </button>
              <button
                onClick={() => { setMenuOpen(false); openLoginModal(); }}
                className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-[#f3f0ed]/10 bg-[#f3f0ed]/5 text-sm font-medium text-[#f3f0ed] transition-all hover:bg-[#f3f0ed]/10 active:scale-[0.98]"
              >
                <LogIn className="h-4 w-4" />
                {t('signInWithEmail')}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Mobile aside — logado */}
      {user && menuOpen && (
        <div className="fixed inset-0 z-200 sm:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <aside ref={asideRef} className="absolute right-0 top-0 flex h-full w-72 flex-col border-l border-[#f3f0ed]/8 bg-[#1a2123]">
            <div className="flex items-center justify-between border-b border-landing-text/6 px-4 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-landing-text">{user?.name || t('defaultUser')}</p>
                  {planName && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${isFreePlan
                        ? 'border border-[#f3f0ed]/15 bg-[#f3f0ed]/5 text-[#f3f0ed]/60'
                        : 'border border-[#a2dd00]/30 bg-[#a2dd00]/10 text-[#a2dd00]'
                        }`}
                    >
                      {planName}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-landing-text/40">{user?.email}</p>
              </div>
              <button onClick={() => setMenuOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-full text-landing-text/40 transition-colors hover:bg-landing-text/6 hover:text-landing-text">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 py-2">
              <DropdownItem icon={User} label={tMenu('profile')} onClick={() => { setMenuOpen(false); router.push('/perfil'); }} />
              <DropdownItem icon={CreditCard} label={tMenu('credits')} onClick={() => { setMenuOpen(false); router.push('/creditos'); }} />
              <DropdownItem icon={BadgePercent} label={tMenu('plans')} onClick={() => { setMenuOpen(false); setPlansModalOpen(true); }} />
              <DropdownItem icon={BatteryCharging} label={tMenu('usage')} onClick={() => { setMenuOpen(false); router.push('/uso'); }} />
              <DropdownItem icon={Users} label={tMenu('affiliate')} onClick={() => { setMenuOpen(false); router.push('/painel-afiliado'); }} />
            </div>
            <div className="border-t border-landing-text/6 flex items-center pr-4 py-1">
              <div className="flex-1 min-w-0">
                <DropdownItem icon={LogOut} label={tMenu('logout')} danger onClick={() => { setMenuOpen(false); handleLogout(); }} />
              </div>
              <LocaleSwitcher compact />
            </div>
          </aside>
        </div>
      )}

      {plansModalOpen && <PlansModal onClose={() => setPlansModalOpen(false)} />}
      {affiliateModalOpen && <AffiliateProgramModal onClose={() => setAffiliateModalOpen(false)} />}
    </>
  );
}

function DropdownItem({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: typeof Settings;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs transition-colors ${danger
        ? 'text-red-400/80 hover:bg-red-400/10 hover:text-red-400'
        : 'text-[#f3f0ed]/60 hover:bg-[#f3f0ed]/[0.04] hover:text-[#f3f0ed]'
        }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
