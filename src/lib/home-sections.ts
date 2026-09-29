/** Anchors of the home sections after the desk journey, in page order. */
export const homeSectionIds = [
  "about",
  "stack",
  "services",
  "work",
  "activity",
  "experience",
  "contact",
] as const;
export type HomeSectionId = (typeof homeSectionIds)[number];

const labels: Record<HomeSectionId, { en: string; tr: string }> = {
  about: { en: "About", tr: "Hakkımda" },
  stack: { en: "Tech stack", tr: "Teknolojiler" },
  services: { en: "What I do", tr: "Ne yapıyorum" },
  work: { en: "Projects", tr: "Projeler" },
  activity: { en: "GitHub activity", tr: "GitHub aktivitesi" },
  experience: { en: "Experience", tr: "Deneyim" },
  contact: { en: "Contact", tr: "İletişim" },
};

export type SectionLink = { id: HomeSectionId; label: string };

export function homeSectionLinks(locale: "en" | "tr"): SectionLink[] {
  return homeSectionIds.map((id) => ({ id, label: labels[id][locale] }));
}
