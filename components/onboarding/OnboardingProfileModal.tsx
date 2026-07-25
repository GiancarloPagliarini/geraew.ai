'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Camera,
  Check,
  IdCard,
  Instagram,
  Loader2,
  MoreHorizontal,
  PenLine,
  Phone,
  ShoppingBag,
  Store,
  TrendingUp,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, type UserProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  DIAL_CODES,
  NICHES,
  OTHER_MAX_LENGTH,
  OTHER_OPTION,
  PROFILE_TYPES,
  SALES_CHANNELS,
  defaultDialCode,
  formatPhone,
  isValidPhone,
  maxLocalDigits,
  normalizeFreeText,
  normalizeInstagramHandle,
  onlyDigits,
  toE164,
  type Niche,
  type ProfileType,
  type SalesChannel,
} from '@/lib/onboarding-profile';

const PROFILE_ICONS: Record<ProfileType, LucideIcon> = {
  SELLER: ShoppingBag,
  AFFILIATE: TrendingUp,
  PHOTOGRAPHER: Camera,
  SOCIAL_MEDIA: Video,
  BRAND_AGENCY: Store,
  AI_SERVICES: Bot,
  OTHER: MoreHorizontal,
};

/** Chip de escolha única/múltipla usado nos dois passos. */
function Chip({
  active,
  onClick,
  children,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-2 rounded-[11px] border px-3.5 py-2.5 text-left text-[13.5px] font-medium transition-colors duration-200 ease-app',
        active
          ? 'border-app-lime bg-app-lime/[0.12] text-app-text'
          : 'border-app-hairline bg-app-surface text-app-text-2 hover:border-app-hairline-2 hover:text-app-text',
      )}
    >
      {Icon && (
        <Icon
          className={cn('size-[17px] shrink-0', active ? 'text-app-lime' : 'text-app-muted')}
          strokeWidth={1.8}
        />
      )}
      <span className="min-w-0 flex-1">{children}</span>
      {active && <Check className="size-4 shrink-0 text-app-lime" strokeWidth={2.4} />}
    </button>
  );
}

/** Caixa de texto que aparece quando o usuário escolhe "Outro". */
function OtherInput({
  value,
  onChange,
  placeholder,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onSubmit?: () => void;
}) {
  return (
    <div className="relative mt-2">
      <PenLine
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-app-muted"
        strokeWidth={1.8}
      />
      <input
        type="text"
        autoFocus
        maxLength={OTHER_MAX_LENGTH}
        value={value}
        onChange={(e) => onChange(normalizeFreeText(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit?.();
        }}
        placeholder={placeholder}
        className="h-11 w-full rounded-[11px] border border-app-lime/30 bg-app-surface pl-9 pr-3 text-[14px] text-app-text placeholder:text-app-muted/60 outline-none transition-colors duration-200 ease-app focus:border-app-lime/60"
      />
    </div>
  );
}

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: string }) {
  return (
    <div className="mb-2 flex items-baseline gap-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-app-muted">
        {children}
      </span>
      {optional && <span className="text-[11px] text-app-muted/70">{optional}</span>}
    </div>
  );
}

/**
 * Formulário curto de cadastro de perfil, exibido uma vez no primeiro acesso.
 * Dois passos: quem o usuário é → nicho, canais e contato. Não é dispensável
 * (sem X, sem fechar no overlay/ESC) — o gate só sai quando a API confirma.
 */
