import { NextRequest, NextResponse } from 'next/server';
import { REFERRAL_COOKIE, sanitizeReferralCode } from '@/lib/referral';

// tolera a env com ou sem barra no fim — sem isso o join vira `...hostapi/v1/...`
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
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
        redirect_uri: `${origin}/api/v1/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      console.error('[google-callback] token exchange failed', tokenRes.status, await tokenRes.text());
      return NextResponse.redirect(new URL('/login?error=google_exchange_failed', origin));
    }

    const tokens = await tokenRes.json();
    const idToken = tokens.id_token;

    if (!idToken) {
      return NextResponse.redirect(new URL('/login?error=google_no_token', origin));
    }

    // Read referral code from cookie if present.
    // Só enviamos se for um código válido — um cookie com URL/lixo de campanha
    // faz a API devolver 400 e o usuário fica sem conseguir logar naquele navegador.
    const rawReferral = request.cookies.get(REFERRAL_COOKIE)?.value;
    const referralCode = sanitizeReferralCode(rawReferral);
    const dropInvalidReferral = !!rawReferral && !referralCode;
    if (dropInvalidReferral) {
      console.warn('[google-callback] discarding invalid referral cookie:', rawReferral.slice(0, 80));
    }

    // Send ID token to backend (same endpoint used before)
    const authRes = await fetch(`${BASE_URL}/api/v1/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ googleToken: idToken, ...(referralCode && { referralCode }) }),
    });

    if (!authRes.ok) {
      console.error('[google-callback] backend auth failed', authRes.status, await authRes.text());
      return NextResponse.redirect(new URL('/login?error=auth_failed', origin));
    }

    const authData = await authRes.json();

    // Check if there's a plan redirect cookie from the landing page
    const planRedirect = request.cookies.get('geraew-plan-redirect')?.value;
    const redirectTo = planRedirect ? `/checkout?plan=${planRedirect}` : '/home';

    // Set the same cookies the client-side auth context expects
    const response = NextResponse.redirect(new URL(redirectTo, origin));

    // Clear the plan redirect cookie
    if (planRedirect) {
      response.cookies.set('geraew-plan-redirect', '', { path: '/', maxAge: 0 });
    }

    // Limpa o cookie de referral inválido para não estourar em futuras chamadas
    if (dropInvalidReferral) {
      response.cookies.set(REFERRAL_COOKIE, '', { path: '/', maxAge: 0 });
    }

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
  } catch (err) {
    console.error('[google-callback] unexpected error', err);
    return NextResponse.redirect(new URL('/login?error=google_failed', origin));
  }
}
