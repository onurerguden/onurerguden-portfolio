import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import { notFound } from "next/navigation";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PageNav } from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import CustomCursor from "@/components/site/custom-cursor";
import { isLocale, locales } from "@/lib/content";
import { siteOrigin } from "@/lib/site";
import "../globals.css";

// Each language is built ahead and served from the CDN; any other first
// segment is a 404 (global-not-found.tsx).
export const dynamicParams = false;
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  // Share cards on every route, including the lab pages, resolve here.
  metadataBase: new URL(siteOrigin()),
  title: {
    default: "Onur Ergüden — AI Engineer",
    template: "%s | Onur Ergüden",
  },
  // The SVG for current browsers, the ICO for the rest and for crawlers that
  // ask for /favicon.ico, and an opaque PNG for iOS home screens.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  description:
    "AI engineering, applied machine learning and research by Onur Ergüden.",
  applicationName: "Onur Ergüden",
  authors: [{ name: "Onur Ergüden", url: siteOrigin() }],
  creator: "Onur Ergüden",
  // Search Console and Bing Webmaster Tools ownership, when configured.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
      : undefined,
  },
  robots: {
    index:
      process.env.SITE_INDEXABLE === "true" &&
      process.env.VERCEL_ENV !== "preview",
    follow:
      process.env.SITE_INDEXABLE === "true" &&
      process.env.VERCEL_ENV !== "preview",
  },
};

/** The root layout: the language is the first segment of every page. */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale}>
      <body>
        <a className="skip-link" href="#main">
          {locale === "en" ? "Skip to content" : "İçeriğe geç"}
        </a>
        <div className="site-shell">
          <PageNav locale={locale} />
          {children}
        </div>
        <SiteFooter locale={locale} />
        <CustomCursor />
        {process.env.VERCEL ? <SpeedInsights /> : null}
      </body>
    </html>
  );
}
