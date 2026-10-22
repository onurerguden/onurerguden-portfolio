import {
  auditPage,
  blockedRobotsTokens,
  crawlerAgents,
  editorialSignature,
  expectedAlternates,
} from "./seo/audit-page.mjs";

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

const robotsResponse = await get("/robots.txt");
if (robotsResponse.status !== 200)
  fail("/robots.txt", `answered ${robotsResponse.status}`);
const robots = await robotsResponse.text();
if (!robots.includes(`Sitemap: ${origin}/sitemap.xml`))
  fail("/robots.txt", "no Sitemap line for this origin");
if (/^Disallow: \/$/m.test(robots)) fail("/robots.txt", "disallows everything");
for (const token of blockedRobotsTokens(robots))
  fail("/robots.txt", `shuts ${token} out of the whole site`);

const sitemap = await get("/sitemap.xml");
if (sitemap.status !== 200) fail("/sitemap.xml", `answered ${sitemap.status}`);
const pages = [
  ...new Set(
    [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (match) => match[1],
    ),
  ),
];
if (!pages.length) fail("/sitemap.xml", "lists no pages");

const editorial = new Map();
const cards = new Set();
const icons = new Set(["/favicon.ico"]);
for (const url of pages) {
  const path = new URL(url).pathname;
  if (new URL(url).origin !== origin) {
    fail(path, `sitemap URL on another origin: ${url}`);
    continue;
  }
  for (const alternate of Object.values(expectedAlternates(url))) {
    if (!pages.includes(alternate))
      fail(path, `language alternate missing from sitemap: ${alternate}`);
  }
  const response = await get(path);
  if (response.status !== 200) {
    fail(path, `answered ${response.status}`);
    continue;
  }
  const html = await response.text();
  const iconLinks = html.match(/<link\b[^>]*\brel="icon"[^>]*>/g) ?? [];
  if (
    !iconLinks.some(
      (link) =>
        link.includes('href="/favicon-96.png"') &&
        link.includes('type="image/png"') &&
        link.includes('sizes="96x96"'),
    )
  )
    fail(path, "no stable 96x96 PNG favicon for search");
  for (const link of iconLinks) {
    const href = attr(link, /href="([^"]+)"/);
    if (href) icons.add(href.replaceAll("&amp;", "&"));
  }
  // One policy for every response, so pages come from the CDN
  // (src/lib/security.ts): scripts from this origin only.
  const policy = response.headers.get("content-security-policy") ?? "";
  if (!policy.includes("script-src 'self'") || policy.includes("nonce-"))
    fail(path, "unexpected Content-Security-Policy");
  if (!/public|s-maxage/.test(response.headers.get("cache-control") ?? ""))
    fail(path, "not cacheable at the CDN");
  const { failures: semanticFailures } = auditPage(
    html,
    url,
    Object.fromEntries(response.headers),
  );
  for (const problem of semanticFailures) fail(path, problem);
  editorial.set(path, editorialSignature(html));
  const card = attr(html, /<meta property="og:image" content="([^"]+)"/);
  if (!card?.includes("/opengraph-image/card")) fail(path, "no share card");
  else cards.add(card);
  if (!attr(html, /<meta property="og:image:alt" content="([^"]+)"/))
    fail(path, "share card has no alt");
}

// Representative fetches, never IP verification: a successful UA response
// cannot prove that a provider's real crawler has visited or passed the WAF.
const casePath = [...editorial.keys()].find((path) =>
  /^\/en\/projects\/[^/]+$/.test(path),
);
for (const path of ["/en", "/tr", ...(casePath ? [casePath] : [])]) {
  const baseline = editorial.get(path);
  if (!baseline) {
    fail(path, "missing representative crawler page");
    continue;
  }
  const checks = await Promise.allSettled(
    crawlerAgents.map(async (agent) => {
      const response = await get(path, { headers: { "User-Agent": agent } });
      if (response.status !== 200) {
        fail(`${agent} ${path}`, `answered ${response.status}`);
        return;
      }
      const html = await response.text();
      for (const problem of auditPage(
        html,
        `${origin}${path}`,
        Object.fromEntries(response.headers),
      ).failures)
        fail(`${agent} ${path}`, problem);
      if (JSON.stringify(editorialSignature(html)) !== JSON.stringify(baseline))
        fail(
          `${agent} ${path}`,
          "editorial metadata, graph or content differs from the normal response",
        );
    }),
  );
  checks.forEach((result, index) => {
    if (result.status === "rejected")
      fail(`${crawlerAgents[index]} ${path}`, "crawler request failed");
  });
}

for (const icon of icons) {
  const response = await get(icon);
  if (
    response.status !== 200 ||
    !response.headers.get("content-type")?.startsWith("image/")
  ) {
    fail(icon, `favicon answered ${response.status} or is not an image`);
    continue;
  }
  if (/\b(?:noindex|none)\b/i.test(response.headers.get("x-robots-tag") ?? ""))
    fail(icon, "favicon is noindex");
  if (icon === "/favicon-96.png") {
    const bytes = new DataView(await response.arrayBuffer());
    if (
      bytes.byteLength < 24 ||
      bytes.getUint32(0) !== 0x89504e47 ||
      bytes.getUint32(4) !== 0x0d0a1a0a ||
      bytes.getUint32(16) !== 96 ||
      bytes.getUint32(20) !== 96
    )
      fail(icon, "favicon is not a 96x96 PNG");
    if (response.headers.get("cache-control")?.includes("immutable"))
      fail(icon, "stable favicon must revalidate");
  }
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

for (const path of ["/en/lab/desk", "/tr/lab/desk"]) {
  const response = await get(path);
  if (
    response.status !== 404 ||
    !/\bnoindex\b/i.test(response.headers.get("x-robots-tag") ?? "")
  )
    fail(path, "production lab must be 404 and HTTP noindex");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(
  `SEO smoke passed: ${pages.length} pages, ${cards.size} share cards, ${icons.size} favicon URLs.`,
);
