import { afterEach, describe, expect, it, vi } from "vitest";
import { getProjects, sharedFacts } from "../src/lib/content";
import { getIdentity } from "../src/lib/identity";
import {
  caseStudyStructuredData,
  homeStructuredData,
  jsonLd,
  projectsStructuredData,
  researchStructuredData,
} from "../src/lib/structured-data";

type Graph = { "@graph": Record<string, unknown>[] };
const node = (graph: Graph, type: string) =>
  graph["@graph"].find((entry) => entry["@type"] === type);

afterEach(() => vi.unstubAllEnvs());

describe("structured data", () => {
  it("describes the home page as my profile, in both languages", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://onurerguden.dev");
    for (const locale of ["en", "tr"] as const) {
      const identity = getIdentity(locale);
      const graph = homeStructuredData(locale) as Graph;
      expect(node(graph, "ProfilePage")).toMatchObject({
        url: `https://onurerguden.dev/${locale}`,
        name: identity.title,
        mainEntity: { "@id": "https://onurerguden.dev/#person" },
      });
      expect(node(graph, "Person")).toMatchObject({
        "@id": "https://onurerguden.dev/#person",
        name: sharedFacts.name,
        sameAs: sharedFacts.profiles.map((profile) => profile.url),
        identifier: {
          "@type": "PropertyValue",
          propertyID: "ORCID",
          value: "0009-0001-3636-483X",
          url: "https://orcid.org/0009-0001-3636-483X",
        },
        worksFor: [
          { "@id": "https://onurerguden.dev/#org-future-is-now" },
          { "@id": "https://onurerguden.dev/#org-astro8" },
        ],
        hasOccupation: [
          { "@type": "Occupation", name: identity.role },
          { "@type": "Occupation", name: identity.tagline },
          {
            "@type": "Occupation",
            name: locale === "en" ? "AI instructor" : "Yapay zekâ eğitmeni",
          },
        ],
        alumniOf: {
          url: "https://www.ieu.edu.tr/",
          sameAs: "https://www.wikidata.org/wiki/Q4822444",
        },
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
      });
    }
  });

  it("describes each case study as my article about the software", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://onurerguden.dev");
    const me = { "@id": "https://onurerguden.dev/#person" };
    const credits: Record<string, "solo" | "team"> = {};
    for (const project of getProjects("en").filter((p) => p.featured)) {
      const graph = caseStudyStructuredData("en", project) as Graph;
      const url = `https://onurerguden.dev/en/projects/${project.slug}`;
      expect(node(graph, "WebPage")?.mainEntity).toEqual({
        "@id": `${url}#article`,
      });
      expect(node(graph, "TechArticle")).toMatchObject({
        headline: project.title,
        author: me,
        about: { "@id": `${url}#software` },
      });
      const software = graph["@graph"].find(
        (entry) => entry["@id"] === `${url}#software`,
      );
      expect(software?.["@type"]).toBe(
        project.repoUrl ? "SoftwareSourceCode" : "SoftwareApplication",
      );
      if (project.repoUrl)
        expect(software?.codeRepository).toBe(project.repoUrl);
      // Languages come only from the visible stack chips.
      for (const language of (software?.programmingLanguage as string[]) ?? [])
        expect(project.stack).toContain(language);
      expect(
        software?.[project.authorship === "team" ? "contributor" : "creator"],
      ).toEqual(me);
      credits[project.slug] = project.authorship!;
      const crumbs = node(graph, "BreadcrumbList")?.itemListElement as {
        item: string;
      }[];
      expect(crumbs.at(-1)?.item).toBe(url);
    }
    expect(credits).toEqual({
      kuyumcum: "team",
      "water-safety": "team",
      "course-intelligence": "solo",
      "gymrap-ai-coach": "solo",
    });
  });

  it("lists archive projects and the paper's full author order", () => {
    const projects = projectsStructuredData("tr", getProjects("tr")) as Graph;
    const list = node(projects, "CollectionPage")?.mainEntity as {
      itemListElement: { url: string }[];
    };
    expect(list.itemListElement.length).toBeGreaterThan(4);
    expect(list.itemListElement.every((item) => item.url)).toBe(true);
    const research = researchStructuredData("en") as Graph;
    const authors = node(research, "ScholarlyArticle")?.author as unknown[];
    expect(authors).toHaveLength(sharedFacts.publication.authors.length);
    expect(authors[0]).toEqual({ "@id": expect.stringMatching(/#person$/) });
    expect(authors.slice(1)).toEqual(
      sharedFacts.publication.authors
        .slice(1)
        .map((name) => ({ "@type": "Person", name })),
    );
    expect(node(research, "ScholarlyArticle")).toMatchObject({
      creativeWorkStatus: "Accepted",
      isPartOf: { url: sharedFacts.publication.sourceUrl },
    });
    expect(node(research, "ScholarlyArticle")).not.toHaveProperty(
      "datePublished",
    );
    expect(node(research, "ScholarlyArticle")).not.toHaveProperty("doi");
  });

  it("cannot close its script tag", () => {
    expect(jsonLd({ text: "</script><script>alert(1)</script>" })).not.toMatch(
      /</,
    );
  });
});
