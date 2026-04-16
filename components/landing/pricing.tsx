"use client";

import { Check, Shield, ArrowRight, Lock, Loader2, Sparkles } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "./use-scroll-reveal";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLoginModal } from "@/lib/login-modal-context";
import { api, Plan } from "@/lib/api";
import {
  PLAN_ORDER,
  PLAN_GENERATIONS,
  PLAN_ORIGINAL_PRICES,
  PLAN_DISCOUNT_LABELS,
  PLAN_SOCIAL_PROOF,
  formatPrice,
  formatPriceRaw,
} from "@/lib/plans";

function useTranslatedPlanFeatures(plan: Plan): string[] {
  const t = useTranslations("pricing.features");
  const features: string[] = [];

  if (plan.slug === "free") {
    features.push(t("credits", { count: 350 }));
    features.push(t("emailSupport"));
    features.push(t("gallery7"));
    features.push(t("tryNoCommit"));
    return features;
  }

  features.push(
    t("credits", {
      count: plan.creditsPerMonth.toLocaleString("pt-BR"),
    }),
  );

  if (plan.slug === "pro" || plan.slug === "studio" || plan.slug === "advanced") {
    features.push(t("queuePriority"));
    features.push(t("fasterGen"));
    features.push(t("prioritySupport"));
    features.push(t("gallery365"));
  } else if (plan.slug === "creator" || plan.slug === "basic") {
    features.push(t("fasterGen"));
    features.push(t("emailSupport"));
    features.push(t("gallery180"));
  } else {
    features.push(t("emailSupport"));
    features.push(t("gallery90"));
  }

  return features;
}

