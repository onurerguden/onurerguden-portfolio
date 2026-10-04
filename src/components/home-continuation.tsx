import { Fragment, type CSSProperties, type ReactNode } from "react";
import type { Locale } from "@/lib/content";
import { homeSections, type HomeSectionId } from "@/lib/home-sections";
import { getCertificates } from "@/lib/home-content";
import AboutSection from "@/components/home/about-section";
import ProjectsSection from "@/components/home/projects-section";
import ActivitySection from "@/components/home/activity-section";
import CertificatesSection from "@/components/home/certificates-section";
import ContactSection from "@/components/home/contact-section";
import SheetController from "@/components/home/sheet-controller";
import ResearchTeaser from "@/components/sections/research-teaser";

type FlowSectionId = Exclude<
  HomeSectionId,
  "services" | "experience" | "stack"
>;
const sections: Record<FlowSectionId, (locale: Locale) => ReactNode> = {
  about: (locale) => <AboutSection locale={locale} />,
  work: (locale) => <ProjectsSection locale={locale} />,
  research: (locale) => <ResearchTeaser locale={locale} />,
  activity: (locale) => <ActivitySection locale={locale} />,
  certificates: (locale) => <CertificatesSection locale={locale} />,
  contact: (locale) => <ContactSection locale={locale} />,
};

/**
 * Earlier links to the desk's chapters (#desk-story-0, 1 and 2: selected
 * work, research, about and contact) land just before the sections that
 * now hold that content.
 */
const aliases: Partial<Record<FlowSectionId, string>> = {
  work: "desk-story-0",
  research: "desk-story-1",
  about: "desk-story-2",
};

/**
 * Everything after the desk journey, in the order of `homeSections`. The
 * sections on the desk's screens belong to the journey, which shows them on
 * the screens or, without the desk, in the page.
 *
 * Each section is a sheet (site.css): on wide screens it settles into the
 * view, holds there for a few scroll steps and is then covered by the next
 * one sliding up. The wrapper carries the section's id, so links and the
 * skip link land on it rather than on the pinned section.
 */
export default function HomeContinuation({ locale }: { locale: Locale }) {
  const flow = homeSections.filter(
    (section) =>
      section.place === "flow" &&
      // Certificates render nothing until one has been added.
      (section.id !== "certificates" || getCertificates(locale).length > 0),
  );
  return (
    <>
      {flow.map((section, index) => (
        <Fragment key={section.id}>
          <div
            id={section.id}
            className="sheet"
            data-sheet={index === flow.length - 1 ? "last" : ""}
            tabIndex={-1}
            style={{ "--sheet-name": `--sheet-${section.id}` } as CSSProperties}
          >
            {aliases[section.id as FlowSectionId] ? (
              <span
                id={aliases[section.id as FlowSectionId]}
                className="anchor-alias"
                aria-hidden="true"
              />
            ) : null}
            {sections[section.id as FlowSectionId](locale)}
          </div>
        </Fragment>
      ))}
      <SheetController />
    </>
  );
}
