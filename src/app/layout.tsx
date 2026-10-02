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
  icons: { icon: "/icon.svg" },
  description:
    "AI engineering, applied machine learning and research by Onur Ergüden.",
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
