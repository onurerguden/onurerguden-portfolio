// Fails the build check when a page that should be built ahead is rendered
// per request instead. Pages are served from the CDN only while they are
// static: a header read, a nonce or an uncached fetch in a page would make
// every visit wait for a function in one region again.
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(
  await readFile(".next/prerender-manifest.json", "utf8"),
);
const built = new Set(Object.keys(manifest.routes));
const pages = ["en", "tr"].flatMap((locale) => [
  `/${locale}`,
  `/${locale}/projects`,
  `/${locale}/research`,
  `/${locale}/projects/kuyumcum`,
]);
const missing = pages.filter((page) => !built.has(page));
if (missing.length) {
  console.error(`Not built ahead: ${missing.join(", ")}`);
  process.exit(1);
}
console.log(`Built ahead: ${pages.length} pages checked.`);
