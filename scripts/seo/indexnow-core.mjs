// Decides which sitemap pages IndexNow should hear about after a deploy: the
// pages whose editorial date (src/lib/editorial.ts) differs from the one the
// previous production deploy published, plus pages that are new. Submitting
// unchanged pages on every deploy only spends the engines' crawl budget.

/** Every `{ url, lastmod }` in a sitemap that belongs to this origin. */
export function sitemapEntries(xml, origin) {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)]
    .map(([, entry]) => ({
      url: entry.match(/<loc>([^<]+)<\/loc>/)?.[1],
      lastmod: entry.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1],
    }))
    .filter(({ url }) => url && new URL(url).origin === origin);
}

/** The path → date map of an editorial.ts source, as a deploy published it. */
export function editorialDates(source) {
  const block = source.match(/const changes[^{]*\{([\s\S]*?)\}\)/)?.[1];
  if (!block) throw new Error("No editorial changes map in the source");
  return Object.fromEntries(
    [...block.matchAll(/"([^"]*)":\s*"([^"]+)"/g)].map(([, path, date]) => [
      path,
      date,
    ]),
  );
}

/** The page path shared by both languages: /tr/projects → /projects. */
function editorialPath(url) {
  return new URL(url).pathname.replace(/^\/(?:en|tr)(?=\/|$)/, "");
}

/**
 * The URLs to submit. Without a previous deploy's dates every page is new,
 * as on the first deploy; a page without a date is always submitted, since
 * nothing shows it is unchanged.
 */
export function changedUrls(entries, previous) {
  if (!previous) return entries.map(({ url }) => url);
  return entries
    .filter(
      ({ url, lastmod }) =>
        !lastmod || previous[editorialPath(url)] !== lastmod,
    )
    .map(({ url }) => url);
}
