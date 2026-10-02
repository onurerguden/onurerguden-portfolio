import { notFound } from "next/navigation";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PageNav } from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import { isLocale } from "@/lib/content";
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
    <>
      <a className="skip-link" href="#main">
        {locale === "en" ? "Skip to content" : "İçeriğe geç"}
      </a>
      <div className="site-shell">
        <PageNav locale={locale} />
        {children}
      </div>
      <SiteFooter locale={locale} />
      {process.env.VERCEL ? <SpeedInsights /> : null}
    </>
  );
}
