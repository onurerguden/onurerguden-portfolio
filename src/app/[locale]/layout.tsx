import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import { notFound } from "next/navigation";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PageNav } from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import CustomCursor from "@/components/site/custom-cursor";
import SiteEvents from "@/components/site/site-events";
import { isLocale, locales } from "@/lib/content";
import { getCertificates } from "@/lib/home-content";
import { homeSectionLinks, menuPageLinks } from "@/lib/home-sections";
import { pageIcons } from "@/lib/icons";
import { robotsMetadata, siteOrigin } from "@/lib/site";
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
  // Versioned, so a new icon replaces the one browsers keep (icons.ts).
  icons: pageIcons(),
  description:
    "AI engineering, applied machine learning and research by Onur Ergüden.",
  applicationName: "Onur Ergüden",
  // rel=author points at my profile page, not a redirect.
  authors: [{ name: "Onur Ergüden", url: `${siteOrigin()}/en` }],
  creator: "Onur Ergüden",
  // Search Console and Bing Webmaster Tools ownership, when configured.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
      : undefined,
  },
  robots: robotsMetadata(),
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
          <PageNav
            locale={locale}
            sections={homeSectionLinks(locale, {
              certificates: getCertificates(locale).length > 0,
            })}
            pages={menuPageLinks(locale)}
          />
          {children}
        </div>
        <SiteFooter locale={locale} />
        <CustomCursor />
        {process.env.VERCEL ? <SpeedInsights /> : null}
        {/* Page views from production only; previews and local builds would
            only add noise. */}
        <SiteEvents pageViews={process.env.VERCEL_ENV === "production"} />
      </body>
    </html>
  );
}
