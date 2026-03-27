'use client';

import { BadgePercent, BatteryCharging, Coins, CreditCard, Gift, LogIn, LogOut, Plus, Settings, User, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useEditor } from '@/lib/editor-context';
import { useAuth } from '@/lib/auth-context';
import { BuyCreditsModal } from './BuyCreditsModal';
import { PlansModal } from './PlansModal';
import { PostAndEarnModal } from './PostAndEarnModal';

export function TopNavbar() {
  const router = useRouter();
  const { credits, creditsLoading, creditsBalance } = useEditor();
  const { user, logout, loading: authLoading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [postAndEarnOpen, setPostAndEarnOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);

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

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <>
      <header className="relative z-50 flex h-12 shrink-0 items-center justify-between border-b border-[#f3f0ed]/[0.07] bg-[#1a2123] px-2 sm:px-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo_2.svg"
            alt="Geraew AI"
            width={32}
            height={32}
            className="rounded-md mix-blend-lighten"
          />
          <span className="hidden text-sm font-medium text-[#f3f0ed] sm:inline">
            Geraew.AI
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
            <>
              {/* Credit badge */}
              <div className="flex items-center gap-1.5 rounded-full border border-[#f3f0ed]/10 bg-[#f3f0ed]/[0.05] px-2 py-1.5 sm:px-3">
                <Coins className="h-3.5 w-3.5 text-[#a2dd00]" />
                {creditsLoading ? (
                  <div className="h-3 w-10 animate-pulse rounded-full bg-[#f3f0ed]/10" />
                ) : (
                  <span className="text-xs font-semibold text-[#f3f0ed]">{credits.toLocaleString('pt-BR')}</span>
                )}
              </div>

              {/* Buy button — accent lime (icon-only on mobile) */}
              <button
                onClick={() => setBuyModalOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-[#a2dd00] p-2 text-xs font-bold text-[#1a2123] transition-all hover:brightness-110 active:scale-95 sm:px-4 sm:py-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Comprar Créditos</span>
              </button>

              {/* Refer button — hidden on mobile */}
              <button
                onClick={() => setPostAndEarnOpen(true)}
                className="hidden items-center gap-1.5 rounded-full border border-[#1e494b] px-4 py-1.5 text-xs font-semibold text-[#f3f0ed]/80 transition-all hover:border-[#a2dd00]/50 hover:text-[#f3f0ed] sm:flex"
              >
                <Gift className="h-3.5 w-3.5" />
                Poste e ganhe
              </button>
            </>
          ) : (
            /* Login dropdown for unauthenticated users */
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full bg-[#a2dd00] px-3 py-1.5 text-xs font-bold text-[#1a2123] transition-all hover:brightness-110 active:scale-95"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Entrar</span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-xl border border-[#f3f0ed]/8 bg-[#1a2123] shadow-2xl">
                  <div className="px-4 py-3 border-b border-[#f3f0ed]/6">
                    <p className="text-xs font-semibold text-[#f3f0ed]">Faça login para gerar</p>
                    <p className="mt-0.5 text-[11px] text-[#f3f0ed]/40">Acesso gratuito com créditos iniciais</p>
                  </div>
                  <div className="p-3 flex flex-col gap-2">
                    {/* Google login */}
                    <button
                      onClick={() => { window.location.href = '/api/v1/auth/google'; }}
                      className="flex h-10 w-full items-center justify-center gap-2.5 rounded-lg border border-[#f3f0ed]/10 bg-[#f3f0ed]/[0.05] text-xs font-medium text-[#f3f0ed] transition-all hover:bg-[#f3f0ed]/10 active:scale-[0.98]"
                    >
                      <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
                        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
                        <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" />
                        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" />
                      </svg>
                      Continuar com Google
                    </button>
                    {/* Email login */}
                    <button
                      onClick={() => { setMenuOpen(false); router.push('/login'); }}
                      className="flex h-10 w-full items-center justify-center gap-2.5 rounded-lg border border-[#f3f0ed]/10 bg-[#f3f0ed]/[0.05] text-xs font-medium text-[#f3f0ed] transition-all hover:bg-[#f3f0ed]/10 active:scale-[0.98]"
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      Entrar com e-mail
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

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
                  <Image src={user.avatarUrl} alt={user.name} width={32} height={32} className="h-full w-full object-cover" />
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
                <div className="border-b border-[#f3f0ed]/6 px-4 py-3">
                  <p className="text-xs font-semibold text-[#f3f0ed]">{user?.name || 'Usuário'}</p>
                  <p className="mt-0.5 text-[11px] text-[#f3f0ed]/40">{user?.email}</p>
                </div>
                <div className="py-1.5">
                  <DropdownItem icon={User} label="Perfil" onClick={() => { setMenuOpen(false); router.push('/perfil'); }} />
                  <DropdownItem icon={CreditCard} label="Créditos" onClick={() => { setMenuOpen(false); router.push('/creditos'); }} />
                  <DropdownItem icon={BadgePercent} label="Planos" onClick={() => { setMenuOpen(false); setPlansModalOpen(true); }} />
                  <DropdownItem icon={BatteryCharging} label="Uso" onClick={() => { setMenuOpen(false); router.push('/uso'); }} />
                </div>
                <div className="border-t border-[#f3f0ed]/6 py-1.5">
                  <DropdownItem icon={LogOut} label="Sair" danger onClick={() => { setMenuOpen(false); handleLogout(); }} />
                </div>
              </div>
            )}
          </div>}
        </div>
      </header>

      {/* Mobile aside — fora do header para escapar do stacking context */}
      {user && menuOpen && (
        <div className="fixed inset-0 z-200 sm:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <aside ref={asideRef} className="absolute right-0 top-0 flex h-full w-72 flex-col border-l border-[#f3f0ed]/8 bg-[#1a2123]">
            <div className="flex items-center justify-between border-b border-[#f3f0ed]/6 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-[#f3f0ed]">{user?.name || 'Usuário'}</p>
                <p className="mt-0.5 text-[11px] text-[#f3f0ed]/40">{user?.email}</p>
              </div>
              <button onClick={() => setMenuOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-full text-[#f3f0ed]/40 transition-colors hover:bg-[#f3f0ed]/6 hover:text-[#f3f0ed]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 py-2">
              <DropdownItem icon={User} label="Perfil" onClick={() => { setMenuOpen(false); router.push('/perfil'); }} />
              <DropdownItem icon={CreditCard} label="Créditos" onClick={() => { setMenuOpen(false); router.push('/creditos'); }} />
              <DropdownItem icon={BadgePercent} label="Planos" onClick={() => { setMenuOpen(false); setPlansModalOpen(true); }} />
              <DropdownItem icon={BatteryCharging} label="Uso" onClick={() => { setMenuOpen(false); router.push('/uso'); }} />
            </div>
            <div className="border-t border-[#f3f0ed]/6 py-2">
              <DropdownItem icon={LogOut} label="Sair" danger onClick={() => { setMenuOpen(false); handleLogout(); }} />
            </div>
          </aside>
        </div>
      )}

      {buyModalOpen && <BuyCreditsModal onClose={() => setBuyModalOpen(false)} />}
      {plansModalOpen && <PlansModal onClose={() => setPlansModalOpen(false)} />}
      {postAndEarnOpen && <PostAndEarnModal onClose={() => setPostAndEarnOpen(false)} />}
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
