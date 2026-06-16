import type { NextRequest } from 'next/server';

/**
 * Proxy de imagens server-side: busca uma imagem externa (ex.: capa de produto
 * do TikTok Shop) e a devolve same-origin, contornando o CORS para que o
 * cliente consiga convertê-la em base64 e anexá-la como referência.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url || !/^https?:\/\//i.test(url)) {
    return new Response('invalid url', { status: 400 });
  }

  try {
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'image/*' },
    });
    if (!upstream.ok) return new Response('upstream error', { status: 502 });

    const contentType = upstream.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      return new Response('not an image', { status: 415 });
    }

    const buf = await upstream.arrayBuffer();
    return new Response(buf, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new Response('fetch failed', { status: 500 });
  }
}
