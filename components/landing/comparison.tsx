"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useScrollReveal } from "./use-scroll-reveal";

type Platform = { key: string; price: string; logo: string };

const PLATFORMS: Platform[] = [
  {
    key: "chatgpt",
    price: "R$ 1.100",
    logo: "https://cdn.geraew.com.br/storage/v1/object/public/ai-generations/admin_assets/landing/24068788-cb91-4365-9fe0-7f7420944c24/output_0__15_.png",
  },
  {
    key: "googleFlow",
    price: "R$ 1.375",
    logo: "https://cdn.geraew.com.br/storage/v1/object/public/ai-generations/admin_assets/landing/a2f2f9e2-4783-412e-8052-795f99de108c/output_0__10_.png",
  },
  {
    key: "magnific",
    price: "R$ 540",
    logo: "https://cdn.geraew.com.br/storage/v1/object/public/ai-generations/admin_assets/landing/ae29d1c1-65ba-45fc-9338-e6786fce20c3/output_0__12_.png",
  },
  {
    key: "kling",
    price: "R$ 200",
    logo: "https://cdn.geraew.com.br/storage/v1/object/public/ai-generations/admin_assets/landing/87533535-09ba-4048-84eb-237184c7e896/output_0__14_.png",
  },
  {
    key: "elevenLabs",
    price: "R$ 540",
    logo: "https://cdn.geraew.com.br/storage/v1/object/public/ai-generations/admin_assets/landing/b2f95bd9-ee8c-4eef-859d-cd4876acc86c/output_0__11_.png",
  },
  {
    key: "xPremium",
    price: "R$ 220",
    logo: "https://cdn.geraew.com.br/storage/v1/object/public/ai-generations/admin_assets/landing/c1ae7d1b-374a-4555-a97d-df49ccb703f2/output_0__13_.png",
  },
];

function PlatformBadge({ logo, name }: { logo: string; name: string }) {
  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
      <Image
        src={logo}
        alt={name}
        fill
        sizes="40px"
        className="object-cover"
      />
    </div>
  );
}

export function Comparison() {
  const t = useTranslations("comparison");
  const { ref, isVisible } = useScrollReveal();
  const { ref: refList, isVisible: listVisible } = useScrollReveal();
  const { ref: refTotal, isVisible: totalVisible } = useScrollReveal();
  const perMonth = t("perMonth");

  return (
    <section className="py-16 sm:py-28 lg:py-36">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Header */}
        <div
          ref={ref}
          className="mx-auto max-w-2xl text-center transition-all duration-700"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(24px)",
          }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-landing-accent">
            {t("tag")}
          </span>
          <h2 className="mt-4 font-sora text-[26px] font-bold tracking-tight text-landing-text sm:mt-5 sm:text-3xl lg:text-[44px]">
            {t("title")}
          </h2>
        </div>

        {/* Platform list card */}
        <div
          ref={refList}
          className="mx-auto mt-10 max-w-3xl rounded-2xl border border-[#f3f0ed]/[0.06] bg-landing-card p-1.5 transition-all duration-700 sm:mt-16 sm:p-2 lg:mt-20"
          style={{
            opacity: listVisible ? 1 : 0,
            transform: listVisible ? "translateY(0)" : "translateY(28px)",
          }}
        >
          <ul className="divide-y divide-[#f3f0ed]/[0.05]">
            {PLATFORMS.map((p) => (
              <li
                key={p.key}
                className="flex items-center gap-3.5 px-3 py-3 sm:px-4 sm:py-3.5"
              >
                <PlatformBadge logo={p.logo} name={t(`platforms.${p.key}.name`)} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-1.5">
                    <span className="font-sora text-[13px] font-semibold text-landing-text sm:text-[14px]">
                      {t(`platforms.${p.key}.name`)}
                    </span>
                    <span className="text-[12px] text-landing-text-secondary">
                      {t(`platforms.${p.key}.desc`)}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 text-[12px] font-medium text-landing-text-muted line-through sm:text-[13px]">
                  {p.price}
                  {perMonth}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Total card */}
        <div
          ref={refTotal}
          className="mx-auto mt-3 max-w-3xl rounded-2xl border border-[#f3f0ed]/[0.06] bg-landing-card p-5 text-center transition-all duration-700 sm:mt-4 sm:p-7"
          style={{
            opacity: totalVisible ? 1 : 0,
            transform: totalVisible ? "translateY(0)" : "translateY(28px)",
            transitionDelay: "120ms",
          }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-landing-text-muted sm:text-[11px]">
            {t("totalTag")}
          </span>
          <p className="mt-2.5 font-sora text-[24px] font-bold tracking-tight text-landing-text-muted line-through decoration-landing-text-muted/70 decoration-[2.5px] sm:text-[30px] lg:text-[34px]">
            {t("totalAmount")}
          </p>
          <p className="mx-auto mt-3 max-w-xl text-[13px] leading-relaxed text-landing-text-secondary sm:mt-3.5 sm:text-[14px]">
            {t.rich("totalDescription", {
              strong: (chunks) => (
                <strong className="font-semibold text-landing-text">{chunks}</strong>
              ),
            })}
          </p>
        </div>
      </div>
    </section>
  );
}
