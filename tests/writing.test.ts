import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getPosts, validateWriting } from "../src/lib/writing";
import { atomFeed } from "../src/lib/feed";
import { llmsIndex } from "../src/lib/llms";
import {
  postStructuredData,
  writingStructuredData,
} from "../src/lib/structured-data";

afterEach(() => vi.unstubAllEnvs());

const root = path.join(process.cwd(), "src/content");
function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "writing-"));
  fs.cpSync(root, dir, { recursive: true });
  return dir;
}
const slug = "model-writes-server-computes";
const edit = (
  dir: string,
  locale: string,
  change: (text: string) => string,
) => {
  const file = path.join(dir, locale, "writing", `${slug}.mdx`);
  fs.writeFileSync(file, change(fs.readFileSync(file, "utf8")));
};

describe("writing", () => {
  it("has the same articles, dates and sections in both languages", () => {
    expect(() => validateWriting()).not.toThrow();
    const [en, tr] = (["en", "tr"] as const).map((locale) => getPosts(locale));
    expect(en.map((post) => post.slug)).toEqual(tr.map((post) => post.slug));
    expect(en.length).toBeGreaterThan(0);
    for (const post of en) expect(post.body).toMatch(/^## Short answer/);
    for (const post of tr) expect(post.body).toMatch(/^## Kısa cevap/);
  });

  it("rejects an article missing a section, a future date or an early update", () => {
    let dir = fixture();
    edit(dir, "tr", (text) => text.replace("## Kodu incele", "Kodu incele"));
    expect(() => validateWriting(dir)).toThrow("differ across languages");
    dir = fixture();
    for (const locale of ["en", "tr"])
      edit(dir, locale, (text) =>
        text.replace('published: "2026-10-23"', 'published: "2026-10-24"'),
      );
    expect(() => getPosts("en", dir)).toThrow("updated before published");
    expect(() =>
      validateWriting(root, new Date("2026-10-22T12:00:00Z")),
    ).toThrow("in the future");
  });

  it("marks each article as mine and links its translation", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://onurerguden.dev");
    const post = getPosts("tr")[0];
    const graph = postStructuredData("tr", post)["@graph"] as Record<
      string,
      unknown
    >[];
    const article = graph.find((node) => node["@type"] === "BlogPosting");
    expect(article).toMatchObject({
      headline: post.title,
      datePublished: post.published,
      dateModified: post.updated,
      author: { "@id": "https://onurerguden.dev/#person" },
      translationOfWork: {
        "@id": `https://onurerguden.dev/en/writing/${post.slug}#article`,
      },
    });
    const list = writingStructuredData("en", getPosts("en"))["@graph"][0] as {
      mainEntity: { itemListElement: unknown[] };
    };
    expect(list.mainEntity.itemListElement).toHaveLength(getPosts("en").length);
  });

  it("publishes an Atom feed and lists articles for AI assistants", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://onurerguden.dev");
    const feed = atomFeed("en");
    expect(feed).toMatch(/^<\?xml version="1.0" encoding="utf-8"\?>/);
    expect(feed).toContain(
      '<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en">',
    );
    expect(feed).toContain(
      `<link rel="self" href="https://onurerguden.dev/en/writing/feed.xml"/>`,
    );
    for (const post of getPosts("en")) {
      expect(feed).toContain(
        `<id>https://onurerguden.dev/en/writing/${post.slug}</id>`,
      );
      expect(llmsIndex()).toContain(`/en/writing/${post.slug}`);
      expect(llmsIndex()).toContain(`/tr/writing/${post.slug}`);
    }
    expect(feed).not.toMatch(/&(?!amp;|lt;|gt;|quot;)/);
    // The feed is as new as its newest article, never a fixed date.
    const newest = getPosts("en")
      .map((post) => post.updated)
      .sort()
      .at(-1);
    expect(feed).toContain(
      `<id>https://onurerguden.dev/en/writing</id>\n  <updated>${newest}T00:00:00Z</updated>`,
    );
  });
});
