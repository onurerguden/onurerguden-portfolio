import type { Locale } from "@/lib/content";
import AboutSection from "@/components/home/about-section";
import StackSection from "@/components/home/stack-section";
import ServicesSection from "@/components/home/services-section";
import ProjectsSection from "@/components/home/projects-section";
import ActivitySection from "@/components/home/activity-section";
import CertificatesSection from "@/components/home/certificates-section";
import ExperienceSection from "@/components/home/experience-section";
import ContactSection from "@/components/home/contact-section";

/**
 * Everything after the desk journey, in story order: who I am, what I use,
 * what I do, the proof, live activity, credentials, then how to reach me.
 * Certificates render only once one has been added.
 */
export default function HomeContinuation({ locale }: { locale: Locale }) {
  return (
    <>
      <AboutSection locale={locale} />
      <StackSection locale={locale} />
      <ServicesSection locale={locale} />
      <ProjectsSection locale={locale} />
      <ActivitySection locale={locale} />
      <CertificatesSection locale={locale} />
      <ExperienceSection locale={locale} />
      <ContactSection locale={locale} />
    </>
  );
}
