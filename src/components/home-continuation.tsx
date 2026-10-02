import { Fragment, type ReactNode } from "react";
import type { Locale } from "@/lib/content";
import { homeSections, type HomeSectionId } from "@/lib/home-sections";
import AboutSection from "@/components/home/about-section";
import StackSection from "@/components/home/stack-section";
import ProjectsSection from "@/components/home/projects-section";
import ActivitySection from "@/components/home/activity-section";
import CertificatesSection from "@/components/home/certificates-section";
import ContactSection from "@/components/home/contact-section";

type FlowSectionId = Exclude<HomeSectionId, "services" | "experience">;
const sections: Record<FlowSectionId, (locale: Locale) => ReactNode> = {
  stack: (locale) => <StackSection locale={locale} />,
  about: (locale) => <AboutSection locale={locale} />,
  work: (locale) => <ProjectsSection locale={locale} />,
  activity: (locale) => <ActivitySection locale={locale} />,
  // Renders nothing until a certificate has been added.
  certificates: (locale) => <CertificatesSection locale={locale} />,
  contact: (locale) => <ContactSection locale={locale} />,
};

/**
 * Everything after the desk journey, in the order of `homeSections`. The
 * portrait monitor's sections belong to the journey, which shows them on the
 * monitor or, without the desk, in the page.
 */
export default function HomeContinuation({ locale }: { locale: Locale }) {
  return homeSections.map((section) =>
    section.place === "monitor" ? null : (
      <Fragment key={section.id}>{sections[section.id](locale)}</Fragment>
    ),
  );
}
