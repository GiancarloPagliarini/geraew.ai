'use client';

import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useLoadingMessage } from '@/lib/loading-messages';
import { ArrowLeft, Mail, Calendar, Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Image from 'next/image';

export default function PerfilPage() {
  const router = useRouter();
  const { user, accessToken, loading: authLoading } = useAuth();
  const loadingMsg = useLoadingMessage('perfil');

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.users.me(accessToken!),
    enabled: !!accessToken,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#1a2123]">
        <Loader2 className="h-6 w-6 animate-spin text-[#a2dd00]" />
        {loadingMsg && <p className="text-sm text-[#f3f0ed]/40">{loadingMsg}</p>}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a2123] px-4">
        <div className="w-full max-w-md text-center">
          <p className="rounded-lg border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-400">
            {error instanceof Error ? error.message : 'Erro ao carregar perfil'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 text-sm text-[#a2dd00]/70 hover:text-[#a2dd00]"
          >
            Voltar ao editor
          </button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const createdAt = new Date(profile.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex min-h-screen flex-col bg-[#1a2123]">
      {/* Header */}
      <header className="flex h-12 shrink-0 items-center border-b border-[#f3f0ed]/[0.07] px-4">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-sm text-[#f3f0ed]/60 transition-colors hover:text-[#f3f0ed]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao editor
        </button>
      </header>

      {/* Content */}
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-10">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center gap-3">
          {profile.avatarUrl ? (
            <Image
              src={typeof profile.avatarUrl === 'string' ? profile.avatarUrl : ''}
              alt={profile.name}
              width={80}
              height={80}
              className="rounded-full border-2 border-[#a2dd00]/30"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#a2dd00]/20 text-2xl font-bold text-[#a2dd00]">
              {profile.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="text-center">
            <h1 className="text-lg font-bold text-[#f3f0ed]">{profile.name}</h1>
            <p className="text-xs text-[#f3f0ed]/40">{profile.role}</p>
          </div>
        </div>

        {/* Info cards */}
        <div className="flex flex-col gap-3">
          <InfoCard icon={Mail} label="Email" value={profile.email} />
          <InfoCard
            icon={profile.emailVerified ? CheckCircle : XCircle}
            label="Email verificado"
            value={profile.emailVerified ? 'Sim' : 'Não'}
            valueColor={profile.emailVerified ? 'text-green-400' : 'text-red-400'}
          />
          <InfoCard icon={Shield} label="Função" value={profile.role} />
          <InfoCard icon={Calendar} label="Membro desde" value={createdAt} />
        </div>

        {/* Plan / Credits / Subscription */}
        {profile.plan && Object.keys(profile.plan).length > 0 && (
          <Section title="Plano">
            <pre className="text-xs text-[#f3f0ed]/60">
              {JSON.stringify(profile.plan, null, 2)}
            </pre>
          </Section>
        )}

        {profile.credits && Object.keys(profile.credits).length > 0 && (
          <Section title="Créditos">
            <pre className="text-xs text-[#f3f0ed]/60">
              {JSON.stringify(profile.credits, null, 2)}
            </pre>
          </Section>
        )}

        {profile.subscription && Object.keys(profile.subscription).length > 0 && (
          <Section title="Assinatura">
            <pre className="text-xs text-[#f3f0ed]/60">
              {JSON.stringify(profile.subscription, null, 2)}
            </pre>
          </Section>
        )}
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  valueColor,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#f3f0ed]/[0.08] bg-[#f3f0ed]/[0.03] px-4 py-3">
      <Icon className="h-4 w-4 shrink-0 text-[#a2dd00]/60" />
      <div className="flex flex-1 items-center justify-between">
        <span className="text-xs text-[#f3f0ed]/50">{label}</span>
        <span className={`text-xs font-medium ${valueColor || 'text-[#f3f0ed]'}`}>{value}</span>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#f3f0ed]/[0.08] bg-[#f3f0ed]/[0.03] p-4">
      <h2 className="mb-3 text-xs font-bold tracking-[0.15em] text-[#f3f0ed]/50">{title.toUpperCase()}</h2>
      {children}
    </div>
  );
}
