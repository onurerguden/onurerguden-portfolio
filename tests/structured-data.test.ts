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
        sameAs: [sharedFacts.github, sharedFacts.linkedin],
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

  it("links every case study to its creator and source", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://onurerguden.dev");
    for (const project of getProjects("en").filter((p) => p.featured)) {
      const graph = caseStudyStructuredData("en", project) as Graph;
      const work = node(graph, "CreativeWork");
      expect(work).toMatchObject({
        name: project.title,
        creator: { "@id": "https://onurerguden.dev/#person" },
      });
      if (project.repoUrl)
        expect(work?.about).toMatchObject({ codeRepository: project.repoUrl });
      const crumbs = node(graph, "BreadcrumbList")?.itemListElement as {
        item: string;
      }[];
      expect(crumbs.at(-1)?.item).toBe(
        `https://onurerguden.dev/en/projects/${project.slug}`,
      );
    }
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
