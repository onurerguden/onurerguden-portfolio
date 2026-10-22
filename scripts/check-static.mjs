// Fails the build check when a page that should be built ahead is rendered
// per request instead. Pages are served from the CDN only while they are
// static: a header read, a nonce or an uncached fetch in a page would make
// every visit wait for a function in one region again.
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(
  await readFile(".next/prerender-manifest.json", "utf8"),
);
const built = new Set(Object.keys(manifest.routes));
// Every page the sitemap offers search engines, as this build generated it.
const sitemap = await readFile(".next/server/app/sitemap.xml.body", "utf8");
const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  ([, url]) => new URL(url).pathname,
);
if (!pages.length) {
  console.error("The built sitemap lists no pages.");
  process.exit(1);
}
const missing = pages.filter((page) => !built.has(page));
if (missing.length) {
  console.error(`Not built ahead: ${missing.join(", ")}`);
  process.exit(1);
}
console.log(`Built ahead: ${pages.length} pages checked.`);
