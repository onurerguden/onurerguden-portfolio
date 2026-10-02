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
export function pageMetadata(
  locale: "en" | "tr",
  path: string,
  title: string,
  description: string,
): Metadata {
  const base = siteOrigin();
  return {
    title,
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
      title,
      description,
      url: `${base}/${locale}${path}`,
      locale: locale === "tr" ? "tr_TR" : "en_US",
      alternateLocale: locale === "tr" ? "en_US" : "tr_TR",
      type: "website",
      siteName: "Onur Ergüden",
    },
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
