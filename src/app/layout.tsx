import type { Metadata } from "next";
import { headers } from "next/headers";
import "@fontsource-variable/manrope";
import { siteOrigin } from "@/lib/site";
import "./globals.css";

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
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale =
    (await headers()).get("x-portfolio-locale") === "tr" ? "tr" : "en";
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
