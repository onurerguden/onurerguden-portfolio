import { getProjects, sharedFacts, type Locale } from "./content";
import { getCertificates, getExperience } from "./home-content";
import { getIdentity } from "./identity";

const monthYear = (value: string, locale: Locale) =>
  new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}-01T00:00:00Z`));

export type TimelineEntry = {
  /** YYYY-MM, for sorting and the <time> element. */
  start: string;
  period: string;
  title: string;
  place: string;
};

/**
 * The About page's facts, all drawn from shared facts, Experience and
 * Certificates, so they cannot drift from the home page or the graph.
 */
export function getAboutPage(locale: Locale) {
  const en = locale === "en";
  const identity = getIdentity(locale);
  const { education, work, teaching, publication } = sharedFacts;
  const roles = getExperience(locale);
  const roleAt = (company: string) =>
    roles.find((entry) => entry.company === company && !entry.end);
  const engineering = roleAt(work.company);
  const instructing = roleAt(teaching.company);
  const university = en ? education.university : education.universityTr;
  const program = getCertificates(locale).find(
    (certificate) => certificate.id === "academy-ai-program",
  );

  const facts = [
    {
      label: en ? "Role" : "Rol",
      value: identity.headline,
      detail: `${engineering?.role} · ${work.company} · ${engineering?.period}`,
    },
    {
      label: en ? "Teaching" : "Eğitmenlik",
      value: instructing?.role ?? "",
      detail: `${teaching.company} · ${instructing?.period}`,
    },
    {
      label: en ? "Based in" : "Konum",
      value: identity.location,
    },
    {
      label: en ? "Education" : "Eğitim",
      value: en ? education.degree : "Yazılım Mühendisliği lisansı",
      detail: `${university} · ${monthYear(education.graduation, locale)}`,
    },
    {
      label: en ? "Publication" : "Yayın",
      value: publication.journal,
      detail: publication.statusLabel[locale],
      href: `/${locale}/research`,
    },
    {
      label: en ? "Languages" : "Diller",
      value: en ? "Turkish, English" : "Türkçe, İngilizce",
    },
  ];

  const timeline: TimelineEntry[] = [
    ...roles.map((entry) => ({
      start: entry.start,
      period: entry.period,
      title: entry.role,
      place: entry.company,
    })),
    {
      start: education.graduation,
      period: monthYear(education.graduation, locale),
      title: en ? education.degree : "Yazılım Mühendisliği lisansı",
      place: university,
    },
    ...(program
      ? [
          {
            start: program.issued,
            period: program.issuedLabel,
            title: program.title,
            place: program.issuer,
          },
        ]
      : []),
  ].toSorted((a, b) => b.start.localeCompare(a.start));

  const cases = getProjects(locale)
    .filter((project) => project.featured)
    .map((project) => ({
      title: project.title,
      summary: project.summary,
      href: `/${locale}/projects/${project.slug}`,
    }));

  return { identity, facts, timeline, cases };
}
