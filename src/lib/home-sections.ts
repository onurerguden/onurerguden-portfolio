/** Anchors of the home sections after the desk journey, in page order. */
export const homeSectionIds = [
  "about",
  "stack",
  "services",
  "work",
  "activity",
  "certificates",
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
  certificates: { en: "Certificates", tr: "Sertifikalar" },
  experience: { en: "Experience", tr: "Deneyim" },
  contact: { en: "Contact", tr: "İletişim" },
};

export type SectionLink = { id: HomeSectionId; label: string };

/** Sections that only exist with content (certificates) are left out otherwise. */
export function homeSectionLinks(
  locale: "en" | "tr",
  { certificates = false }: { certificates?: boolean } = {},
): SectionLink[] {
  return homeSectionIds
    .filter((id) => id !== "certificates" || certificates)
    .map((id) => ({ id, label: labels[id][locale] }));
}
