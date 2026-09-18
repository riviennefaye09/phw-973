import type { Metadata, Viewport } from "next";
import { isRtl } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Phoenix of War 973 — PHW",
  description:
    "Phoenix of War 973 (PHW) — alliance family hub: who we are, how we play, and the guides that keep us sharp.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    siteName: "Phoenix of War 973",
    locale: "en_US",
    url: "https://phw-973.vercel.app/",
    title: "Phoenix of War 973 — PHW",
    description: "An alliance family in Call of Dragons. From ashes, to flame — we rise and we take what we want.",
    images: [
      {
        url: "https://phw-973.vercel.app/img/og-image.jpg",
        type: "image/jpeg",
        width: 1200,
        height: 630,
        alt: "Phoenix of War 973 — from ashes, to flame.",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#120c08",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={isRtl(locale) ? "rtl" : "ltr"}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Inter:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}