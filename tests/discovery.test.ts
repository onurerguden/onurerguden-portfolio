import { afterEach, describe, expect, it, vi } from "vitest";
import sitemap from "../src/app/sitemap";
import { getProjects } from "../src/lib/content";
import { getCertificates } from "../src/lib/home-content";
import { getIdentity } from "../src/lib/identity";
import { llmsIndex } from "../src/lib/llms";
import { trails } from "../src/lib/breadcrumbs";
import {
  aboutStructuredData,
  caseStudyStructuredData,
} from "../src/lib/structured-data";

afterEach(() => vi.unstubAllEnvs());

describe("discovery", () => {
  it("lists the images each page shows in the sitemap", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://onurerguden.dev");
    const entries = sitemap();
    const images = (url: string) =>
      entries.find((entry) => entry.url === url)?.images ?? [];
    expect(images("https://onurerguden.dev/tr")).toEqual(
      expect.arrayContaining(
        getCertificates("en").map(
          (certificate) => `https://onurerguden.dev${certificate.image.src}`,
        ),
      ),
    );
    for (const project of getProjects("en").filter((p) => p.caseStudy))
      expect(
        images(`https://onurerguden.dev/en/projects/${project.slug}`),
      ).toEqual(
        (project.media ?? []).map(
          (item) => `https://onurerguden.dev${item.src}`,
        ),
      );
    expect(images("https://onurerguden.dev/en/about")).toEqual([]);
  });

  it("introduces and links the Turkish pages in llms.txt", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://onurerguden.dev");
    const text = llmsIndex();
    expect(text).toContain("## Türkçe");
    expect(text).toContain(getIdentity("tr").lead);
    expect(text).toContain("(https://onurerguden.dev/tr/about)");
    for (const project of getProjects("tr").filter((p) => p.caseStudy))
      expect(text).toContain(
        `https://onurerguden.dev/tr/projects/${project.slug}`,
      );
  });

  it("builds the graph's breadcrumbs from the visible trails", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://onurerguden.dev");
    type Graph = { "@graph": Record<string, unknown>[] };
    const list = (graph: Graph) =>
      (
        graph["@graph"].find((node) => node["@type"] === "BreadcrumbList") as {
          itemListElement: { name: string; item: string }[];
        }
      ).itemListElement.map(({ name, item }) => ({ name, item }));
    const expected = (trail: { name: string; path: string }[]) =>
      trail.map((crumb) => ({
        name: crumb.name,
        item: `https://onurerguden.dev/tr${crumb.path}`,
      }));
    expect(list(aboutStructuredData("tr") as Graph)).toEqual(
      expected(trails.about("tr")),
    );
    const project = getProjects("tr").find((p) => p.caseStudy)!;
    expect(list(caseStudyStructuredData("tr", project) as Graph)).toEqual(
      expected(trails.caseStudy("tr", project.title, project.slug)),
    );
  });
});
