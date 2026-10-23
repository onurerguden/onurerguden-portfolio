import { notFound } from "next/navigation";
import { isLocale } from "@/lib/content";
import { pageMetadata } from "@/lib/site";
import { homeStructuredData } from "@/lib/structured-data";
import JsonLd from "@/components/json-ld";
import DeskJourney from "@/components/desk/journey";
import { getJourneyContent } from "@/lib/desk-story/content";
import ServiceRows from "@/components/sections/service-rows";
import ExperienceRail from "@/components/sections/experience-rail";
import XpDesktop from "@/components/xp/xp-desktop";
import HomeContinuation from "@/components/home-continuation";
import { homeSectionLinks, menuPageLinks } from "@/lib/home-sections";
import { getCertificates } from "@/lib/home-content";
import { getIdentity } from "@/lib/identity";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const identity = getIdentity(locale);
  return pageMetadata(locale, "", identity.title, identity.description, {
    absolute: true,
  });
}
export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <main id="main" tabIndex={-1} data-home>
      <JsonLd data={homeStructuredData(locale)} />
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
        pages={menuPageLinks(locale)}
      />
      <HomeContinuation locale={locale} />
    </main>
  );
}
