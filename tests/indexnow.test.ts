import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  changedUrls,
  editorialDates,
  sitemapEntries,
} from "../scripts/seo/indexnow-core.mjs";
import sitemap from "../src/app/sitemap";
import { editorialModified } from "../src/lib/editorial";

const origin = "https://portfolio.example";
const xml = `<urlset>
<url><loc>${origin}/en</loc><lastmod>2026-10-12T20:19:55Z</lastmod></url>
<url><loc>${origin}/tr/projects/kuyumcum</loc><lastmod>2026-10-20T09:00:00Z</lastmod></url>
<url><loc>${origin}/en/writing</loc><lastmod>2026-10-21T09:00:00Z</lastmod></url>
<url><loc>${origin}/tr/undated</loc></url>
<url><loc>https://elsewhere.example/en</loc><lastmod>2026-10-01T00:00:00Z</lastmod></url>
</urlset>`;

afterEach(() => vi.unstubAllEnvs());

describe("IndexNow submissions", () => {
  it("reads this origin's sitemap entries with their dates", () => {
    expect(sitemapEntries(xml, origin)).toEqual([
      { url: `${origin}/en`, lastmod: "2026-10-12T20:19:55Z" },
      {
        url: `${origin}/tr/projects/kuyumcum`,
        lastmod: "2026-10-20T09:00:00Z",
      },
      { url: `${origin}/en/writing`, lastmod: "2026-10-21T09:00:00Z" },
      { url: `${origin}/tr/undated`, lastmod: undefined },
    ]);
  });

  it("submits changed, new and undated pages only", () => {
    const previous = {
      "": "2026-10-12T20:19:55Z",
      "/projects/kuyumcum": "2026-10-13T12:41:00Z",
    };
    expect(changedUrls(sitemapEntries(xml, origin), previous)).toEqual([
      `${origin}/tr/projects/kuyumcum`,
      `${origin}/en/writing`,
      `${origin}/tr/undated`,
    ]);
  });

  it("submits every page without a previous deploy", () => {
    expect(changedUrls(sitemapEntries(xml, origin), undefined)).toHaveLength(4);
  });

  it("parses editorial.ts exactly as the site reads it", () => {
    const dates = editorialDates(readFileSync("src/lib/editorial.ts", "utf8"));
    expect(Object.keys(dates).length).toBeGreaterThan(0);
    for (const [path, date] of Object.entries(dates))
      expect(editorialModified(path)).toBe(date);
  });

  it("dates every sitemap page, so unchanged pages can be skipped", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", origin);
    const entries = sitemap();
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries)
      expect(entry.lastModified, entry.url).toBeTruthy();
    const dates = editorialDates(readFileSync("src/lib/editorial.ts", "utf8"));
    for (const entry of entries)
      expect(
        dates[new URL(entry.url).pathname.replace(/^\/(?:en|tr)/, "")],
        entry.url,
      ).toBe(entry.lastModified);
  });
});
