import { notFound } from "next/navigation";
import { isLocale } from "@/lib/content";
import { getJourneyContent } from "@/lib/desk-journey-content";
import DeskJourney from "@/components/desk/journey";
import HomeIntroduction from "@/components/home-introduction";
import HomeContinuation from "@/components/home-continuation";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return {
    title:
      locale === "tr" ? "Masamdan çalışmalarıma" : "From my desk to my work",
    robots: { index: false, follow: false },
  };
}
export default async function JourneyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale) || process.env.VERCEL_ENV === "production") notFound();
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
