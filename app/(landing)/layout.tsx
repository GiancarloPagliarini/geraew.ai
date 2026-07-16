
import type { Metadata } from "next";
import { Sora, DM_Sans } from "next/font/google";
import { getTranslations } from "next-intl/server";
import Script from "next/script";

const VSL_PLAYER_JS =
  "https://scripts.converteai.net/8961d838-aff2-4dce-9b39-e84022d332ce/players/6a58bb3834189080e2cf9f96/v4/player.js";
const VSL_SMARTPLAYER_JS =
  "https://scripts.converteai.net/lib/js/smartplayer-wc/v4/smartplayer.js";
const VSL_M3U8 =
  "https://cdn.converteai.net/8961d838-aff2-4dce-9b39-e84022d332ce/6a58bb30120d97ef08f7d757/main.m3u8";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landingMeta");
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      type: "website",
      url: "https://geraew.ai",
    },
    twitter: {
      card: "summary_large_image",
    },
  };
}

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${sora.variable} ${dmSans.variable} font-dm bg-landing-bg text-landing-text min-h-screen overflow-x-hidden`}
    >
      {/* VSL — resource hints for faster player load */}
      <Script id="vsl-plt-timing" strategy="beforeInteractive">
        {`!function(i,n){i._plt=i._plt||(n&&n.timeOrigin?n.timeOrigin+n.now():Date.now())}(window,performance);`}
      </Script>
      <link rel="preload" href={VSL_PLAYER_JS} as="script" />
      <link rel="preload" href={VSL_SMARTPLAYER_JS} as="script" />
      <link rel="preload" href={VSL_M3U8} as="fetch" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://cdn.converteai.net" />
      <link rel="dns-prefetch" href="https://scripts.converteai.net" />
      <link rel="dns-prefetch" href="https://images.converteai.net" />
      <link rel="dns-prefetch" href="https://license.vturb.com" />
      {children}
    </div>
  );
}
