import { notFound } from "next/navigation";
import { isLocale } from "@/lib/content";
import { getJourneyContent } from "@/lib/desk-story/content";
import ServiceRows from "@/components/sections/service-rows";
import ExperienceRail from "@/components/sections/experience-rail";
import XpDesktop from "@/components/xp/xp-desktop";
import DeskJourney from "@/components/desk/journey";
import HomeContinuation from "@/components/home-continuation";
import { homeSectionLinks } from "@/lib/home-sections";
import { getCertificates } from "@/lib/home-content";
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
    <main id="main" tabIndex={-1} data-home>
      <DeskJourney
        locale={locale}
        content={getJourneyContent(locale)}
        screens={{
          services: <ServiceRows locale={locale} />,
          experience: <ExperienceRail locale={locale} />,
          stack: <XpDesktop locale={locale} />,
        }}
        sections={homeSectionLinks(locale, {
          certificates: getCertificates(locale).length > 0,
        })}
      />
      <HomeContinuation locale={locale} />
    </main>
  );
}
