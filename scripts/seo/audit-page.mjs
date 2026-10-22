// Small, dependency-free checks for this site's generated HTML. This is not an
// HTML sanitizer or a substitute for a rendered browser/accessibility review.
export function decodeHtml(value) {
  const named = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };
  return value.replace(
    /&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi,
    (all, key) => {
      if (!key.startsWith("#")) return named[key.toLowerCase()] ?? all;
      const number =
        key[1].toLowerCase() === "x"
          ? parseInt(key.slice(2), 16)
          : Number(key.slice(1));
      return number <= 0x10ffff ? String.fromCodePoint(number) : all;
    },
  );
}

export function attributes(tag) {
  return Object.fromEntries(
    [
      ...tag
        .replace(/^<[\w:-]+/, "")
        .matchAll(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g),
    ].map((match) => [
      match[1].toLowerCase(),
      decodeHtml(match[2] ?? match[3]),
    ]),
  );
}
const tags = (html, tag) =>
  [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "gi"))].map((match) =>
    attributes(match[0]),
  );
const text = (html) =>
  decodeHtml(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
const comparable = (value) =>
  value.normalize("NFKC").toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();
const contains = (haystack, needle) =>
  comparable(haystack).includes(comparable(needle));
const reference = (node) => node?.["@id"];
const hasType = (node, type) => [node?.["@type"]].flat().includes(type);

export function expectedAlternates(url) {
  const parsed = new URL(url);
  const match = parsed.pathname.match(/^\/(en|tr)(\/.*)?$/);
  if (!match) throw new Error(`Not a localized editorial URL: ${url}`);
  return Object.fromEntries(
    ["en", "tr", "x-default"].map((language) => [
      language,
      `${parsed.origin}/${language === "x-default" ? "en" : language}${match[2] ?? ""}`,
    ]),
  );
}

export function inspectPage(html) {
  const links = tags(html, "link");
  const meta = tags(html, "meta");
  const graphs = [];
  let invalidJsonLd = false;
  for (const match of html.matchAll(
    /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
  )) {
    if (attributes(`<script ${match[1]}>`).type !== "application/ld+json")
      continue;
    try {
      const data = JSON.parse(match[2]);
      if (!Array.isArray(data["@graph"]) || !data["@graph"].length)
        invalidJsonLd = true;
      else graphs.push(...data["@graph"]);
    } catch {
      invalidJsonLd = true;
    }
  }
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? "";
  return {
    canonical: links
      .filter((link) => link.rel === "canonical")
      .map((link) => link.href),
    alternates: links.filter(
      (link) => link.rel === "alternate" && link.hreflang,
    ),
    title: text(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ""),
    description: meta.find((item) => item.name === "description")?.content,
    robots: meta
      .filter((item) => /^(?:robots|googlebot|bingbot)$/i.test(item.name ?? ""))
      .map((item) => item.content ?? ""),
    h1Count: [...main.matchAll(/<h1\b/gi)].length,
    mainText: text(main),
    graph: graphs,
    invalidJsonLd,
    contentLinks: tags(main, "a").map((link) => link.href),
  };
}

export function auditPage(html, url, headers = {}, { indexable = true } = {}) {
  const page = inspectPage(html);
  const failures = [];
  const origin = new URL(url).origin;
  const personId = `${origin}/#person`;
  const websiteId = `${origin}/#website`;
  if (page.canonical.length !== 1 || page.canonical[0] !== url)
    failures.push("expected one self canonical");
  for (const [language, href] of Object.entries(expectedAlternates(url))) {
    const matches = page.alternates.filter(
      (item) => item.hreflang === language,
    );
    if (matches.length !== 1 || matches[0].href !== href)
      failures.push(`incorrect or duplicate hreflang ${language}`);
  }
  if (!page.title) failures.push("no title");
  if (!page.description) failures.push("no description");
  if (page.h1Count !== 1) failures.push("expected one main h1");
  const headerRobots = headers["x-robots-tag"] ?? "";
  const blocked = [...page.robots, headerRobots].some((value) =>
    /\b(?:noindex|none)\b/i.test(value),
  );
  if (indexable && blocked)
    failures.push("page is noindex in HTML or HTTP headers");
  if (
    indexable &&
    [...page.robots, headerRobots].some((value) =>
      /\b(?:nosnippet|noarchive|nocache)\b|\bmax-snippet\s*:\s*0\b/i.test(
        value,
      ),
    )
  )
    failures.push("page restricts search snippets or AI grounding");
  if (
    indexable &&
    !page.robots.some(
      (value) =>
        /\bmax-snippet\s*:\s*-1\b/i.test(value) &&
        /\bmax-image-preview\s*:\s*large\b/i.test(value),
    )
  )
    failures.push("page does not allow full text and large image previews");
  if (!indexable && !blocked) failures.push("preview page is not noindex");
  if (page.invalidJsonLd || !page.graph.length)
    failures.push("no valid JSON-LD graph");
  const node = page.graph.find((item) => reference(item) === `${url}#page`);
  if (
    !node ||
    node.url !== url ||
    reference(node.isPartOf) !== websiteId ||
    reference(node.author) !== personId
  )
    failures.push("page graph does not link its canonical, website and author");
  if (node?.inLanguage !== new URL(url).pathname.split("/")[1])
    failures.push("graph language differs from page URL");
  if (node && hasType(node, "ProfilePage")) {
    const person = page.graph.find(
      (item) => reference(item) === personId && hasType(item, "Person"),
    );
    if (!person || reference(node.mainEntity) !== personId)
      failures.push("profile mainEntity is not the shared Person");
    if (
      !page.graph.some(
        (item) => reference(item) === websiteId && hasType(item, "WebSite"),
      )
    )
      failures.push("profile is missing its WebSite");
    for (const fact of [person?.name, person?.jobTitle]) {
      if (typeof fact !== "string" || !contains(page.mainText, fact))
        failures.push("Person identity is missing from HTML content");
    }
    for (const profile of person?.sameAs ?? []) {
      if (typeof profile !== "string" || !page.contentLinks.includes(profile))
        failures.push("Person public profile is missing from HTML links");
    }
    if (!person?.homeLocation)
      failures.push("Person is missing its verified homeLocation");
    else {
      const place = person.homeLocation;
      if (
        !hasType(place, "Place") ||
        place.address?.addressLocality !== "İzmir" ||
        place.address?.addressCountry !== "TR"
      )
        failures.push("homeLocation must describe İzmir, TR as a Place");
      if (!contains(page.mainText, "İzmir"))
        failures.push("Person city is missing from HTML content");
    }
  }
  if (
    node?.mainEntity &&
    !hasType(node, "ProfilePage") &&
    reference(node.mainEntity)
  ) {
    const work = page.graph.find(
      (item) => reference(item) === reference(node.mainEntity),
    );
    if (!work || reference(work.creator) !== personId)
      failures.push("case work is missing or has a different creator");
    if (
      work &&
      typeof work.name === "string" &&
      !contains(page.mainText, work.name)
    )
      failures.push("case work name is missing from HTML content");
  }
  for (const article of page.graph.filter((item) =>
    hasType(item, "ScholarlyArticle"),
  )) {
    if (
      typeof article.headline !== "string" ||
      !contains(page.mainText, article.headline)
    )
      failures.push("paper headline is missing from HTML content");
    if (
      !Array.isArray(article.author) ||
      !article.author.some((author) => reference(author) === personId)
    )
      failures.push("paper does not credit the shared Person");
    for (const author of Array.isArray(article.author) ? article.author : []) {
      if (
        typeof author?.name === "string" &&
        !contains(page.mainText, author.name)
      )
        failures.push("paper author is missing from HTML content");
    }
    if (
      typeof article.url === "string" &&
      !page.contentLinks.includes(article.url)
    )
      failures.push("paper publisher record is missing from HTML links");
    if (
      typeof article.isPartOf?.url === "string" &&
      !page.contentLinks.includes(article.isPartOf.url)
    )
      failures.push("paper publisher listing is missing from HTML links");
  }
  return { failures, page };
}

// Compare server-rendered main prose and links too: matching metadata alone
// cannot catch a bot-specific response that removes capabilities or evidence.
// Client-fetched activity, scripts and transport details are not main prose.
export function editorialSignature(html) {
  const {
    canonical,
    alternates,
    title,
    description,
    h1Count,
    graph,
    mainText,
    contentLinks,
  } = inspectPage(html);
  return {
    canonical,
    alternates,
    title,
    description,
    h1Count,
    graph,
    mainText,
    contentLinks,
  };
}

export const crawlerAgents = [
  "Googlebot",
  "bingbot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "Claude-SearchBot",
  "Claude-User",
  "ClaudeBot",
  "PerplexityBot",
  "Perplexity-User",
  "Applebot",
];

// Product tokens that only robots.txt reads: Gemini grounding and training
// (Google-Extended), Apple Intelligence training, and the search and AI bots
// above. None of them may be shut out of the whole site.
export const robotsTokens = [
  ...crawlerAgents,
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "meta-externalagent",
];

/**
 * The tokens a robots.txt shuts out of the whole site, through a group that
 * names them or the `*` group they fall back to (RFC 9309: a bot obeys only
 * the most specific group that matches it).
 */
export function blockedRobotsTokens(robotsTxt, tokens = robotsTokens) {
  const groups = [];
  let current;
  for (const raw of robotsTxt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const [, field, value = ""] = line.match(/^([\w-]+)\s*:\s*(.*)$/) ?? [];
    if (!field) continue;
    if (/^user-agent$/i.test(field)) {
      if (!current || current.rules.length) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (current && /^(?:allow|disallow)$/i.test(field)) {
      current.rules.push({ allow: /^allow$/i.test(field), path: value });
    }
  }
  const blocksAll = (group) =>
    group.rules.some((rule) => !rule.allow && rule.path === "/") &&
    !group.rules.some((rule) => rule.allow && rule.path === "/");
  return tokens.filter((token) => {
    const named = groups.filter((group) =>
      group.agents.includes(token.toLowerCase()),
    );
    const applicable = named.length
      ? named
      : groups.filter((group) => group.agents.includes("*"));
    return applicable.some(blocksAll);
  });
}
