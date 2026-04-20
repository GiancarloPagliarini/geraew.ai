'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SUB_NAV = [
  { href: '/admin/stripe', label: 'Overview' },
  { href: '/admin/stripe/transacoes', label: 'Transações' },
  { href: '/admin/stripe/clientes', label: 'Clientes' },
  { href: '/admin/stripe/assinaturas', label: 'Assinaturas' },
  { href: '/admin/stripe/produtos', label: 'Produtos' },
  { href: '/admin/stripe/precos', label: 'Preços' },
  { href: '/admin/stripe/cupons', label: 'Cupons' },
];

export default function StripeAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-xl font-bold text-[#f3f0ed] md:text-2xl">Stripe</h1>
        <p className="mt-0.5 text-sm text-[#f3f0ed]/40">
          Gerencia transações, clientes, produtos e assinaturas direto no Stripe.
        </p>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-[#f3f0ed]/6 pb-0">
        {SUB_NAV.map((item) => {
          const isActive =
            item.href === '/admin/stripe'
              ? pathname === '/admin/stripe'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-t-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                isActive
                  ? 'border-b-2 border-[#a2dd00] text-[#a2dd00]'
                  : 'border-b-2 border-transparent text-[#f3f0ed]/50 hover:text-[#f3f0ed]/80'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div>{children}</div>
    </div>
  );
}
