'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, type Announcement, type AnnouncementAction } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

/** Gradientes levemente variados para os cards sem imagem, mantendo o tom teal+lime. */
const THUMB_TINTS = [
  'radial-gradient(circle at 80% 20%, rgba(162,221,0,0.16), transparent 60%)',
  'radial-gradient(circle at 20% 80%, rgba(162,221,0,0.12), transparent 55%)',
  'radial-gradient(circle at 75% 75%, rgba(162,221,0,0.14), transparent 60%)',
  'radial-gradient(circle at 25% 25%, rgba(162,221,0,0.1), transparent 55%)',
];

/** Destino de navegação para cada ação de CTA suportada fora do workspace. */
function actionHref(action: AnnouncementAction | null): string | null {
  if (!action) return null;
  switch (action.type) {
    case 'open-image-panel':
      return '/image';
    case 'open-video-panel':
      return '/video';
    case 'open-audio-panel':
      return '/voice';
    case 'href':
      return action.url;
    default:
      // weekly-claim / unlimited são modais internos do workspace
      return null;
  }
}

function NewsCard({ item, tintIndex }: { item: Announcement; tintIndex: number }) {
  const t = useTranslations('home');
  const href = actionHref(item.ctaAction);

  const content = (
    <article className="group relative h-[256px] w-[86vw] max-w-[470px] shrink-0 select-none overflow-hidden rounded-[18px] border border-app-hairline transition-colors duration-200 ease-app hover:border-app-hairline-2 sm:w-[470px]">
      {/* fundo: imagem do aviso ou gradiente lime */}
      {item.imageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            draggable={false}
            className="absolute inset-0 size-full object-cover transition-transform duration-300 ease-app group-hover:scale-[1.03]"
          />
          {/* scrim da esquerda para o texto respirar sobre a imagem */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,16,17,0.82)_0%,rgba(13,16,17,0.45)_48%,transparent_75%)]" />
        </>
      ) : (
        <div
          className="absolute inset-0 bg-[linear-gradient(135deg,#1d2628,#161d1f)]"
          style={{ backgroundImage: THUMB_TINTS[tintIndex % THUMB_TINTS.length] }}
        />
      )}

      <div className="relative flex h-full flex-col items-start justify-between p-5">
        {/* chip do badge */}
        <span className="flex items-center gap-1.5 rounded-full bg-[rgba(13,16,17,0.62)] px-3 py-1.5 backdrop-blur-md">
          <Megaphone className="size-3 text-app-lime" strokeWidth={2} />
          <span className="text-[11px] font-bold text-white">{item.badge || t('news.title')}</span>
        </span>

        <div className="max-w-[78%]">
          <h3 className="text-[24px] font-extrabold leading-[1.15] text-white">{item.title}</h3>
          <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-[rgba(243,240,237,0.75)]">
            {item.description}
          </p>
        </div>

        {href ? (
          <span className="rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-[#11181a] transition-transform duration-200 ease-app group-hover:scale-[1.03]">
            {item.ctaLabel || t('news.cta')}
          </span>
        ) : (
          <span aria-hidden className="h-9" />
        )}
      </div>
    </article>
  );

  if (!href) return content;

  const isExternal = /^https?:\/\//.test(href);
  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" draggable={false} className="contents">
        {content}
      </a>
    );
  }
  return (
    <Link href={href} draggable={false} className="contents">
      {content}
    </Link>
  );
}

/** Seção "Novidades" da home — carousel com os avisos ativos do admin. */
export function NewsSection() {
  const { user, accessToken } = useAuth();
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, moved: false, startX: 0, startScroll: 0 });
  const [active, setActive] = useState(0);

  const { data, isPending } = useQuery({
    queryKey: ['announcements', 'active'],
    queryFn: () => api.announcements.active(accessToken!),
    enabled: !!accessToken && !!user,
    staleTime: 5 * 60_000,
  });

  const items = data ?? [];
  if (!isPending && items.length === 0) return null;

  // Os dots mapeiam a fração do scroll total (0..1) para 0..n-1 — assim o
  // último dot acende exatamente quando o trilho chega ao fim.
  const maxScroll = () => {
    const el = trackRef.current;
    return el ? el.scrollWidth - el.clientWidth : 0;
  };

  const scrollToIndex = (i: number) => {
    const max = maxScroll();
    if (max <= 0 || items.length < 2) return;
    trackRef.current?.scrollTo({
      left: (i / (items.length - 1)) * max,
      behavior: 'smooth',
    });
  };

  return (
    <section>
      {isPending ? (
        <div className="flex gap-5 overflow-hidden">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="h-[256px] w-[86vw] max-w-[470px] shrink-0 skeleton-app rounded-[18px] bg-app-surface sm:w-[470px]"
            />
          ))}
        </div>
      ) : (
        <>
          <div
            ref={trackRef}
            onScroll={(e) => {
              const max = maxScroll();
              const next =
                max > 0
                  ? Math.round((e.currentTarget.scrollLeft / max) * (items.length - 1))
                  : 0;
              setActive((prev) => (prev === next ? prev : next));
            }}
            onPointerDown={(e) => {
              if (e.pointerType !== 'mouse' || e.button !== 0) return;
              drag.current = {
                down: true,
                moved: false,
                startX: e.clientX,
                startScroll: trackRef.current?.scrollLeft ?? 0,
              };
            }}
            onPointerMove={(e) => {
              if (!drag.current.down || !trackRef.current) return;
              const dx = e.clientX - drag.current.startX;
              if (Math.abs(dx) > 5 && !drag.current.moved) {
                drag.current.moved = true;
                trackRef.current.setPointerCapture(e.pointerId);
              }
              if (drag.current.moved) trackRef.current.scrollLeft = drag.current.startScroll - dx;
            }}
            onPointerUp={() => {
              drag.current.down = false;
            }}
            onPointerCancel={() => {
              drag.current.down = false;
              drag.current.moved = false;
            }}
            onClickCapture={(e) => {
              // após arrastar, o "soltar" não deve abrir o card
              if (drag.current.moved) {
                e.preventDefault();
                e.stopPropagation();
                drag.current.moved = false;
              }
            }}
            className="-mx-1 flex cursor-grab gap-5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
          >
            {items.map((item, i) => (
              <NewsCard key={item.id} item={item} tintIndex={i} />
            ))}
          </div>

          {/* dots + setas */}
          {items.length > 1 && (
            <div className="mt-4 flex items-center justify-center gap-1.5">
              {items.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={item.title}
                  onClick={() => scrollToIndex(i)}
                  className={cn(
                    'h-[7px] rounded-full transition-all duration-300 ease-app',
                    i === active
                      ? 'w-[22px] bg-app-text'
                      : 'w-[7px] bg-app-text/25 hover:bg-app-text/50',
                  )}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
