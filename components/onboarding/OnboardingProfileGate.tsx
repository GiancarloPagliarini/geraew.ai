'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { OnboardingProfileModal } from '@/components/onboarding/OnboardingProfileModal';

/**
 * Exige o cadastro de perfil (nicho + contato) antes de liberar a plataforma.
 *
 * O cookie de sessão já traz `profileCompleted`, então quem respondeu não
 * dispara request nenhum. Para os demais, quem decide é a API — assim contas
 * antigas (criadas antes do formulário existir) também respondem no próximo
 * acesso, e o modal nunca pisca para quem já está em dia.
 */
export function OnboardingProfileGate() {
  const { user, accessToken, refreshToken, updateAuth, loading } = useAuth();
  const alreadyDone = user?.profileCompleted === true;

  const { data: profile } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.users.me(accessToken!),
    enabled: !!accessToken && !!user && !alreadyDone,
    staleTime: 60_000,
  });

  if (loading || !user || alreadyDone) return null;
  if (!profile || profile.profileCompleted) return null;

  function handleCompleted() {
    // mantém o cookie em sincronia para o modal não voltar ao trocar de página
    if (accessToken && refreshToken) {
      updateAuth({ accessToken, refreshToken, user: { ...user!, profileCompleted: true } });
    }
  }

  return <OnboardingProfileModal profile={profile} onCompleted={handleCompleted} />;
}
