import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { caseHeadings, locales, slugify, type Locale } from "./content";
import { editorialModified } from "./editorial";

/**
 * Articles in /writing, written from my own work. Each one exists in both
 * languages under the same slug and dates, with the same sections, so a
 * reader can switch language and land in the same place.
 */
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const frontmatterSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    locale: z.enum(locales),
    title: z.string().min(1),
    /** The search-result description, short enough not to be cut. */
    description: z.string().min(50).max(160),
    published: day,
    updated: day,
    tags: z.array(z.string().min(1)).min(1).max(6),
  })
  .strict();

export type Post = z.infer<typeof frontmatterSchema> & {
  body: string;
  /** Rough reading time in minutes, at 220 words a minute. */
  minutes: number;
};

const defaultRoot = () => path.join(process.cwd(), "src/content");

function readPosts(locale: Locale, root: string): Post[] {
  const dir = path.join(root, locale, "writing");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const parsed = matter(fs.readFileSync(path.join(dir, file), "utf8"));
      const data = frontmatterSchema.parse(parsed.data);
      if (data.slug !== file.replace(/\.mdx$/, "") || data.locale !== locale)
        throw new Error(
          `Article file and frontmatter differ: ${locale}/${file}`,
        );
      if (data.updated < data.published)
        throw new Error(`Article updated before published: ${data.slug}`);
      const body = parsed.content.trim();
      if (!body) throw new Error(`Empty article: ${locale}/${data.slug}`);
      const words = body.split(/\s+/).length;
      return { ...data, body, minutes: Math.max(1, Math.round(words / 220)) };
    });
}

/** Every article in one language, newest first. */
export function getPosts(locale: Locale, root = defaultRoot()): Post[] {
  return readPosts(locale, root).toSorted(
    (a, b) =>
      b.published.localeCompare(a.published) || a.slug.localeCompare(b.slug),
  );
}

export function getPost(locale: Locale, slug: string, root = defaultRoot()) {
  return getPosts(locale, root).find((post) => post.slug === slug);
}

/** Section ids come from the English headings, so both languages share them. */
export function postSections(locale: Locale, slug: string) {
  const local = getPost(locale, slug)?.body;
  const english = getPost("en", slug)?.body;
  if (!local || !english) return [];
  const ids = caseHeadings(english).map(slugify);
  return caseHeadings(local).map((label, i) => ({ id: ids[i], label }));
}

/** Both languages carry the same articles, dates and sections; none is from the future. */
export function validateWriting(root = defaultRoot(), today = new Date()) {
  const [en, tr] = locales.map((locale) => getPosts(locale, root));
  const shared = (post: Post) =>
    `${post.slug}:${post.published}:${post.updated}:${caseHeadings(post.body).length}`;
  if (en.map(shared).join() !== tr.map(shared).join())
    throw new Error("Articles differ across languages");
  const now = today.toISOString().slice(0, 10);
  for (const post of en) {
    if (post.published > now || post.updated > now)
      throw new Error(`Article dated in the future: ${post.slug}`);
    // The sitemap reads page dates from editorial.ts; it must agree.
    if (!editorialModified(`/writing/${post.slug}`)?.startsWith(post.updated))
      throw new Error(`Article date missing from editorial.ts: ${post.slug}`);
  }
}

/** An article date as readers see it. */
export function formatDay(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
