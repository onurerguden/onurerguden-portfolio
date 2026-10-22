// Tells Bing, Yandex and the other IndexNow engines about the pages a
// production deploy changed (.github/workflows/indexnow.yml). The workflow
// passes the previous production deploy's commit; its editorial dates show
// which pages are unchanged. Without it, every page in the sitemap is sent.
// The key is public by design: the engines confirm ownership by fetching it
// from the site, at /<key>.txt (public/).
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import {
  changedUrls,
  editorialDates,
  sitemapEntries,
} from "./seo/indexnow-core.mjs";

const origin = new URL(process.env.SITE_URL || "https://onurerguden.dev")
  .origin;
const [keyFile] = readdirSync("public").filter((name) =>
  /^[0-9a-f]{32}\.txt$/.test(name),
);
if (!keyFile) throw new Error("No IndexNow key file in public/");
const key = keyFile.slice(0, -4);

const sitemap = await fetch(`${origin}/sitemap.xml`);
if (!sitemap.ok) throw new Error(`sitemap.xml answered ${sitemap.status}`);
const entries = sitemapEntries(await sitemap.text(), origin);
if (!entries.length) throw new Error("The sitemap lists no pages");

let previous;
const previousSha = process.env.INDEXNOW_PREVIOUS_SHA;
if (previousSha) {
  try {
    previous = editorialDates(
      execFileSync("git", ["show", `${previousSha}:src/lib/editorial.ts`], {
        encoding: "utf8",
      }),
    );
  } catch (error) {
    console.warn(
      `No editorial dates at ${previousSha}; submitting every page. ${error.message}`,
    );
  }
}
const urlList = [...new Set(changedUrls(entries, previous))];
if (!urlList.length) {
  console.log(`No page changed since ${previousSha}; nothing to submit.`);
  process.exit(0);
}

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
console.log(
  `IndexNow accepted ${urlList.length} of ${entries.length} URLs (${response.status}):\n${urlList.join("\n")}`,
);
