import type { NextRequest } from 'next/server';

/**
 * Proxy de download same-origin: busca uma mídia externa (imagem/vídeo/áudio do
 * S3/CDN) e a devolve com Content-Disposition: attachment, forçando o navegador
 * a baixar o arquivo — o atributo `download` de um <a> é ignorado em URLs
 * cross-origin, então passamos por aqui.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const filename = req.nextUrl.searchParams.get('filename') || 'geraew-ai';
  if (!url || !/^https?:\/\//i.test(url)) {
    return new Response('invalid url', { status: 400 });
  }

  try {
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!upstream.ok || !upstream.body) {
      return new Response('upstream error', { status: 502 });
    }

    // sanitiza o filename para o header (sem aspas/quebras)
    const safeName = filename.replace(/["\r\n]/g, '').slice(0, 120);
    return new Response(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${safeName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return new Response('fetch failed', { status: 500 });
  }
}
