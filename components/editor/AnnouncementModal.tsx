'use client';

import { BrainCircuit, Wrench, Tag, ArrowRight, Gift, Mic, Infinity as InfinityIcon } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Announcement, AnnouncementVariant } from '@/lib/announcements';

interface AnnouncementModalProps {
  announcement: Announcement;
  open: boolean;
  onClose: () => void;
  /** Invocado quando o usuário clica no CTA (antes do close). */
  onCta?: () => void;
  /** Posição atual no carousel (0-based). Omitir = aviso único. */
  currentIndex?: number;
  /** Total de avisos no carousel. Omitir = aviso único. */
  total?: number;
  /** Pula pra um aviso específico (clicando nos dots). */
  onJumpTo?: (index: number) => void;
  /** Avança pro próximo. Se não houver, comporta como Fechar. */
  onNext?: () => void;
}

function OpenAILogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
    </svg>
  );
}

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

const VARIANT_ICON: Record<AnnouncementVariant, IconComponent> = {
  feature: BrainCircuit,
  maintenance: Wrench,
  promo: Tag,
  openai: OpenAILogo,
  gift: Gift,
  mic: Mic,
  unlimited: InfinityIcon,
};

/** Paleta visual por variante. `unlimited` usa violeta; resto usa verde-limão. */
interface VariantPalette {
  accent: string;
  containerBorder: string;
  containerBgGradient: string;
  blobStrong: string;
  blobFaint: string;
  iconRingPanel: string;
  iconRingBg: string;
  iconText: string;
  badgeBorder: string;
  badgeBg: string;
  badgeText: string;
  ctaBg: string;
  ctaBgHover: string;
  ctaShadow: string;
  ctaShadowHover: string;
  ctaText: string;
  dotActive: string;
}

const PALETTE_GREEN: VariantPalette = {
  accent: '#a2dd00',
  containerBorder: 'rgba(162,221,0,0.2)',
  containerBgGradient: 'linear-gradient(135deg, #1f2a1c 0%, #1a2123 50%, #1a2123 100%)',
  blobStrong: 'rgba(162,221,0,0.20)',
  blobFaint: 'rgba(162,221,0,0.10)',
  iconRingPanel: 'rgba(162,221,0,0.30)',
  iconRingBg: 'rgba(162,221,0,0.15)',
  iconText: '#a2dd00',
  badgeBorder: 'rgba(162,221,0,0.30)',
  badgeBg: 'rgba(162,221,0,0.10)',
  badgeText: '#a2dd00',
  ctaBg: '#a2dd00',
  ctaBgHover: '#b8f000',
  ctaShadow: '0 0 24px rgba(162,221,0,0.35)',
  ctaShadowHover: '0 0 32px rgba(162,221,0,0.5)',
  ctaText: '#1c1917',
  dotActive: '#a2dd00',
};

const PALETTE_VIOLET: VariantPalette = {
  accent: '#a855f7',
  containerBorder: 'rgba(168,85,247,0.25)',
  containerBgGradient: 'linear-gradient(135deg, #1f1929 0%, #161018 50%, #161018 100%)',
  blobStrong: 'rgba(168,85,247,0.22)',
  blobFaint: 'rgba(168,85,247,0.10)',
  iconRingPanel: 'rgba(168,85,247,0.35)',
  iconRingBg: 'rgba(168,85,247,0.18)',
  iconText: '#d8b4fe',
  badgeBorder: 'rgba(168,85,247,0.35)',
  badgeBg: 'rgba(168,85,247,0.12)',
  badgeText: '#d8b4fe',
  ctaBg: 'linear-gradient(135deg, #a855f7 0%, #c084fc 100%)',
  ctaBgHover: 'linear-gradient(135deg, #9333ea 0%, #a855f7 100%)',
  ctaShadow: '0 4px 24px rgba(168,85,247,0.45)',
  ctaShadowHover: '0 6px 32px rgba(168,85,247,0.6)',
  ctaText: '#ffffff',
  dotActive: '#a855f7',
};

