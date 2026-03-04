'use client';

import { Coins, CreditCard, Gift, LogOut, Plus, Settings, User } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useEditor } from '@/lib/editor-context';

export function TopNavbar() {
  const router = useRouter();
  const { credits } = useEditor();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha o menu ao clicar fora

  // Fecha o menu ao clicar fora
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  function handleLogout() {
    localStorage.removeItem('geraew-auth');
    router.push('/login');
  }

  return (
    <header className="relative z-50 flex h-12 shrink-0 items-center justify-between border-b border-[#f3f0ed]/[0.07] bg-[#1a2123] px-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <Image
          src="/logo_2.svg"
          alt="Geraew AI"
          width={32}
          height={32}
          className="rounded-md mix-blend-lighten"
        />
        <span className="text-xs font-semibold tracking-[0.2em] text-[#f3f0ed]">
          Geraew.AI
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Credit badge */}
        <div className="flex items-center gap-1.5 rounded-full border border-[#f3f0ed]/10 bg-[#f3f0ed]/[0.05] px-3 py-1.5">
          <Coins className="h-3.5 w-3.5 text-[#a2dd00]" />
          <span className="text-xs font-semibold text-[#f3f0ed]">{credits}</span>
        </div>

        {/* Buy button — accent lime */}
        <button className="flex items-center gap-1.5 rounded-full bg-[#a2dd00] px-4 py-1.5 text-xs font-bold text-[#1a2123] transition-all hover:brightness-110 active:scale-95">
          <Plus className="h-3.5 w-3.5" />
          Comprar
        </button>

        {/* Refer button — teal outline */}
        <button className="flex items-center gap-1.5 rounded-full border border-[#1e494b] px-4 py-1.5 text-xs font-semibold text-[#f3f0ed]/80 transition-all hover:border-[#a2dd00]/50 hover:text-[#f3f0ed]">
          <Gift className="h-3.5 w-3.5" />
          Indique
        </button>

        {/* Settings dropdown */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all ${menuOpen
              ? 'border-[#a2dd00]/30 text-[#a2dd00]'
              : 'border-[#f3f0ed]/10 text-[#f3f0ed]/40 hover:border-[#a2dd00]/30 hover:text-[#a2dd00]'
              }`}
          >
            <Settings className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-[#f3f0ed]/[0.08] bg-[#1a2123] shadow-2xl">
              {/* User info */}
              <div className="border-b border-[#f3f0ed]/[0.06] px-4 py-3">
                <p className="text-xs font-semibold text-[#f3f0ed]">Usuário</p>
                <p className="mt-0.5 text-[11px] text-[#f3f0ed]/40">usuario@email.com</p>
              </div>

              {/* Menu items */}
              <div className="py-1.5">
                <DropdownItem
                  icon={User}
                  label="Perfil"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push('/perfil');
                  }}
                />
                <DropdownItem
                  icon={CreditCard}
                  label="Créditos"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push('/creditos');
                  }}
                />
              </div>

              {/* Logout */}
              <div className="border-t border-[#f3f0ed]/[0.06] py-1.5">
                <DropdownItem
                  icon={LogOut}
                  label="Sair"
                  danger
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
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
