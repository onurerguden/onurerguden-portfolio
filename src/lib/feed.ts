import type { Locale } from "./content";
import { siteOrigin } from "./site";
import { getPosts } from "./writing";

const escape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** The feed's address in one language. */
export const feedUrl = (locale: Locale) =>
  `${siteOrigin()}/${locale}/writing/feed.xml`;

/** An Atom feed of my articles in one language (RFC 4287). */
export function atomFeed(locale: Locale) {
  const origin = siteOrigin();
  const posts = getPosts(locale);
  const en = locale === "en";
  const title = en ? "Onur Ergüden — Writing" : "Onur Ergüden — Yazılar";
  const updated = posts
    .map((post) => post.updated)
    .sort()
    .at(-1);
  const entries = posts.map((post) => {
    const url = `${origin}/${locale}/writing/${post.slug}`;
    return [
      "  <entry>",
      `    <title>${escape(post.title)}</title>`,
      `    <link href="${url}"/>`,
      `    <id>${url}</id>`,
      `    <published>${post.published}T00:00:00Z</published>`,
      `    <updated>${post.updated}T00:00:00Z</updated>`,
      `    <summary>${escape(post.description)}</summary>`,
      ...post.tags.map((tag) => `    <category term="${escape(tag)}"/>`),
      "  </entry>",
    ].join("\n");
  });
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    `<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${locale}">`,
    `  <title>${escape(title)}</title>`,
    `  <link rel="self" href="${feedUrl(locale)}"/>`,
    `  <link href="${origin}/${locale}/writing"/>`,
    `  <id>${origin}/${locale}/writing</id>`,
    `  <updated>${updated ?? "2026-10-23"}T00:00:00Z</updated>`,
    "  <author>",
    "    <name>Onur Ergüden</name>",
    `    <uri>${origin}/${locale}/about</uri>`,
    "  </author>",
    ...entries,
    "</feed>",
    "",
  ].join("\n");
}
