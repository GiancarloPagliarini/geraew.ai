import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');
  const origin = request.nextUrl.origin;

  if (error || !code) {
    return NextResponse.redirect(new URL('/login?error=google_denied', origin));
  }

  try {
    // Exchange authorization code for tokens with Google
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${origin}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(new URL('/login?error=google_exchange_failed', origin));
    }

    const tokens = await tokenRes.json();
    const idToken = tokens.id_token;

    if (!idToken) {
      return NextResponse.redirect(new URL('/login?error=google_no_token', origin));
    }

    // Send ID token to backend (same endpoint used before)
    const authRes = await fetch(`${BASE_URL}api/v1/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ googleToken: idToken }),
    });

    if (!authRes.ok) {
      return NextResponse.redirect(new URL('/login?error=auth_failed', origin));
    }

    const authData = await authRes.json();

    // Set the same cookies the client-side auth context expects
    const response = NextResponse.redirect(new URL('/', origin));

    response.cookies.set('geraew-access-token', authData.accessToken, {
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
    });
    response.cookies.set('geraew-refresh-token', authData.refreshToken, {
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
    });
    response.cookies.set('geraew-user', JSON.stringify(authData.user), {
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      sameSite: 'lax',
    });

    return response;
  } catch {
    return NextResponse.redirect(new URL('/login?error=google_failed', origin));
  }
}
