import { PublicProfileView } from '@/components/profile/PublicProfileView';

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PublicProfileView userId={id} />;
}
