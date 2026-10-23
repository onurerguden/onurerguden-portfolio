import { getCertificates, getExperience } from "./home-content";
import { sharedFacts, type Locale, type Project } from "./content";
import { siteOrigin } from "./site";
import { getIdentity } from "./identity";
import { editorialModified, editorialPublished } from "./editorial";
import { trails, type Crumb } from "./breadcrumbs";
import type { Post } from "./writing";

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

/** Me, with my roles, employers, education, credentials and profiles. */
function person(locale: Locale): Node {
  const { origin, person } = ids();
  const en = locale === "en";
  const identity = getIdentity(locale);
  const { education, work, teaching } = sharedFacts;
  const university = {
    "@type": "CollegeOrUniversity",
    "@id": `${origin}/#org-ieu`,
    // Named as the page names it, with the other language as an alias.
    name: en ? education.university : education.universityTr,
    alternateName: en ? education.universityTr : education.university,
    url: education.universityUrl,
    sameAs: education.universityWikidata,
  };
  // The roles as the Experience section names them, current ones first.
  const roleAt = (company: string) =>
    getExperience(locale).find((entry) => entry.company === company)?.role;
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
    jobTitle: identity.role,
    description: identity.description,
    homeLocation: {
      "@type": "Place",
      name: identity.location,
      address: {
        "@type": "PostalAddress",
        addressLocality: sharedFacts.location.city,
        addressCountry: sharedFacts.location.countryCode,
      },
    },
    // The home page is my profile page; every other page points at it.
    url: `${origin}/${locale}`,
    mainEntityOfPage: { "@id": `${origin}/${locale}#page` },
    // The real photo, the one my other profiles use; the opening keeps the illustration.
    image: `${origin}/images/about/onur-photo.webp`,
    email: `mailto:${sharedFacts.email}`,
    sameAs: sharedFacts.profiles.map((profile) => profile.url),
    identifier: {
      "@type": "PropertyValue",
      propertyID: "ORCID",
      value: sharedFacts.orcid,
      url: `https://orcid.org/${sharedFacts.orcid}`,
    },
    worksFor: [
      {
        "@type": "Organization",
        "@id": `${origin}/#org-future-is-now`,
        name: work.company,
      },
      {
        "@type": "EducationalOrganization",
        "@id": `${origin}/#org-astro8`,
        name: teaching.company,
      },
    ],
    hasOccupation: [identity.role, roleAt(teaching.company)]
      .filter((name): name is string => Boolean(name))
      .map((name) => ({ "@type": "Occupation", name })),
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
    // What the case studies and the bio show, in the field's own terms.
    knowsAbout: [
      "Large language models",
      "Retrieval-augmented generation",
      "AI agents",
      "Model Context Protocol",
      "LangGraph",
      "Machine learning",
      "Computer vision",
      "Software engineering",
      "Python",
      "TypeScript",
      "Java",
      "Flutter",
    ],
  };
}

function breadcrumbs(locale: Locale, trail: Crumb[]): Node {
  const { origin } = ids();
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
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
    ...(editorialModified(path)
      ? { dateModified: editorialModified(path) }
      : {}),
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
    webPage(locale, "", "ProfilePage", getIdentity(locale).title, {
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
          .filter((project) => project.caseStudy || project.repoUrl)
          .map((project, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: project.title,
            url: project.caseStudy
              ? `${origin}/${locale}/projects/${project.slug}`
              : project.repoUrl,
          })),
      },
    }),
    breadcrumbs(locale, trails.projects(locale)),
  );
}

// Stack chips that name a programming language, for SoftwareSourceCode.
const languages = new Set([
  "Dart",
  "Java",
  "JavaScript",
  "Kotlin",
  "Python",
  "Swift",
  "TypeScript",
]);

/**
 * A case study: my write-up (TechArticle) about the software it describes.
 * I always write the article; the software credits me as its creator when I
 * built it alone and as a contributor when I built it with a team.
 */
