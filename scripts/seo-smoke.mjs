// Checks the live site the way a crawler sees it: every sitemap page answers
// 200 with its own canonical, hreflang alternates, a description, structured
// data and a share card that loads. Runs after each production deploy
// (.github/workflows/indexnow.yml), before the sitemap is submitted.
//   SITE_URL=https://onurerguden.dev node scripts/seo-smoke.mjs
const origin = new URL(process.env.SITE_URL || "https://onurerguden.dev")
  .origin;
const failures = [];
const fail = (where, what) => failures.push(`${where}: ${what}`);
const get = (path, init) =>
  fetch(new URL(path, origin), {
    redirect: "manual",
    signal: AbortSignal.timeout(20000),
    ...init,
  });
const attr = (html, pattern) => html.match(pattern)?.[1] ?? null;

const home = await get("/");
if (home.status !== 308 || home.headers.get("location") !== "/en")
  fail("/", `expected 308 to /en, got ${home.status}`);

const robots = await (await get("/robots.txt")).text();
if (!robots.includes(`Sitemap: ${origin}/sitemap.xml`))
  fail("/robots.txt", "no Sitemap line for this origin");
if (/^Disallow: \/$/m.test(robots)) fail("/robots.txt", "disallows everything");

const sitemap = await get("/sitemap.xml");
const pages = [
  ...new Set(
    [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (match) => match[1],
    ),
  ),
];
if (!pages.length) fail("/sitemap.xml", "lists no pages");

const cards = new Set();
for (const url of pages) {
  const path = new URL(url).pathname;
  if (new URL(url).origin !== origin) {
    fail(path, `sitemap URL on another origin: ${url}`);
    continue;
  }
  const response = await get(path);
  if (response.status !== 200) {
    fail(path, `answered ${response.status}`);
    continue;
  }
  const html = await response.text();
  // One policy for every response, so pages come from the CDN
  // (src/lib/security.ts): scripts from this origin only.
  const policy = response.headers.get("content-security-policy") ?? "";
  if (!policy.includes("script-src 'self'") || policy.includes("nonce-"))
    fail(path, "unexpected Content-Security-Policy");
  if (!/public|s-maxage/.test(response.headers.get("cache-control") ?? ""))
    fail(path, "not cacheable at the CDN");
  const robotsMeta = attr(html, /<meta name="robots" content="([^"]*)"/);
  if (robotsMeta?.includes("noindex")) fail(path, "is noindex");
  if (attr(html, /<link rel="canonical" href="([^"]*)"/) !== url)
    fail(path, "canonical is not the page's own URL");
  for (const lang of ["en", "tr", "x-default"])
    if (!html.includes(`hrefLang="${lang}"`)) fail(path, `no hreflang ${lang}`);
  if (!attr(html, /<title>([^<]+)<\/title>/)) fail(path, "no title");
  if (!attr(html, /<meta name="description" content="([^"]+)"/))
    fail(path, "no description");
  const ld = attr(
    html,
    /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/,
  );
  try {
    if (!JSON.parse(ld ?? "")["@graph"]?.length) throw new Error();
  } catch {
    fail(path, "no JSON-LD graph");
  }
  const card = attr(html, /<meta property="og:image" content="([^"]+)"/);
  if (!card?.includes("/opengraph-image/card")) fail(path, "no share card");
  else cards.add(card);
  if (!attr(html, /<meta property="og:image:alt" content="([^"]+)"/))
    fail(path, "share card has no alt");
}

for (const card of cards) {
  const url = new URL(card);
  const response = await get(url.pathname + url.search);
  if (
    response.status !== 200 ||
    response.headers.get("content-type") !== "image/png"
  )
    fail(url.pathname, `card answered ${response.status}`);
}

const old = await get("/en/opengraph-image");
if (
  old.status !== 308 ||
  old.headers.get("location") !== "/en/opengraph-image/card"
)
  fail("/en/opengraph-image", `expected 308 to the card, got ${old.status}`);

const missing = await get("/en/no-such-page");
if (missing.status !== 404)
  fail("/en/no-such-page", `answered ${missing.status}, not 404`);

for (const path of ["/llms.txt", "/llms-full.txt", "/.well-known/security.txt"])
  if ((await get(path)).status !== 200) fail(path, "is missing");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(
  `SEO smoke passed: ${pages.length} pages, ${cards.size} share cards.`,
);
