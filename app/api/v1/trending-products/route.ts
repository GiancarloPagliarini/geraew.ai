import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Referer': 'https://www.fastmoss.com/',
};

type Tab = 'recommended' | 'new' | 'sales';

const ENDPOINTS: Record<Tab, { path: string; order: string; extra?: Record<string, string> }> = {
  recommended: { path: '/api/goods/popRank',    order: '4,2' },
  new:         { path: '/api/goods/newProduct', order: '1,2', extra: { rank_type: '11' } },
  sales:       { path: '/api/goods/saleRank',   order: '1,2' },
};

export async function GET(request: NextRequest) {
  const tab = (request.nextUrl.searchParams.get('tab') ?? 'recommended') as Tab;
  const config = ENDPOINTS[tab] ?? ENDPOINTS.recommended;

  const now = Math.floor(Date.now() / 1000);
  const cnonce = Math.floor(Math.random() * 90000000) + 10000000;

  const url = new URL(`https://www.fastmoss.com${config.path}`);
  url.searchParams.set('page', '1');
  url.searchParams.set('pagesize', '10');
  url.searchParams.set('order', config.order);
  url.searchParams.set('region', 'BR');
  url.searchParams.set('_time', String(now));
  url.searchParams.set('cnonce', String(cnonce));
  if (config.extra) {
    for (const [k, v] of Object.entries(config.extra)) url.searchParams.set(k, v);
  }

  try {
    const res = await fetch(url.toString(), { headers: HEADERS, cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 502 });
  }
}
