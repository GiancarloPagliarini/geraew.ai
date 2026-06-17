
import type { Metadata } from "next";
import { Sora, DM_Sans } from "next/font/google";
import { getTranslations } from "next-intl/server";
import { TrackingCapture } from "@/components/TrackingCapture";

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
      <TrackingCapture />
      {children}
    </div>
  );
}
