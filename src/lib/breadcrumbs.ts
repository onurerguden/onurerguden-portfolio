import { sharedFacts, type Locale } from "./content";

export type Crumb = { name: string; path: string };

const home = (): Crumb => ({ name: sharedFacts.name, path: "" });
const projects = (locale: Locale): Crumb => ({
  name: locale === "en" ? "Projects" : "Projeler",
  path: "/projects",
});

/**
 * Each content page's trail from the home page. The visible breadcrumb and
 * the BreadcrumbList in the graph both read these, so they always match.
 */
export const trails = {
  about: (locale: Locale): Crumb[] => [
    home(),
    { name: locale === "en" ? "About" : "Hakkımda", path: "/about" },
  ],
  projects: (locale: Locale): Crumb[] => [home(), projects(locale)],
  research: (locale: Locale): Crumb[] => [
    home(),
    { name: locale === "en" ? "Research" : "Araştırma", path: "/research" },
  ],
  caseStudy: (locale: Locale, title: string, slug: string): Crumb[] => [
    home(),
    projects(locale),
    { name: title, path: `/projects/${slug}` },
  ],
};
