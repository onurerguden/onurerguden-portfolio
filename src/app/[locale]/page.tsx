import HomeIntroduction from "@/components/home-introduction";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/content";
import { pageMetadata } from "@/lib/site";
import DeskJourney from "@/components/desk/journey";
import { getJourneyContent } from "@/lib/desk-journey-content";
import HomeContinuation from "@/components/home-continuation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return pageMetadata(
    locale,
    "",
    "AI engineering & research",
    locale === "en"
      ? "Onur Ergüden builds AI products, retrieval systems and applied machine learning research."
      : "Onur Ergüden: AI ürünleri, bilgi erişim sistemleri ve uygulamalı makine öğrenmesi araştırmaları.",
  );
}
export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <main id="main" tabIndex={-1}>
      <DeskJourney
        locale={locale}
        content={getJourneyContent(locale)}
        introduction={<HomeIntroduction locale={locale} />}
      />
      <HomeContinuation locale={locale} />
    </main>
  );
}
