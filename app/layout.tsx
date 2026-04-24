import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Geraew AI",
  description: "Gerador de imagens com inteligência artificial",
  other: {
    google: "notranslate",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth-context";
import { QueryProvider } from "@/lib/query-provider";
import { GoogleAuthWrapper } from "@/lib/google-auth-wrapper";
import { LoginModalProvider } from "@/lib/login-modal-context";
import { LoginModal } from "@/components/LoginModal";
import { Toaster } from "sonner";
import { Suspense } from "react";
import { ReferralCapture } from "@/components/ReferralCapture";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} translate="no" className="notranslate">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
        <QueryProvider>
          <GoogleAuthWrapper>
          <AuthProvider>
            <LoginModalProvider>
            <TooltipProvider delayDuration={0}>
              <Suspense fallback={null}><ReferralCapture /></Suspense>
              {children}
              <LoginModal />
              <Toaster
                theme="dark"
                position="bottom-right"
                toastOptions={{
                  style: {
                    background: '#252220',
                    border: '1px solid rgba(243,240,237,0.1)',
                    color: '#f3f0ed',
                    fontSize: '13px',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    gap: '8px',
                  },
                  actionButtonStyle: {
                    background: '#a2dd00',
                    color: '#1c1917',
                    borderRadius: '8px',
                    fontWeight: 600,
                  },
                }}
                icons={{
                  success: <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(162,221,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a2dd00' }} /></div>,
                  error: <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(248,113,113,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171' }} /></div>,
                  info: <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(162,221,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a2dd00' }} /></div>,
                }}
              />
            </TooltipProvider>
            </LoginModalProvider>
          </AuthProvider>
          </GoogleAuthWrapper>
        </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
