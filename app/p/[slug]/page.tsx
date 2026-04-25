import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronLeft, MoreHorizontal, BadgeCheck } from 'lucide-react';
import { PostInteractive } from './PostInteractive';

interface PromptPostSlide {
  id: string;
  order: number;
  prompt: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  aspectRatio: string | null;
  generationType: string;
  aiModel: string | null;
  copyCount: number;
  useCount: number;
}

interface PromptPost {
  id: string;
  slug: string;
  caption: string | null;
  isPublished: boolean;
  viewCount: number;
  copyCount: number;
  useCount: number;
  createdAt: string;
  slides: PromptPostSlide[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

async function getPost(slug: string): Promise<PromptPost | null> {
  const res = await fetch(`${API_URL}/api/v1/prompt-posts/${slug}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: 'Post não encontrado · GeraEW' };

  const firstSlide = post.slides[0];
  const title = post.caption || 'Prompt — GeraEW';
  const description = firstSlide?.prompt.slice(0, 160) ?? '';
  const image = firstSlide?.imageUrl;

  return {
    title: `${title} · GeraEW`,
    description,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image }] : undefined,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

function formatPostDate(date: string) {
  const d = new Date(date);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const day = d.getDate();
  const month = d.toLocaleDateString('pt-BR', { month: 'long' });
  return sameYear ? `${day} de ${month}` : `${day} de ${month} de ${d.getFullYear()}`;
}

function formatCount(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace('.', ',')} mi`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.', ',')} mil`;
  return String(n);
}

export default async function PromptPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post || !post.slides.length) notFound();

  return (
    <main className="min-h-screen bg-black flex justify-center">
      <article className="w-full max-w-[470px] flex flex-col bg-black text-white">
        {/* Top bar */}
        <div className="flex items-center justify-between h-12 px-3 border-b border-white/10">
          <Link
            href="/"
            aria-label="Voltar"
            className="flex h-8 w-8 items-center justify-center -ml-1 text-white"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2.25} />
          </Link>
          <h1 className="text-base font-semibold tracking-tight">Post</h1>
          <span className="w-8" aria-hidden />
        </div>

        {/* Profile row */}
        <header className="flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="block w-8 h-8 rounded-full bg-[#BFFF00] p-[2px]"
              aria-label="geraew"
            >
              <span className="flex w-full h-full rounded-full bg-black items-center justify-center overflow-hidden">
                <Image
                  src="/logo_2.svg"
                  alt="GeraEW"
                  width={20}
                  height={20}
                  className="object-contain mix-blend-lighten"
                />
              </span>
            </Link>
            <div className="flex items-center gap-1 leading-tight">
              <Link
                href="/"
                className="text-sm font-semibold text-white hover:opacity-80"
              >
                geraew.ai
              </Link>
              <BadgeCheck
                className="h-[14px] w-[14px] text-[#1da1f2] fill-[#1da1f2] [&>path:last-child]:stroke-black"
                strokeWidth={2.5}
                aria-label="Verificado"
              />
            </div>
          </div>
          <button
            type="button"
            aria-label="Mais opções"
            className="flex h-8 w-8 items-center justify-center text-white"
          >
            <MoreHorizontal className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </header>

        {/* Carrossel + ações + caption (interativo) */}
        <PostInteractive
          slug={post.slug}
          caption={post.caption}
          viewCount={post.viewCount}
          createdAt={post.createdAt}
          slides={post.slides}
          formattedDate={formatPostDate(post.createdAt)}
          formattedViews={formatCount(post.viewCount)}
        />

        {/* Faixa final — promo discreta */}
        <div className="mt-auto border-t border-white/10 px-3 py-3 text-center">
          <p className="text-[11px] text-white/40">Crie imagens assim em</p>
          <Link
            href="/"
            className="text-sm font-semibold text-[#BFFF00] hover:underline"
          >
            geraew.ai
          </Link>
        </div>
      </article>
    </main>
  );
}
