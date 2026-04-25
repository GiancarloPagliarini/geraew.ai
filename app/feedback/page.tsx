'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Gift,
  Loader2, Star,
  Image as ImageIcon,
  Video,
  Move3d,
  ScanFace,
  BookOpen,
  ShoppingBag,
  Tv,
  Megaphone,
  Building2,
  HelpCircle,
  Send,
  Check,
  Shirt,
  Maximize2,
  TrendingUp,
  Gem,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useLoginModal } from '@/lib/login-modal-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

const GOAL_ICONS = {
  'tiktok-shop': ShoppingBag,
  canal: Tv,
  ads: Megaphone,
  agencia: Building2,
  outro: HelpCircle,
} as const;

const FEATURE_ICONS = {
  imagens: ImageIcon,
  videos: Video,
  movimento: Move3d,
  'face-swap': ScanFace,
  'try-on': Shirt,
  upscale: Maximize2,
  'ranking-tiktok': TrendingUp,
  prompts: BookOpen,
} as const;

const GOAL_IDS = Object.keys(GOAL_ICONS) as Array<keyof typeof GOAL_ICONS>;
const FEATURE_IDS = Object.keys(FEATURE_ICONS) as Array<keyof typeof FEATURE_ICONS>;

const goalIdsTuple = GOAL_IDS as [string, ...string[]];
const featureIdsTuple = FEATURE_IDS as [string, ...string[]];

function npsColor(score: number, selected: boolean): string {
  if (selected) {
    if (score <= 5) return 'bg-red-500/90 text-white border-red-500';
    if (score <= 8) return 'bg-amber-400 text-[#1c1917] border-amber-400';
    return 'bg-[#a2dd00] text-[#1c1917] border-[#a2dd00]';
  }
  return 'border-[#f3f0ed]/15 bg-[#f3f0ed]/[0.03] text-[#f3f0ed]/60 hover:border-[#f3f0ed]/30 hover:text-[#f3f0ed]';
}

const FEEDBACK_REWARD_CREDITS = 2500;

