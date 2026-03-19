'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

export function GoogleAuthWrapper({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID!}>
      {children}
    </GoogleOAuthProvider>
  );
}