function getPalette(variant: AnnouncementVariant | null | undefined): VariantPalette {
  return variant === 'unlimited' ? PALETTE_VIOLET : PALETTE_GREEN;
}

export function AnnouncementModal({
  announcement,
  open,
  onClose,
  onCta,
  currentIndex,
  total,
  onJumpTo,
  onNext,
}: AnnouncementModalProps) {
  const t = useTranslations('editorRewards.announcementModal');
  const Icon = VARIANT_ICON[announcement.variant ?? 'feature'];
  const palette = getPalette(announcement.variant);

  const isCarousel = typeof total === 'number' && total > 1 && typeof currentIndex === 'number';
  const isLast = isCarousel && currentIndex === total - 1;
  const hasNext = isCarousel && !isLast;

  function handleCta() {
    onCta?.();
    onClose();
  }

  function handleSecondary() {
    if (hasNext && onNext) onNext();
    else onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[460px] overflow-hidden border-0 bg-transparent p-0 shadow-none"
      >
        <div
          className="relative overflow-hidden rounded-2xl border"
          style={{
            borderColor: palette.containerBorder,
            background: palette.containerBgGradient,
          }}
        >
          {/* Hero image — full bleed no topo */}
          {announcement.imageUrl && (
            <div className="relative h-56 w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={announcement.imageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#1a2123]/20 to-[#1a2123]" />
            </div>
          )}

          <div
            className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl"
            style={{ background: palette.blobStrong }}
          />
          <div
            className="pointer-events-none absolute -bottom-32 -left-20 h-64 w-64 rounded-full blur-3xl"
            style={{ background: palette.blobFaint }}
          />

          <div className="relative z-10 flex flex-col items-center p-8 text-center">
            {announcement.imageUrl ? (
              <div
                className="-mt-16 mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1a2123] shadow-lg ring-1"
                style={{ boxShadow: `0 0 0 1px ${palette.iconRingPanel}` }}
              >
                <Icon className="h-6 w-6" style={{ color: palette.iconText }} />
              </div>
            ) : (
              <div
                className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ring-1"
                style={{
                  background: palette.iconRingBg,
                  boxShadow: `0 0 0 1px ${palette.iconRingPanel}`,
                }}
              >
                <Icon className="h-8 w-8" style={{ color: palette.iconText }} />
              </div>
            )}

            {announcement.badge && (
              <div
                className="mb-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider"
                style={{
                  borderColor: palette.badgeBorder,
                  background: palette.badgeBg,
                  color: palette.badgeText,
                }}
              >
                {announcement.badge}
              </div>
            )}

            <DialogTitle className="mb-3 text-2xl font-bold text-[#f3f0ed]">
              {announcement.title}
            </DialogTitle>

            <DialogDescription className="mb-6 text-[15px] leading-relaxed text-[#f3f0ed]/70">
              {announcement.description}
            </DialogDescription>

            <div className="flex w-full flex-col gap-2">
              <Button
                onClick={handleCta}
                className="group h-11 w-full font-semibold transition-all hover:brightness-110"
                style={{
                  background: palette.ctaBg,
                  color: palette.ctaText,
                  boxShadow: palette.ctaShadow,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = palette.ctaShadowHover)}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = palette.ctaShadow)}
              >
                {announcement.ctaLabel ?? t('defaultCta')}
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
              <Button
                onClick={handleSecondary}
                variant="ghost"
                className="h-10 w-full text-sm text-[#f3f0ed]/50 hover:bg-transparent hover:text-[#f3f0ed]/80"
              >
                {hasNext ? t('nextAnnouncement') : t('close')}
              </Button>
            </div>

            {isCarousel && (
              <div className="mt-5 flex items-center justify-center gap-1.5">
                {Array.from({ length: total ?? 0 }).map((_, i) => {
                  const active = i === currentIndex;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onJumpTo?.(i)}
                      aria-label={`Ir para aviso ${i + 1}`}
                      className="h-1.5 rounded-full transition-all hover:bg-[#f3f0ed]/30"
                      style={{
                        width: active ? '1.5rem' : '0.375rem',
                        background: active ? palette.dotActive : 'rgba(243,240,237,0.15)',
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