export default function FeedbackPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations('feedback.page');
  const locale = useLocale();
  const { user, accessToken, loading: authLoading } = useAuth();
  const { openLoginModal } = useLoginModal();
  const [submitted, setSubmitted] = useState(false);
  const [creditsAwarded, setCreditsAwarded] = useState(FEEDBACK_REWARD_CREDITS);
  const [hoverRating, setHoverRating] = useState(0);

  const feedbackSchema = z
    .object({
      nps: z.number().min(0).max(10),
      rating: z.number().min(1).max(5),
      goal: z.enum(goalIdsTuple),
      goalOther: z.string().max(300),
      features: z
        .array(z.enum(featureIdsTuple))
        .min(1, t('validation.featuresMin'))
        .max(3, t('validation.featuresMax')),
      highlight: z
        .string()
        .min(10, t('validation.minCharsShort', { min: 10 }))
        .max(500),
      improve: z
        .string()
        .min(10, t('validation.minCharsShort', { min: 10 }))
        .max(1000),
      wishlist: z
        .string()
        .min(10, t('validation.minCharsShort', { min: 10 }))
        .max(500),
    })
    .refine(
      (data) => data.goal !== 'outro' || data.goalOther.trim().length >= 3,
      { path: ['goalOther'], message: t('validation.minGoalOther') },
    );

  type FeedbackForm = z.infer<typeof feedbackSchema>;

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isValid, isSubmitting },
  } = useForm<FeedbackForm>({
    resolver: zodResolver(feedbackSchema),
    mode: 'onChange',
    defaultValues: {
      features: [],
      goalOther: '',
      highlight: '',
      improve: '',
      wishlist: '',
    },
  });

  const features = watch('features') ?? [];
  const highlight = watch('highlight') ?? '';
  const improve = watch('improve') ?? '';
  const wishlist = watch('wishlist') ?? '';
  const goalOther = watch('goalOther') ?? '';
  const rating = watch('rating') ?? 0;
  const goal = watch('goal');

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.users.me(accessToken!),
    enabled: !!accessToken,
  });

  useEffect(() => {
    if (profile?.feedbackSubmitted && !submitted) {
      toast.info(t('alreadySubmittedTitle'), {
        description: t('alreadySubmittedDesc'),
      });
      router.replace('/workspace');
    }
  }, [profile, submitted, router, t]);

  useEffect(() => {
    if (!authLoading && !user) openLoginModal();
  }, [authLoading, user, openLoginModal]);

  useEffect(() => {
    if (!profile) return;
    const sub = profile.subscription as Record<string, unknown> | null;
    const plan = profile.plan as Record<string, unknown> | null;
    const status = (sub?.status as string | undefined)?.toLowerCase();
    const isActivePaid = status === 'active' && (plan?.slug as string | undefined) !== 'free';
    if (!isActivePaid) {
      toast.error(t('accessDeniedTitle'), {
        description: t('accessDeniedDesc'),
      });
      router.replace('/workspace');
    }
  }, [profile, router, t]);

  const toggleFeature = (id: string) => {
    const current = features as string[];
    if (current.includes(id)) {
      setValue('features', current.filter((f) => f !== id) as FeedbackForm['features'], {
        shouldValidate: true,
      });
    } else if (current.length < 3) {
      setValue('features', [...current, id] as FeedbackForm['features'], {
        shouldValidate: true,
      });
    }
  };

  const onSubmit = async (data: FeedbackForm) => {
    if (!accessToken) return;
    try {
      const res = await api.feedback.submit(accessToken, {
        nps: data.nps,
        rating: data.rating,
        goal: data.goal,
        goalOther: data.goal === 'outro' ? data.goalOther : undefined,
        features: data.features,
        highlight: data.highlight,
        improve: data.improve,
        wishlist: data.wishlist,
      });
      setCreditsAwarded(res.creditsAwarded);
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['credits', 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      toast.success(
        t('submitSuccessTitle', { amount: res.creditsAwarded.toLocaleString(locale) }),
        { description: t('submitSuccessDesc') },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : t('submitErrorFallback');
      toast.error(t('submitErrorTitle'), { description: message });
    }
  };

  if (authLoading || profileLoading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a2123]">
        <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
      </div>
    );
  }

  const sub = profile.subscription as Record<string, unknown> | null;
  const plan = profile.plan as Record<string, unknown> | null;
  const status = (sub?.status as string | undefined)?.toLowerCase();
  const isActivePaid = status === 'active' && (plan?.slug as string | undefined) !== 'free';
  if (!isActivePaid) return null;

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a2123] px-4 py-10 text-[#f3f0ed]">
        <div className="w-full max-w-md text-center">
          <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#a2dd00]/15 ring-1 ring-[#a2dd00]/40">
            <div className="absolute inset-0 rounded-3xl bg-[#a2dd00]/20 blur-2xl" />
            <Check className="relative h-10 w-10 text-[#a2dd00]" strokeWidth={3} />
          </div>
          <h1 className="mb-3 text-3xl font-bold">{t('success.title')}</h1>
          <p className="mb-6 text-[15px] leading-relaxed text-[#f3f0ed]/70">
            {t('success.description')}
          </p>

          <div className="mb-8 rounded-2xl border border-[#a2dd00]/30 bg-[#a2dd00]/5 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#a2dd00]/80">
              {t('success.creditsLabel')}
            </div>
            <div className="mt-1 flex items-baseline justify-center gap-1.5">
              <span className="text-4xl font-bold text-[#a2dd00]">
                +{creditsAwarded.toLocaleString(locale)}
              </span>
              <span className="text-sm font-medium text-[#a2dd00]/70">
                {t('success.creditsSuffix')}
              </span>
            </div>
            <p className="mt-2 text-xs text-[#f3f0ed]/50">{t('success.creditsNote')}</p>
          </div>

          <Button
            onClick={() => router.push('/workspace')}
            className="h-11 bg-[#a2dd00] px-6 font-semibold text-[#1c1917] hover:bg-[#b8f000]"
          >
            {t('success.backCta')}
          </Button>
        </div>
      </div>
    );
  }

  const ratingLabel = rating > 0
    ? t(`q2.label${rating}` as 'q2.label1' | 'q2.label2' | 'q2.label3' | 'q2.label4' | 'q2.label5')
    : '';

  const minCharsLabel = (min: number) => t('validation.minChars', { min });

  return (
    <div className="min-h-screen bg-[#1a2123] px-4 py-10 text-[#f3f0ed]">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => router.push('/workspace')}
          className="mb-8 inline-flex items-center gap-2 text-sm text-[#f3f0ed]/60 transition-colors hover:text-[#a2dd00]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('back')}
        </button>

        {/* Hero */}
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-[#a2dd00]/20 bg-gradient-to-br from-[#1f2a1c] via-[#1a2123] to-[#1a2123] p-8 sm:p-10">
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#a2dd00]/15 blur-3xl" />
          <div className="relative z-10">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#a2dd00]/15 ring-1 ring-[#a2dd00]/30">
              <Gift className="h-7 w-7 text-[#a2dd00]" />
            </div>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#a2dd00]/30 bg-[#a2dd00]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#a2dd00]">
              <Gem className="h-3 w-3" />
              {t('badge')}
            </div>
            <h1 className="mb-3 text-3xl font-bold sm:text-4xl">{t('title')}</h1>
            <p className="text-[15px] leading-relaxed text-[#f3f0ed]/70">
              {t('description')}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* NPS */}
          <Section number={1} title={t('q1.title')} required>
            <Controller
              name="nps"
              control={control}
              render={({ field }) => (
                <>
                  <div className="grid grid-cols-11 gap-1.5">
                    {Array.from({ length: 11 }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => field.onChange(i)}
                        className={`flex h-11 items-center justify-center rounded-lg border text-sm font-semibold transition-all ${npsColor(i, field.value === i)}`}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] text-[#f3f0ed]/40">
                    <span>{t('q1.scaleLow')}</span>
                    <span>{t('q1.scaleHigh')}</span>
                  </div>
                </>
              )}
            />
          </Section>

          {/* Star rating */}
          <Section
            number={2}
            title={t('q2.title')}
            subtitle={t('q2.subtitle')}
            required
          >
            <Controller
              name="rating"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = (hoverRating || rating) >= n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => field.onChange(n)}
                        onMouseEnter={() => setHoverRating(n)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="rounded-md p-1 transition-transform hover:scale-110"
                        aria-label={t('q2.aria', { n })}
                      >
                        <Star
                          className={`h-9 w-9 transition-colors ${active ? 'fill-[#a2dd00] text-[#a2dd00]' : 'text-[#f3f0ed]/20'}`}
                        />
                      </button>
                    );
                  })}
                  {rating > 0 && (
                    <span className="ml-3 text-sm text-[#f3f0ed]/60">{ratingLabel}</span>
                  )}
                </div>
              )}
            />
          </Section>

          {/* Goal */}
          <Section
            number={3}
            title={t('q3.title')}
            subtitle={t('q3.subtitle')}
            required
          >
            <Controller
              name="goal"
              control={control}
              render={({ field }) => (
                <div className="grid gap-2 sm:grid-cols-2">
                  {GOAL_IDS.map((id) => {
                    const Icon = GOAL_ICONS[id];
                    const selected = field.value === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => field.onChange(id)}
                        className={`flex items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition-all ${selected
                          ? 'border-[#a2dd00] bg-[#a2dd00]/10 text-[#f3f0ed]'
                          : 'border-[#f3f0ed]/10 bg-[#f3f0ed]/[0.03] text-[#f3f0ed]/70 hover:border-[#f3f0ed]/25 hover:text-[#f3f0ed]'
                          }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${selected ? 'bg-[#a2dd00]/20 text-[#a2dd00]' : 'bg-[#f3f0ed]/[0.06] text-[#f3f0ed]/60'
                            }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{t(`goals.${id}` as `goals.${typeof id}`)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            />
            {goal === 'outro' && (
              <div className="mt-4">
                <label className="mb-2 block text-xs font-medium text-[#f3f0ed]/70">
                  {t('q3.otherLabel')} <span className="text-[#a2dd00]">*</span>
                </label>
                <Controller
                  name="goalOther"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Textarea
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder={t('q3.otherPlaceholder')}
                      maxLength={300}
                      minLength={3}
                      currentLength={goalOther.length}
                      error={fieldState.error?.message}
                      minCharsLabel={minCharsLabel(3)}
                    />
                  )}
                />
              </div>
            )}
          </Section>

          {/* Features (multi) */}
          <Section
            number={4}
            title={t('q4.title')}
            subtitle={t('q4.subtitle', { count: features.length })}
            required
          >
            <div className="flex flex-wrap gap-2">
              {FEATURE_IDS.map((id) => {
                const Icon = FEATURE_ICONS[id];
                const selected = (features as string[]).includes(id);
                const disabled = !selected && features.length >= 3;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleFeature(id)}
                    disabled={disabled}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${selected
                      ? 'border-[#a2dd00] bg-[#a2dd00]/15 text-[#a2dd00]'
                      : disabled
                        ? 'cursor-not-allowed border-[#f3f0ed]/5 bg-[#f3f0ed]/[0.02] text-[#f3f0ed]/30'
                        : 'border-[#f3f0ed]/15 bg-[#f3f0ed]/[0.03] text-[#f3f0ed]/70 hover:border-[#f3f0ed]/35 hover:text-[#f3f0ed]'
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t(`features.${id}` as `features.${typeof id}`)}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Highlight */}
          <Section number={5} title={t('q5.title')} required>
            <Controller
              name="highlight"
              control={control}
              render={({ field, fieldState }) => (
                <Textarea
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder={t('q5.placeholder')}
                  maxLength={500}
                  minLength={10}
                  currentLength={highlight.length}
                  error={fieldState.error?.message}
                  minCharsLabel={minCharsLabel(10)}
                />
              )}
            />
          </Section>

          {/* Improve */}
          <Section
            number={6}
            title={t('q6.title')}
            subtitle={t('q6.subtitle')}
            required
          >
            <Controller
              name="improve"
              control={control}
              render={({ field, fieldState }) => (
                <Textarea
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder={t('q6.placeholder')}
                  maxLength={1000}
                  minLength={10}
                  currentLength={improve.length}
                  error={fieldState.error?.message}
                  minCharsLabel={minCharsLabel(10)}
                />
              )}
            />
          </Section>

          {/* Wishlist */}
          <Section
            number={7}
            title={t('q7.title')}
            subtitle={t('q7.subtitle')}
            required
          >
            <Controller
              name="wishlist"
              control={control}
              render={({ field, fieldState }) => (
                <Textarea
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder={t('q7.placeholder')}
                  maxLength={500}
                  minLength={10}
                  currentLength={wishlist.length}
                  error={fieldState.error?.message}
                  minCharsLabel={minCharsLabel(10)}
                />
              )}
            />
          </Section>

          {/* Submit */}
          <div className="sticky bottom-4 z-10 mt-8 rounded-2xl border border-[#a2dd00]/20 bg-[#1a2123]/95 p-4 backdrop-blur sm:p-5">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <p className="text-center text-xs text-[#f3f0ed]/60 sm:text-left">
                {isValid ? t('submitReady') : t('submitPending')}
              </p>
              <Button
                type="submit"
                disabled={!isValid || isSubmitting}
                className="group h-11 w-full bg-[#a2dd00] px-6 font-semibold text-[#1c1917] shadow-[0_0_24px_rgba(162,221,0,0.35)] hover:bg-[#b8f000] hover:shadow-[0_0_32px_rgba(162,221,0,0.5)] disabled:cursor-not-allowed disabled:bg-[#f3f0ed]/10 disabled:text-[#f3f0ed]/30 disabled:shadow-none sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('submitting')}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {t('submit')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({
  number,
  title,
  subtitle,
  required,
  children,
}: {
  number: number;
  title: string;
  subtitle?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#f3f0ed]/10 bg-[#f3f0ed]/[0.02] p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#a2dd00]/15 text-[12px] font-bold text-[#a2dd00] ring-1 ring-[#a2dd00]/30">
          {number}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-[#f3f0ed] sm:text-base">
            {title}
            {required && <span className="ml-1 text-[#a2dd00]">*</span>}
          </h2>
          {subtitle && <p className="mt-0.5 text-xs text-[#f3f0ed]/50">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  maxLength,
  minLength,
  currentLength,
  error,
  minCharsLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  maxLength: number;
  minLength?: number;
  currentLength: number;
  error?: string;
  minCharsLabel?: string;
}) {
  const belowMin =
    minLength !== undefined && currentLength > 0 && currentLength < minLength;
  const hint = error || (belowMin ? minCharsLabel : '');
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={4}
        className="w-full resize-none rounded-xl border border-[#f3f0ed]/10 bg-[#1a2123] p-3.5 text-sm text-[#f3f0ed] placeholder:text-[#f3f0ed]/30 focus:border-[#a2dd00]/50 focus:outline-none focus:ring-2 focus:ring-[#a2dd00]/20"
      />
      <div className="mt-1.5 flex justify-between text-[11px]">
        <span className="text-amber-400/80">{hint}</span>
        <span className="text-[#f3f0ed]/30">
          {currentLength}/{maxLength}
        </span>
      </div>
    </div>
  );
}
