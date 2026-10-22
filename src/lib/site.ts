import type { Metadata } from "next";
/** This site's public source; also the evidence for the tools it is built with. */
export const siteRepository =
  "https://github.com/onurerguden/onurerguden-portfolio";
export function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return new URL(configured).origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
/** Only production is indexed; previews and local builds stay out of search. */
export function siteIndexable() {
  return (
    process.env.SITE_INDEXABLE === "true" &&
    process.env.VERCEL_ENV !== "preview"
  );
}

/**
 * Search robots rules for every page. Indexed pages also let engines and AI
 * answers quote any length of text and show large image previews.
 */
export function robotsMetadata(): Metadata["robots"] {
  const indexable = siteIndexable();
  return indexable
    ? {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      }
    : { index: false, follow: false };
}

/**
 * A page's title, description, canonical URL and language alternates. Titles
 * get the name after them (the root layout's template) unless `absolute`,
 * which the home page uses to lead with the name; share cards always carry
 * the full title, since they are read away from the site.
 */
export function pageMetadata(
  locale: "en" | "tr",
  path: string,
  title: string,
  description: string,
  { absolute = false } = {},
): Metadata {
  const base = siteOrigin();
  const full = absolute ? title : `${title} | Onur Ergüden`;
  return {
    title: absolute ? { absolute: title } : title,
    description,
    metadataBase: new URL(base),
    alternates: {
      canonical: `${base}/${locale}${path}`,
      languages: {
        en: `${base}/en${path}`,
        tr: `${base}/tr${path}`,
        "x-default": `${base}/en${path}`,
      },
    },
    openGraph: {
      title: full,
      description,
      url: `${base}/${locale}${path}`,
      locale: locale === "tr" ? "tr_TR" : "en_US",
      alternateLocale: locale === "tr" ? "en_US" : "tr_TR",
      type: "website",
      siteName: "Onur Ergüden",
    },
    twitter: { card: "summary_large_image", title: full, description },
  };
}

/** My CV when a public copy is configured, otherwise a request by email. */
export function cvLink(locale: "en" | "tr", email: string) {
  const cv = process.env.NEXT_PUBLIC_CV_URL;
  const en = locale === "en";
  return cv
    ? { href: cv, label: en ? "Download CV" : "CV’yi indir" }
    : {
        href: `mailto:${email}?subject=CV%20request`,
        label: en ? "Request my CV" : "CV’mi iste",
      };
}
