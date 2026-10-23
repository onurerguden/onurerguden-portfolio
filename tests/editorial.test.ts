import { afterEach, describe, expect, it, vi } from "vitest";
import sitemap from "../src/app/sitemap";
import { getProjects } from "../src/lib/content";
import { editorialModified } from "../src/lib/editorial";
import {
  aboutStructuredData,
  caseStudyStructuredData,
  homeStructuredData,
  researchStructuredData,
} from "../src/lib/structured-data";

type Graph = { "@graph": Record<string, unknown>[] };
const node = (graph: Graph, type: string) =>
  graph["@graph"].find((entry) => entry["@type"] === type);

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("editorial modification dates", () => {
  it("omits unverified dates, including arbitrary object keys", () => {
    for (const path of ["/unknown", "/lab/desk", "constructor", "__proto__"])
      expect(editorialModified(path)).toBeUndefined();
  });

  it("does not renew recorded dates when the clock or deployment changes", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://onurerguden.dev");
    const before = sitemap();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-10-12T12:00:00Z"));
    vi.stubEnv("VERCEL_URL", "later-deployment.vercel.app");
    expect(sitemap()).toEqual(before);
    for (const page of before) {
      const path = new URL(page.url).pathname.replace(/^\/(en|tr)/, "");
      expect(page.lastModified).toBe(editorialModified(path));
      expect(String(page.lastModified)).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
      );
    }
  });

  it("dates the portfolio page without redating the underlying work", () => {
    for (const locale of ["en", "tr"] as const) {
      const home = homeStructuredData(locale) as Graph;
      expect(node(home, "WebPage")?.dateModified).toBe(editorialModified(""));
      expect(node(home, "WebPage")).not.toHaveProperty("dateCreated");
      const about = aboutStructuredData(locale) as Graph;
      expect(node(about, "ProfilePage")?.dateModified).toBe(
        editorialModified("/about"),
      );
      for (const project of getProjects(locale).filter((p) => p.caseStudy)) {
        const graph = caseStudyStructuredData(locale, project) as Graph;
        expect(node(graph, "WebPage")?.dateModified).toBe(
          editorialModified(`/projects/${project.slug}`),
        );
        // The write-up is redated; the software it describes is not.
        expect(node(graph, "TechArticle")?.dateModified).toBe(
          editorialModified(`/projects/${project.slug}`),
        );
        const software = graph["@graph"].find((entry) =>
          String(entry["@id"]).endsWith("#software"),
        );
        expect(software).not.toHaveProperty("dateModified");
        expect(software?.dateCreated).toBe(project.year || undefined);
      }
      const research = researchStructuredData(locale) as Graph;
      expect(node(research, "CollectionPage")?.dateModified).toBe(
        editorialModified("/research"),
      );
      expect(node(research, "ScholarlyArticle")).not.toHaveProperty(
        "dateModified",
      );
      expect(node(research, "ScholarlyArticle")).not.toHaveProperty(
        "datePublished",
      );
    }
  });
});