export function caseStudyStructuredData(locale: Locale, project: Project) {
  const { origin, person } = ids();
  const path = `/projects/${project.slug}`;
  const url = `${origin}/${locale}${path}`;
  const me = { "@id": person };
  const programmingLanguage = project.stack.filter((name) =>
    languages.has(name),
  );
  const software: Node = {
    "@type": project.repoUrl ? "SoftwareSourceCode" : "SoftwareApplication",
    "@id": `${url}#software`,
    name: project.title,
    description: project.summary,
    keywords: project.stack.join(", "),
    ...(project.authorship === "team"
      ? { contributor: me }
      : { creator: me, author: me }),
    ...(project.repoUrl ? { codeRepository: project.repoUrl } : {}),
    ...(project.repoUrl && programmingLanguage.length
      ? { programmingLanguage }
      : {}),
    ...(project.year ? { dateCreated: project.year } : {}),
  };
  const modified = editorialModified(path);
  const published = editorialPublished(path);
  const article: Node = {
    "@type": "TechArticle",
    "@id": `${url}#article`,
    headline: project.title,
    name: project.title,
    description: project.summary,
    genre: project.category,
    inLanguage: locale,
    keywords: project.stack.join(", "),
    author: me,
    mainEntityOfPage: { "@id": `${url}#page` },
    about: { "@id": software["@id"] },
    ...(published ? { datePublished: published } : {}),
    ...(modified ? { dateModified: modified } : {}),
    ...(project.media?.[0]
      ? { image: `${origin}${project.media[0].src}` }
      : {}),
  };
  return graph(
    webPage(locale, path, "WebPage", project.title, {
      mainEntity: { "@id": article["@id"] },
    }),
    article,
    software,
    breadcrumbs(locale, trails.caseStudy(locale, project.title, project.slug)),
  );
}

/** The article list: every article, newest first. */
export function writingStructuredData(locale: Locale, posts: Post[]) {
  const { origin } = ids();
  const name = locale === "en" ? "Writing" : "Yazılar";
  return graph(
    webPage(locale, "/writing", "CollectionPage", name, {
      mainEntity: {
        "@type": "ItemList",
        itemListElement: posts.map((post, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: post.title,
          url: `${origin}/${locale}/writing/${post.slug}`,
        })),
      },
    }),
    breadcrumbs(locale, trails.writing(locale)),
  );
}

/**
 * An article I wrote, linked to its translation so both languages read as
 * one work.
 */
export function postStructuredData(locale: Locale, post: Post) {
  const { origin, person } = ids();
  const path = `/writing/${post.slug}`;
  const url = `${origin}/${locale}${path}`;
  const other = locale === "en" ? "tr" : "en";
  const article: Node = {
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: post.title,
    name: post.title,
    description: post.description,
    inLanguage: locale,
    keywords: post.tags.join(", "),
    datePublished: post.published,
    dateModified: post.updated,
    author: { "@id": person },
    publisher: { "@id": person },
    mainEntityOfPage: { "@id": `${url}#page` },
    [locale === "en" ? "workTranslation" : "translationOfWork"]: {
      "@id": `${origin}/${other}${path}#article`,
    },
  };
  return graph(
    webPage(locale, path, "WebPage", post.title, {
      mainEntity: { "@id": article["@id"] },
    }),
    article,
    breadcrumbs(locale, trails.post(locale, post.title, post.slug)),
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
    isPartOf: {
      "@type": "Periodical",
      name: publication.journal,
      url: publication.sourceUrl,
    },
    author: publication.authors.map((author) =>
      author === sharedFacts.name
        ? { "@id": person }
        : { "@type": "Person", name: author },
    ),
    // The software the paper reports on, as its case study describes it.
    about: { "@id": `${origin}/${locale}/projects/water-safety#software` },
  };
  return graph(
    webPage(locale, "/research", "CollectionPage", name, {
      hasPart: { "@id": article["@id"] },
    }),
    article,
    breadcrumbs(locale, trails.research(locale)),
  );
}

/** Serialised for a script tag; `<` is escaped so no text can close it. */
export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