function PlanCard({ plan, i }: { plan: Plan; i: number; total: number }) {
  const t = useTranslations("pricing");
  const tPlans = useTranslations("plans");
  const { user } = useAuth();
  const { openLoginModal } = useLoginModal();
  const isLoggedIn = !!user;
  const { ref, isVisible } = useScrollReveal();
  const locale = useLocale();
  const isPopular = plan.slug === "creator";
  const isFree = plan.priceCents === 0;
  const { main, sub } = formatPrice(plan.priceCents, plan.currency, locale);
  const features = useTranslatedPlanFeatures(plan);
  const generationExamples = PLAN_GENERATIONS[plan.slug] ?? [];
  const hasSubtitle = ["ultra-basic", "starter", "basic", "creator", "pro", "advanced", "studio"].includes(plan.slug);
  const subtitle = hasSubtitle ? tPlans(`subtitles.${plan.slug}`) : undefined;
  const originalPrice = PLAN_ORIGINAL_PRICES[plan.slug];
  const discountLabel = PLAN_DISCOUNT_LABELS[plan.slug];
  const socialProof = PLAN_SOCIAL_PROOF[plan.slug];
  const hasSocialProof = ["free", "ultra-basic", "starter", "basic", "creator", "pro", "advanced", "studio"].includes(plan.slug);
  const socialProofText = hasSocialProof ? tPlans(`socialProof.${plan.slug}`) : undefined;

  return (
    <div
      ref={ref}
      className={cn(
        "group relative flex flex-col rounded-[20px] border transition-all duration-600",
        isPopular
          ? "border-landing-accent/30 bg-[#1a2523]"
          : "border-[#f3f0ed]/[0.05] bg-[#171e20] hover:border-[#f3f0ed]/[0.1]",
      )}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(36px)",
        transitionDelay: `${i * 100}ms`,
      }}
    >
      {/* Popular glow effect */}
      {isPopular && (
        <>
          <div
            className="pointer-events-none absolute -inset-px rounded-[20px] opacity-60"
            style={{
              background:
                "linear-gradient(180deg, rgba(162,221,0,0.12) 0%, rgba(162,221,0,0) 40%)",
            }}
          />
          <div
            className="pointer-events-none absolute -top-[1px] left-6 right-6 h-[1px]"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(162,221,0,0.5), transparent)",
            }}
          />
        </>
      )}

      {/* Popular badge */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
          <div className="flex items-center gap-1.5 rounded-full bg-landing-accent px-2.5 py-1 shadow-[0_0_20px_rgba(162,221,0,0.3)]">
            <Sparkles className="h-3 w-3 text-[#141a1c]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#141a1c]">
              {t("mostPopular")}
            </span>
          </div>
        </div>
      )}

      {/* Card inner */}
      <div className="relative flex flex-1 flex-col p-5 sm:p-7">
        {/* Plan header */}
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="font-sora text-[16px] font-bold text-[#f3f0ed]">
              {plan.name}
            </h3>
            {subtitle && (
              <span className="rounded-md bg-[#f3f0ed]/[0.05] px-2 py-0.5 text-[10px] font-medium text-[#f3f0ed]/40">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Credits — hero number */}
        <div className="mt-5">
          <div className="flex items-baseline gap-1.5">
            <span
              className={cn(
                "font-sora text-[36px] font-extrabold leading-none tracking-tight sm:text-[44px]",
                isPopular ? "text-landing-accent" : "text-[#f3f0ed]",
              )}
            >
              {isFree
                ? plan.creditsPerMonth
                : plan.creditsPerMonth.toLocaleString("pt-BR")}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-[#f3f0ed]/35">
            {isFree ? t("creditsForTesting") : t("creditsMonthly")}
          </p>
        </div>

        {/* Price with anchor */}
        <div className="mt-4">
          {originalPrice && !isFree && plan.currency === 'BRL' && (
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[13px] text-[#f3f0ed]/25 line-through">
                {formatPriceRaw(originalPrice, plan.currency, locale)}
              </span>
              {discountLabel && (
                <span className="rounded-md bg-landing-accent/15 px-1.5 py-0.5 text-[9px] font-bold text-landing-accent">
                  {discountLabel}
                </span>
              )}
            </div>
          )}
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                "text-[20px] font-bold",
                isFree ? "text-landing-accent" : "text-[#f3f0ed]/80",
              )}
            >
              {main}
            </span>
            {sub && (
              <span className="text-[13px] text-[#f3f0ed]/30">{sub}</span>
            )}
          </div>
        </div>

        {/* Social proof */}
        {socialProof && socialProofText && (
          <p className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-landing-accent/70">
            <socialProof.icon className="h-3.5 w-3.5" />
            {socialProofText}
          </p>
        )}

        {/* Divider */}
        <div className="my-6 h-px w-full bg-[#f3f0ed]/[0.05]" />

        {/* Features */}
        <ul className="flex min-h-[140px] flex-col gap-3">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2.5">
              <div
                className={cn(
                  "mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full",
                  isPopular
                    ? "bg-landing-accent/15"
                    : "bg-[#f3f0ed]/[0.06]",
                )}
              >
                <Check
                  className={cn(
                    "h-2.5 w-2.5",
                    isPopular ? "text-landing-accent" : "text-[#f3f0ed]/50",
                  )}
                />
              </div>
              <span className="text-[13px] leading-snug text-[#f3f0ed]/60">
                {f}
              </span>
            </li>
          ))}
        </ul>

        {/* Generation examples */}
        {generationExamples.length > 0 && (
          <div className="mt-6">
            <div className="rounded-xl bg-[#f3f0ed]/[0.02] p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#f3f0ed]/25">
                {t("generationEstimate")}
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {generationExamples.map((ex) => (
                  <div
                    key={ex.label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-[11px] text-[#f3f0ed]/40">
                      {ex.label}
                    </span>
                    {ex.blocked ? (
                      <span className="flex items-center gap-1 text-[11px] text-red-400/40">
                        <Lock className="h-2.5 w-2.5" />
                        {t("blocked")}
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-[#f3f0ed]/60">
                        {ex.count}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-2.5 text-[9px] text-[#f3f0ed]/15">
                {t("generationFootnote")}
              </p>
            </div>
          </div>
        )}

        {/* Spacer to push CTA to bottom */}
        <div className="flex-1" />

        {/* CTA */}
        {isLoggedIn || isFree ? (
          <a
            href="/workspace"
            className={cn(
              "mt-7 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[13px] font-bold transition-all duration-300",
              isPopular
                ? "bg-landing-accent text-[#141a1c] shadow-[0_0_0_1px_rgba(162,221,0,0.3)] hover:shadow-[0_0_28px_rgba(162,221,0,0.25)] hover:brightness-110"
                : isFree
                  ? "bg-[#f3f0ed]/[0.06] text-[#f3f0ed]/70 hover:bg-[#f3f0ed]/[0.1] hover:text-[#f3f0ed]"
                  : "border border-[#f3f0ed]/[0.08] text-[#f3f0ed]/70 hover:border-[#f3f0ed]/[0.15] hover:bg-[#f3f0ed]/[0.03] hover:text-[#f3f0ed]",
            )}
          >
            {isLoggedIn ? t("accessPlatform") : t("startFree")}
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        ) : (
          <button
            onClick={() => openLoginModal({ plan: plan.slug })}
            className={cn(
              "mt-7 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[13px] font-bold transition-all duration-300",
              isPopular
                ? "bg-landing-accent text-[#141a1c] shadow-[0_0_0_1px_rgba(162,221,0,0.3)] hover:shadow-[0_0_28px_rgba(162,221,0,0.25)] hover:brightness-110"
                : "border border-[#f3f0ed]/[0.08] text-[#f3f0ed]/70 hover:border-[#f3f0ed]/[0.15] hover:bg-[#f3f0ed]/[0.03] hover:text-[#f3f0ed]",
            )}
          >
            {t("subscribe", { plan: plan.name })}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function Pricing() {
  const t = useTranslations("pricing");
  const locale = useLocale();
  const currency = locale === 'en' ? 'USD' : 'BRL';
  const { ref, isVisible } = useScrollReveal();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.plans
      .listPublic(currency)
      .then((data) => {
        const sorted = data
          .filter((p) => p.slug !== 'free')
          .slice()
          .sort(
            (a, b) => PLAN_ORDER.indexOf(a.slug) - PLAN_ORDER.indexOf(b.slug),
          );
        setPlans(sorted);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [currency]);

  const badges = [
    t("badges.noCancelFee"),
    t("badges.securePayment"),
    t("badges.creditsRenew"),
  ];

  return (
    <section id="precos" className="relative py-16 sm:py-28 lg:py-36">
      {/* Subtle background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(162,221,0,0.03) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
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
          <p className="mt-3.5 text-[15px] leading-relaxed text-landing-text-secondary sm:mt-5 sm:text-[17px]">
            {t("subtitle")}
          </p>
        </div>

        {/* Plans grid */}
        {loading ? (
          <div className="mt-16 flex justify-center lg:mt-20">
            <Loader2 className="h-6 w-6 animate-spin text-landing-accent" />
          </div>
        ) : (
          <div className="mt-10 flex flex-col gap-8 sm:mt-16 lg:mt-20 lg:gap-10">
            {/* Entry plans: ultra-basic, starter, basic, creator */}
            {(() => {
              const entrySlugs = ['ultra-basic', 'starter', 'basic', 'creator'];
              const entryPlans = plans.filter((p) => entrySlugs.includes(p.slug));
              if (entryPlans.length === 0) return null;
              return (
                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-[#f3f0ed]/[0.06]" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#f3f0ed]/35">
                      {t("sections.entry")}
                    </span>
                    <div className="h-px flex-1 bg-[#f3f0ed]/[0.06]" />
                  </div>
                  <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                    {entryPlans.map((plan, i) => (
                      <PlanCard key={plan.id} plan={plan} i={i} total={entryPlans.length} />
                    ))}
                  </div>
                </div>
              );
            })()}
            {/* Monetizer plans: pro, advanced, studio */}
            {(() => {
              const monetizerSlugs = ['pro', 'advanced', 'studio'];
              const monetizerPlans = plans.filter((p) => monetizerSlugs.includes(p.slug));
              if (monetizerPlans.length === 0) return null;
              return (
                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-[#f3f0ed]/[0.06]" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#f3f0ed]/35">
                      {t("sections.monetizer")}
                    </span>
                    <div className="h-px flex-1 bg-[#f3f0ed]/[0.06]" />
                  </div>
                  <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                    {monetizerPlans.map((plan, i) => (
                      <PlanCard key={plan.id} plan={plan} i={i} total={monetizerPlans.length} />
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Guarantee */}
        <div className="mx-auto mt-12 max-w-2xl sm:mt-16 lg:mt-20">
          <div className="rounded-[20px] border border-[#f3f0ed]/[0.05] bg-[#171e20] p-5 text-center sm:p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-landing-accent/15 bg-landing-accent/[0.06]">
              <Shield className="h-5 w-5 text-landing-accent" />
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-[#f3f0ed]/50">
              {t("guaranteeText")}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 sm:mt-7 sm:gap-x-6 sm:gap-y-2.5">
              {badges.map((s) => (
                <span
                  key={s}
                  className="flex items-center gap-2 text-[12px] text-[#f3f0ed]/35"
                >
                  <Check className="h-3 w-3 text-landing-accent/60" />
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
