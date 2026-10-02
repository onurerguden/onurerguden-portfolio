/**
 * The home page's sections in reading order: the single source for the
 * journey bar, the Sections menu, the XP Start menu, the static flow and the
 * order tests. `place` says where a section is shown when the desk journey
 * runs: on the portrait monitor, on the MacBook or in the page flow after the
 * desk. Without the journey every section reads in the page flow, in order.
 */
export const homeSections = [
  {
    id: "services",
    place: "monitor",
    label: { en: "What I do", tr: "Ne yapıyorum" },
  },
  {
    id: "experience",
    place: "monitor",
    label: { en: "Experience", tr: "Deneyim" },
  },
  {
    id: "stack",
    place: "laptop",
    label: { en: "Tech stack", tr: "Teknolojiler" },
  },
  { id: "about", place: "flow", label: { en: "About", tr: "Hakkımda" } },
  { id: "work", place: "flow", label: { en: "Projects", tr: "Projeler" } },
  {
    id: "research",
    place: "flow",
    label: { en: "Research", tr: "Araştırma" },
  },
  {
    id: "activity",
    place: "flow",
    label: { en: "GitHub activity", tr: "GitHub aktivitesi" },
  },
  {
    id: "certificates",
    place: "flow",
    label: { en: "Certificates", tr: "Sertifikalar" },
    optional: true,
  },
  { id: "contact", place: "flow", label: { en: "Contact", tr: "İletişim" } },
] as const satisfies readonly {
  id: string;
  place: "monitor" | "laptop" | "flow";
  label: { en: string; tr: string };
  optional?: boolean;
}[];

export type HomeSectionId = (typeof homeSections)[number]["id"];
export type SectionPlace = (typeof homeSections)[number]["place"];
export const homeSectionIds = homeSections.map((section) => section.id);

export type SectionLink = { id: HomeSectionId; label: string };

/**
 * Links to every section that has content, in reading order. Optional
 * sections (certificates) appear only once they have something to show.
 */
export function homeSectionLinks(
  locale: "en" | "tr",
  { certificates = false }: { certificates?: boolean } = {},
): SectionLink[] {
  return homeSections
    .filter((section) => section.id !== "certificates" || certificates)
    .map((section) => ({ id: section.id, label: section.label[locale] }));
}

/** Sections shown on the desk's screens while the journey runs. */
export const deskSections = homeSections.filter(
  (section) => section.place !== "flow",
);
