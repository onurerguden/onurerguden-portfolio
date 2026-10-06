import { notFound } from "next/navigation";
import { isLocale, sharedFacts } from "@/lib/content";
import { pageMetadata, siteOrigin } from "@/lib/site";
import DeskJourney from "@/components/desk/journey";
import { getJourneyContent } from "@/lib/desk-story/content";
import ServiceRows from "@/components/sections/service-rows";
import ExperienceRail from "@/components/sections/experience-rail";
import XpDesktop from "@/components/xp/xp-desktop";
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
    locale === "en"
      ? "Onur Ergüden — AI Engineer"
      : "Onur Ergüden — AI Mühendisi",
    locale === "en"
      ? "Onur Ergüden is an AI engineer at Future Is Now, building LLM applications end to end: retrieval, LangGraph and MCP agents, and applied ML research."
      : "Onur Ergüden, Future Is Now’da AI mühendisi. Uçtan uca LLM uygulamaları geliştiriyor: bilgi erişimi, LangGraph ve MCP ajanları, uygulamalı ML araştırması.",
    { absolute: true },
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
    // What the case studies show, in the field's own terms.
    knowsAbout: [
      "Large language models",
      "Retrieval-augmented generation",
      "AI agents",
      "Model Context Protocol",
      "LangGraph",
      "Machine learning",
      "Computer vision",
    ],
  };
  return (
    <main id="main" tabIndex={-1} data-home>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(person).replace(/</g, "\\u003c"),
        }}
      />
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
