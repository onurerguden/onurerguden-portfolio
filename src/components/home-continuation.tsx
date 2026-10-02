import { Fragment, type ReactNode } from "react";
import type { Locale } from "@/lib/content";
import { homeSections, type HomeSectionId } from "@/lib/home-sections";
import AboutSection from "@/components/home/about-section";
import StackSection from "@/components/home/stack-section";
import ProjectsSection from "@/components/home/projects-section";
import ActivitySection from "@/components/home/activity-section";
import CertificatesSection from "@/components/home/certificates-section";
import ServiceRows from "@/components/sections/service-rows";
import ExperienceRail from "@/components/sections/experience-rail";
import monitor from "@/components/sections/monitor.module.css";
import ContactSection from "@/components/home/contact-section";

const sections: Record<HomeSectionId, (locale: Locale) => ReactNode> = {
  services: (locale) => (
    <section
      id="services"
      className={`${monitor.page} bleed`}
      aria-labelledby="services-title"
    >
      <ServiceRows locale={locale} />
    </section>
  ),
  experience: (locale) => (
    <section
      id="experience"
      className={`${monitor.page} bleed`}
      aria-labelledby="experience-title"
    >
      <ExperienceRail locale={locale} />
    </section>
  ),
  stack: (locale) => <StackSection locale={locale} />,
  about: (locale) => <AboutSection locale={locale} />,
  work: (locale) => <ProjectsSection locale={locale} />,
  activity: (locale) => <ActivitySection locale={locale} />,
  // Renders nothing until a certificate has been added.
  certificates: (locale) => <CertificatesSection locale={locale} />,
  contact: (locale) => <ContactSection locale={locale} />,
};

/** Everything after the desk journey, in the order of `homeSections`. */
export default function HomeContinuation({ locale }: { locale: Locale }) {
  return homeSections.map((section) => (
    <Fragment key={section.id}>{sections[section.id](locale)}</Fragment>
  ));
}
