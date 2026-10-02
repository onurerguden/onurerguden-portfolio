import HomeIntroduction from "@/components/home-introduction";
import { notFound } from "next/navigation";
import { isLocale, sharedFacts } from "@/lib/content";
import { pageMetadata, siteOrigin } from "@/lib/site";
import DeskJourney from "@/components/desk/journey";
import { getJourneyContent } from "@/lib/desk-story/content";
import ServiceRows from "@/components/sections/service-rows";
import ExperienceRail from "@/components/sections/experience-rail";
import HomeContinuation from "@/components/home-continuation";
import { homeSectionLinks } from "@/lib/home-sections";
import { getCertificates } from "@/lib/home-content";

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
  // Structured data so search engines can connect the profiles.
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: sharedFacts.name,
    jobTitle: locale === "en" ? "AI Engineer" : "AI Mühendisi",
    worksFor: { "@type": "Organization", name: sharedFacts.work.company },
    alumniOf: {
      "@type": "CollegeOrUniversity",
      name: sharedFacts.education.university,
    },
    url: `${siteOrigin()}/${locale}`,
    sameAs: [sharedFacts.github, sharedFacts.linkedin],
  };
  return (
    <main id="main" tabIndex={-1}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(person).replace(/</g, "\\u003c"),
        }}
      />
      <DeskJourney
        locale={locale}
        content={getJourneyContent(locale)}
        monitor={{
          services: <ServiceRows locale={locale} />,
          experience: <ExperienceRail locale={locale} />,
        }}
        introduction={<HomeIntroduction locale={locale} />}
        sections={homeSectionLinks(locale, {
          certificates: getCertificates(locale).length > 0,
        })}
      />
      <HomeContinuation locale={locale} />
    </main>
  );
}