export function OnboardingProfileModal({
  profile,
  onCompleted,
}: {
  profile?: UserProfile;
  onCompleted: () => void;
}) {
  const t = useTranslations('onboarding');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [profileType, setProfileType] = useState<ProfileType | null>(
    (profile?.profileType as ProfileType | null) ?? null,
  );
  const [profileTypeOther, setProfileTypeOther] = useState(profile?.profileTypeOther ?? '');
  const [niche, setNiche] = useState<Niche | null>((profile?.niche as Niche | null) ?? null);
  const [nicheOther, setNicheOther] = useState(profile?.nicheOther ?? '');
  const [channels, setChannels] = useState<SalesChannel[]>(
    (profile?.salesChannels as SalesChannel[]) ?? [],
  );
  const [dial, setDial] = useState(() => defaultDialCode(locale).dial);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [instagram, setInstagram] = useState(profile?.instagramHandle ?? '');
  const [error, setError] = useState('');

  const phoneValid = isValidPhone(phoneDigits, dial);
  // "Outro" só vale com a descrição preenchida — a API rejeita sem ela
  const profileTypeDone =
    !!profileType && (profileType !== OTHER_OPTION || profileTypeOther.trim().length >= 2);
  const nicheDone = !!niche && (niche !== OTHER_OPTION || nicheOther.trim().length >= 2);
  const canSubmit = profileTypeDone && nicheDone && phoneValid;

  const dialOptions = useMemo(
    () => DIAL_CODES.map((c) => ({ ...c, label: `${c.country} +${c.dial}` })),
    [],
  );

  const mutation = useMutation({
    mutationFn: () =>
      api.users.completeOnboardingProfile(accessToken!, {
        profileType: profileType!,
        niche: niche!,
        ...(profileType === OTHER_OPTION && { profileTypeOther: profileTypeOther.trim() }),
        ...(niche === OTHER_OPTION && { nicheOther: nicheOther.trim() }),
        salesChannels: channels,
        phone: toE164(phoneDigits, dial),
        ...(instagram.trim() && { instagramHandle: normalizeInstagramHandle(instagram) }),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['user', 'me'], updated);
      onCompleted();
    },
    onError: (err: unknown) => {
      setError((err as { message?: string })?.message || t('errors.generic'));
    },
  });

  function toggleChannel(channel: SalesChannel) {
    setChannels((prev) => {
      // "ainda não vendo" é exclusivo — não combina com canal nenhum
      if (channel === 'NOT_SELLING_YET') return prev.includes(channel) ? [] : ['NOT_SELLING_YET'];
      const withoutNone = prev.filter((c) => c !== 'NOT_SELLING_YET');
      return withoutNone.includes(channel)
        ? withoutNone.filter((c) => c !== channel)
        : [...withoutNone, channel];
    });
  }

  function submit() {
    if (!canSubmit || mutation.isPending) return;
    setError('');
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[rgba(8,10,11,0.82)] p-4 backdrop-blur-[6px] animate-overlay-in scrollbar-app sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-profile-title"
        className="my-auto w-[min(560px,100%)] overflow-hidden rounded-[18px] border border-app-hairline-2 bg-app-card shadow-[0_30px_80px_rgba(0,0,0,0.6)] animate-dialog-in"
      >
        {/* cabeçalho */}
        <div className="border-b border-app-hairline px-6 pb-5 pt-6">
          <div className="mb-4 flex items-center gap-2">
            {[1, 2].map((n) => (
              <span
                key={n}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors duration-300 ease-app',
                  n <= step ? 'bg-app-lime' : 'bg-app-hairline-2',
                )}
              />
            ))}
            <span className="ml-1 text-[11px] font-semibold tabular-nums text-app-muted">
              {step}/2
            </span>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-app-lime/12 ring-1 ring-app-lime/20">
              <IdCard className="size-[18px] text-app-lime" strokeWidth={1.9} />
            </span>
            <div className="min-w-0">
              <h2 id="onboarding-profile-title" className="text-[18px] font-bold text-app-text">
                {step === 1 ? t('step1.title') : t('step2.title')}
              </h2>
              <p className="mt-0.5 text-[13.5px] leading-snug text-app-text-2">
                {step === 1 ? t('step1.subtitle') : t('step2.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* corpo */}
        <div className="max-h-[min(60vh,540px)] overflow-y-auto px-6 py-5 scrollbar-app">
          {step === 1 ? (
            <>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {PROFILE_TYPES.map((id) => (
                  <Chip
                    key={id}
                    icon={PROFILE_ICONS[id]}
                    active={profileType === id}
                    onClick={() => {
                      setProfileType(id);
                      // em "Outro" o usuário ainda precisa descrever — não avança
                      if (id !== OTHER_OPTION) setStep(2);
                    }}
                  >
                    {t(`options.profileType.${id}`)}
                  </Chip>
                ))}
              </div>
              {profileType === OTHER_OPTION && (
                <OtherInput
                  value={profileTypeOther}
                  onChange={setProfileTypeOther}
                  placeholder={t('step1.otherPlaceholder')}
                  onSubmit={() => {
                    if (profileTypeDone) setStep(2);
                  }}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col gap-5">
              {/* nicho */}
              <div>
                <FieldLabel>{t('step2.nicheLabel')}</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {NICHES.map((id) => (
                    <Chip key={id} active={niche === id} onClick={() => setNiche(id)}>
                      {t(`options.niche.${id}`)}
                    </Chip>
                  ))}
                </div>
                {niche === OTHER_OPTION && (
                  <OtherInput
                    value={nicheOther}
                    onChange={setNicheOther}
                    placeholder={t('step2.nicheOtherPlaceholder')}
                    onSubmit={submit}
                  />
                )}
              </div>

              {/* canais */}
              <div>
                <FieldLabel optional={t('optional')}>{t('step2.channelsLabel')}</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {SALES_CHANNELS.map((id) => (
                    <Chip
                      key={id}
                      active={channels.includes(id)}
                      onClick={() => toggleChannel(id)}
                    >
                      {t(`options.salesChannel.${id}`)}
                    </Chip>
                  ))}
                </div>
              </div>

              {/* whatsapp */}
              <div>
                <FieldLabel>{t('step2.phoneLabel')}</FieldLabel>
                <div className="flex gap-2">
                  <select
                    value={dial}
                    onChange={(e) => {
                      const next = e.target.value;
                      setDial(next);
                      // o limite de dígitos muda com o DDI
                      setPhoneDigits((d) => d.slice(0, maxLocalDigits(next)));
                    }}
                    aria-label={t('step2.dialLabel')}
                    className="h-11 shrink-0 rounded-[11px] border border-app-hairline bg-app-surface px-2.5 text-[13.5px] text-app-text outline-none transition-colors duration-200 ease-app focus:border-app-lime/40"
                  >
                    {dialOptions.map((c) => (
                      <option key={c.country} value={c.dial} className="bg-app-surface">
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <div className="relative min-w-0 flex-1">
                    <Phone
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-app-muted"
                      strokeWidth={1.8}
                    />
                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      value={formatPhone(phoneDigits, dial)}
                      onChange={(e) =>
                        setPhoneDigits(onlyDigits(e.target.value).slice(0, maxLocalDigits(dial)))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submit();
                      }}
                      placeholder={dial === '55' ? '(11) 91234-5678' : t('step2.phonePlaceholder')}
                      className="h-11 w-full rounded-[11px] border border-app-hairline bg-app-surface pl-9 pr-3 text-[14px] text-app-text placeholder:text-app-muted/60 outline-none transition-colors duration-200 ease-app focus:border-app-lime/40"
                    />
                  </div>
                </div>
                <p className="mt-1.5 text-[11.5px] text-app-muted">{t('step2.phoneHelper')}</p>
              </div>

              {/* instagram */}
              <div>
                <FieldLabel optional={t('optional')}>{t('step2.instagramLabel')}</FieldLabel>
                <div className="relative">
                  <Instagram
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-app-muted"
                    strokeWidth={1.8}
                  />
                  <input
                    type="text"
                    autoComplete="off"
                    value={instagram}
                    onChange={(e) => setInstagram(normalizeInstagramHandle(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submit();
                    }}
                    placeholder={t('step2.instagramPlaceholder')}
                    className="h-11 w-full rounded-[11px] border border-app-hairline bg-app-surface pl-9 pr-3 text-[14px] text-app-text placeholder:text-app-muted/60 outline-none transition-colors duration-200 ease-app focus:border-app-lime/40"
                  />
                </div>
              </div>

              {error && (
                <p className="rounded-[11px] border border-red-400/20 bg-red-400/10 px-3 py-2 text-[12.5px] text-red-400">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* rodapé */}
        <div className="flex items-center justify-between gap-3 border-t border-app-hairline px-6 py-4">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 text-[12.5px] text-app-text-2 transition-colors duration-200 ease-app hover:text-app-text"
            >
              <ArrowLeft className="size-3.5" strokeWidth={1.9} />
              {t('actions.back')}
            </button>
          ) : (
            <span className="text-[12px] text-app-muted">{t('timeHint')}</span>
          )}

          {step === 1 ? (
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!profileTypeDone}
              className="flex h-10 items-center gap-2 rounded-[10px] bg-app-lime px-4 text-[13.5px] font-bold text-app-lime-ink transition-colors duration-200 ease-app hover:bg-app-lime-hover disabled:opacity-40"
            >
              {t('actions.next')}
              <ArrowRight className="size-4" strokeWidth={2.2} />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit || mutation.isPending}
              className="flex h-10 items-center gap-2 rounded-[10px] bg-app-lime px-4 text-[13.5px] font-bold text-app-lime-ink transition-colors duration-200 ease-app hover:bg-app-lime-hover disabled:opacity-40"
            >
              {mutation.isPending && <Loader2 className="size-4 animate-spin" strokeWidth={2.2} />}
              {t('actions.finish')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
