import { SinglePostView } from '@/components/community/SinglePostView';

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SinglePostView postId={id} />;
}
