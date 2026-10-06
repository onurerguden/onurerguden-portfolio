// Tells Bing, Yandex and the other IndexNow engines about every page in the
// live sitemap, after each production deploy (.github/workflows/indexnow.yml).
// The key is public by design: the engines confirm ownership by fetching it
// from the site, at /<key>.txt (public/).
import { readdirSync } from "node:fs";

const origin = new URL(process.env.SITE_URL || "https://onurerguden.dev")
  .origin;
const [keyFile] = readdirSync("public").filter((name) =>
  /^[0-9a-f]{32}\.txt$/.test(name),
);
if (!keyFile) throw new Error("No IndexNow key file in public/");
const key = keyFile.slice(0, -4);

const sitemap = await fetch(`${origin}/sitemap.xml`);
if (!sitemap.ok) throw new Error(`sitemap.xml answered ${sitemap.status}`);
const urlList = [
  ...new Set(
    [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (match) => match[1],
    ),
  ),
].filter((url) => new URL(url).origin === origin);
if (!urlList.length) throw new Error("The sitemap lists no pages");

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: new URL(origin).host,
    key,
    keyLocation: `${origin}/${keyFile}`,
    urlList,
  }),
});
// 200 and 202 both mean accepted; 202 while the key is still being checked.
if (response.status !== 200 && response.status !== 202)
  throw new Error(
    `IndexNow answered ${response.status}: ${await response.text()}`,
  );
console.log(`IndexNow accepted ${urlList.length} URLs (${response.status})`);
