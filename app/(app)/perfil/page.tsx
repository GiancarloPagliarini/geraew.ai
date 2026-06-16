import { ProfileView, type ProfileTab } from '@/components/profile/ProfileView';

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab: ProfileTab =
    tab === 'posts' ? 'posts' : tab === 'usage' ? 'usage' : 'account';
  return <ProfileView initialTab={initialTab} />;
}
