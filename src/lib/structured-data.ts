import { getCertificates } from "./home-content";
import { sharedFacts, type Locale, type Project } from "./content";
import { siteOrigin } from "./site";

/**
 * Schema.org data for search engines and AI answer engines. Every page
 * describes itself and points at the same Person and WebSite by `@id`, so a
 * crawler that reads any page can connect it to me and my profiles. Only
 * facts the pages themselves show belong here.
 */
type Node = Record<string, unknown>;

const ids = () => {
  const origin = siteOrigin();
  return {
    origin,
    person: `${origin}/#person`,
    website: `${origin}/#website`,
  };
};

const pageName = (locale: Locale) =>
  locale === "en"
    ? "Onur Ergüden — AI Engineer"
    : "Onur Ergüden — AI Mühendisi";

/** The site in both languages, published by me. */
function website(): Node {
  const { origin, person, website } = ids();
  return {
    "@type": "WebSite",
    "@id": website,
    url: `${origin}/en`,
    name: sharedFacts.name,
    inLanguage: ["en", "tr"],
    publisher: { "@id": person },
  };
}

/** Me, with my role, education, credentials and public profiles. */
function person(locale: Locale): Node {
  const { origin, person } = ids();
  const en = locale === "en";
  const university = {
    "@type": "CollegeOrUniversity",
    name: sharedFacts.education.university,
  };
  const certificates = getCertificates(locale).map((certificate) => ({
    "@type": "EducationalOccupationalCredential",
    name: certificate.title,
    credentialCategory: en ? "certificate" : "sertifika",
    dateCreated: certificate.issued,
    recognizedBy: {
      "@type": "Organization",
      name: certificate.issuer,
    },
    ...(certificate.credentialUrl ? { url: certificate.credentialUrl } : {}),
  }));
  return {
    "@type": "Person",
    "@id": person,
    name: sharedFacts.name,
    // How the name is typed on keyboards without Turkish letters.
    alternateName: "Onur Erguden",
    givenName: "Onur",
    familyName: "Ergüden",
    jobTitle: en ? "AI Engineer" : "AI Mühendisi",
    description: en
      ? "AI engineer building LLM applications end to end: retrieval, tool-calling agents with LangGraph and MCP, and the product around them."
      : "Uçtan uca LLM uygulamaları geliştiren AI mühendisi: bilgi erişimi, LangGraph ve MCP ile araç kullanan ajanlar ve bunların etrafındaki ürün.",
    url: `${origin}/${locale}`,
    image: `${origin}/images/avatar/onur-head-v4.webp`,
    email: `mailto:${sharedFacts.email}`,
    sameAs: [sharedFacts.github, sharedFacts.linkedin],
    worksFor: { "@type": "Organization", name: sharedFacts.work.company },
    alumniOf: university,
    hasCredential: [
      {
        "@type": "EducationalOccupationalCredential",
        name: sharedFacts.education.degree,
        credentialCategory: en ? "degree" : "lisans derecesi",
        recognizedBy: university,
      },
      ...certificates,
    ],
    knowsLanguage: ["tr", "en"],
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
}

type Crumb = { name: string; path: string };

function breadcrumbs(locale: Locale, trail: Crumb[]): Node {
  const { origin } = ids();
  const home: Crumb = { name: sharedFacts.name, path: "" };
  return {
    "@type": "BreadcrumbList",
    itemListElement: [home, ...trail].map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${origin}/${locale}${crumb.path}`,
    })),
  };
}

function webPage(
  locale: Locale,
  path: string,
  type: string,
  name: string,
  extra: Node = {},
): Node {
  const { origin, person, website } = ids();
  const url = `${origin}/${locale}${path}`;
  return {
    "@type": type,
    "@id": `${url}#page`,
    url,
    name,
    inLanguage: locale,
    isPartOf: { "@id": website },
    author: { "@id": person },
    ...extra,
  };
}

const graph = (...nodes: Node[]) => ({
  "@context": "https://schema.org",
  "@graph": nodes,
});

/** The home page is my profile page. */
export function homeStructuredData(locale: Locale) {
  return graph(
    webPage(locale, "", "ProfilePage", pageName(locale), {
      mainEntity: { "@id": ids().person },
    }),
    website(),
    person(locale),
  );
}

/** The archive: case studies link to their pages, the rest to their source. */
export function projectsStructuredData(locale: Locale, projects: Project[]) {
  const { origin } = ids();
  const name = locale === "en" ? "Projects" : "Projeler";
  return graph(
    webPage(locale, "/projects", "CollectionPage", name, {
      mainEntity: {
        "@type": "ItemList",
        itemListElement: projects
          .filter((project) => project.featured || project.repoUrl)
          .map((project, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: project.title,
            url: project.featured
              ? `${origin}/${locale}/projects/${project.slug}`
              : project.repoUrl,
          })),
      },
    }),
    breadcrumbs(locale, [{ name, path: "/projects" }]),
  );
}

/** A case study: what was built, with what, and where its source is. */
export function caseStudyStructuredData(locale: Locale, project: Project) {
  const { origin, person } = ids();
  const path = `/projects/${project.slug}`;
  const work: Node = {
    "@type": "CreativeWork",
    "@id": `${origin}/${locale}${path}#work`,
    name: project.title,
    headline: project.title,
    description: project.summary,
    genre: project.category,
    inLanguage: locale,
    keywords: project.stack.join(", "),
    creator: { "@id": person },
    ...(project.year ? { dateCreated: project.year } : {}),
    ...(project.media?.[0]
      ? { image: `${origin}${project.media[0].src}` }
      : {}),
    ...(project.repoUrl
      ? {
          about: {
            "@type": "SoftwareSourceCode",
            name: project.title,
            codeRepository: project.repoUrl,
          },
        }
      : {}),
  };
  return graph(
    webPage(locale, path, "WebPage", project.title, {
      mainEntity: { "@id": work["@id"] },
    }),
    work,
    breadcrumbs(locale, [
      { name: locale === "en" ? "Projects" : "Projeler", path: "/projects" },
      { name: project.title, path },
    ]),
  );
}

/** The accepted paper, credited to every author in the order published. */
export function researchStructuredData(locale: Locale) {
  const { origin, person } = ids();
  const name = locale === "en" ? "Research" : "Araştırma";
  const { publication } = sharedFacts;
  const article: Node = {
    "@type": "ScholarlyArticle",
    "@id": `${origin}/#publication-ijea`,
    headline: publication.title,
    name: publication.title,
    inLanguage: "en",
    creativeWorkStatus: "Accepted",
    isPartOf: { "@type": "Periodical", name: publication.journal },
    author: publication.authors.map((author) =>
      author === "O. Ergüden"
        ? { "@id": person }
        : { "@type": "Person", name: author },
    ),
    about: `${origin}/${locale}/projects/water-safety`,
  };
  return graph(
    webPage(locale, "/research", "CollectionPage", name, {
      hasPart: { "@id": article["@id"] },
    }),
    article,
    breadcrumbs(locale, [{ name, path: "/research" }]),
  );
}

/** Serialised for a script tag; `<` is escaped so no text can close it. */
export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
