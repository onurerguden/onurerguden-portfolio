import { describe, expect, it } from "vitest";
import { auditPage, editorialSignature } from "../scripts/seo/audit-page.mjs";

const origin = "https://portfolio.example";
const url = `${origin}/tr`;
const person = {
  "@type": "Person",
  "@id": `${origin}/#person`,
  name: "Onur Ergüden",
  jobTitle: "AI mühendisi",
  homeLocation: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressLocality: "İzmir",
      addressCountry: "TR",
    },
  },
};
const graph = [
  {
    "@type": "ProfilePage",
    "@id": `${url}#page`,
    url,
    inLanguage: "tr",
    isPartOf: { "@id": `${origin}/#website` },
    author: { "@id": person["@id"] },
    mainEntity: { "@id": person["@id"] },
  },
  { "@type": "WebSite", "@id": `${origin}/#website` },
  person,
];
function html(nodes: unknown[] = graph) {
  return `<!doctype html><html lang="tr"><head>
    <title>Onur Ergüden</title><meta content="A verified profile" name="description">
    <meta content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" name="robots">
    <link href='${url}' rel='canonical'>
    <link hrefLang="en" href="${origin}/en" rel="alternate">
    <link hrefLang="tr" href="${url}" rel="alternate">
    <link hrefLang="x-default" href="${origin}/en" rel="alternate">
    <script type="application/ld+json">${JSON.stringify({ "@graph": nodes })}</script>
    </head><body><main><h1><span>Onur</span><span>Ergüden</span></h1>
    <p>AI mühendisi · İzmir</p><p>LLM systems &amp; evaluation</p></main></body></html>`;
}
const audit = (value: string, headers: Record<string, string> = {}) =>
  auditPage(value, url, headers).failures;

describe("crawler HTML semantics", () => {
  it("accepts valid identity without depending on attribute order or quote style", () => {
    expect(audit(html())).toEqual([]);
  });
  it("rejects duplicate canonicals and incorrect reciprocal alternate targets", () => {
    expect(
      audit(
        html().replace(
          "</head>",
          `<link rel="canonical" href="${url}"></head>`,
        ),
      ),
    ).toContain("expected one self canonical");
    expect(
      audit(
        html().replace(`href="${origin}/en"`, `href="${origin}/en/research"`),
      ),
    ).toContain("incorrect or duplicate hreflang en");
    expect(
      audit(
        html().replace(
          "</head>",
          `<link rel="alternate" hrefLang="tr" href="${url}"></head>`,
        ),
      ),
    ).toContain("incorrect or duplicate hreflang tr");
  });
  it("honors HTTP and crawler-specific HTML noindex, including none", () => {
    expect(audit(html(), { "x-robots-tag": "googlebot: noindex" })).toContain(
      "page is noindex in HTML or HTTP headers",
    );
    expect(
      audit(
        html().replace(
          "</head>",
          '<meta name="googlebot" content="none"></head>',
        ),
      ),
    ).toContain("page is noindex in HTML or HTTP headers");
    expect(
      auditPage(
        html().replace("index, follow", "noindex, nofollow"),
        url,
        {},
        { indexable: false },
      ).failures,
    ).toEqual([]);
    expect(auditPage(html(), url, {}, { indexable: false }).failures).toContain(
      "preview page is not noindex",
    );
  });
  it("rejects broken graph ownership and missing content rather than counting JSON keys", () => {
    const changed = graph.map((node, index) =>
      index === 0
        ? { ...node, author: { "@id": `${origin}/#somebody-else` } }
        : node,
    );
    expect(audit(html(changed))).toContain(
      "page graph does not link its canonical, website and author",
    );
    expect(audit(html().replace("<p>AI mühendisi · İzmir</p>", ""))).toContain(
      "Person identity is missing from HTML content",
    );
    expect(audit(html().replace("<p>AI mühendisi · İzmir</p>", ""))).toContain(
      "Person city is missing from HTML content",
    );
    expect(
      audit(html().replace("<h1>", "<h2>").replace("</h1>", "</h2>")),
    ).toContain("expected one main h1");
    expect(audit(html().replace('"@graph":', '"broken":'))).toContain(
      "no valid JSON-LD graph",
    );
  });
  it("checks public city semantics without requiring a private address", () => {
    expect(
      audit(
        html(
          graph.map((entry, index) =>
            index === 2 ? { ...person, homeLocation: undefined } : entry,
          ),
        ),
      ),
    ).toContain("Person is missing its verified homeLocation");
    const wrong = graph.map((node, index) =>
      index === 2
        ? {
            ...person,
            homeLocation: {
              "@type": "Place",
              address: { addressLocality: "Ankara", addressCountry: "TR" },
            },
          }
        : node,
    );
    expect(audit(html(wrong))).toContain(
      "homeLocation must describe İzmir, TR as a Place",
    );
    expect(audit(html())).toEqual([]);
  });
  it("detects crawler editorial differences and ignores non-editorial transport changes", () => {
    expect(editorialSignature(html())).not.toEqual(
      editorialSignature(
        html().replace("<p>LLM systems &amp; evaluation</p>", ""),
      ),
    );
    expect(editorialSignature(html())).not.toEqual(
      editorialSignature(
        html().replace(
          "</main>",
          '<a href="/tr/projects/course-intelligence">Evidence</a></main>',
        ),
      ),
    );
    expect(editorialSignature(html())).toEqual(
      editorialSignature(
        html().replace("</body>", "<script>activity=1456</script></body>"),
      ),
    );
    expect(editorialSignature(html())).not.toEqual(
      editorialSignature(
        html().replace(
          "<title>Onur Ergüden</title>",
          "<title>Different for bots</title>",
        ),
      ),
    );
  });
  it("rejects page-wide snippet and grounding exclusions in HTML and HTTP", () => {
    for (const directive of [
      "nosnippet",
      "max-snippet: 0",
      "noarchive",
      "nocache",
    ]) {
      expect(
        audit(html(), { "x-robots-tag": `bingbot: ${directive}` }),
      ).toContain("page restricts search snippets or AI grounding");
      expect(
        audit(html().replace("index, follow", `index, follow, ${directive}`)),
      ).toContain("page restricts search snippets or AI grounding");
    }
  });
  it("requires indexed pages to allow full text and large image previews", () => {
    for (const directive of [", max-snippet:-1", ", max-image-preview:large"])
      expect(audit(html().replace(directive, ""))).toContain(
        "page does not allow full text and large image previews",
      );
    expect(
      auditPage(
        html().replace(/content="index[^"]*"/, 'content="noindex, nofollow"'),
        url,
        {},
        { indexable: false },
      ).failures,
    ).toEqual([]);
  });
});

it("requires a case study's represented work and creator to match its page", () => {
  const caseUrl = `${url}/projects/sample`;
  const work = {
    "@type": "CreativeWork",
    "@id": `${caseUrl}#work`,
    name: "Sample app",
    creator: { "@id": person["@id"] },
  };
  const nodes = [
    {
      ...graph[0],
      "@type": "WebPage",
      "@id": `${caseUrl}#page`,
      url: caseUrl,
      mainEntity: { "@id": work["@id"] },
    },
    work,
  ];
  const document = html(nodes)
    .replace(`href='${url}'`, `href='${caseUrl}'`)
    .replace(`hrefLang="tr" href="${url}"`, `hrefLang="tr" href="${caseUrl}"`)
    .replaceAll(`href="${origin}/en"`, `href="${origin}/en/projects/sample"`)
    .replace("<main>", "<main><p>Sample app</p>");
  expect(auditPage(document, caseUrl).failures).toEqual([]);
  const wrong = document.replace(
    JSON.stringify(work),
    JSON.stringify({
      ...work,
      creator: { "@id": `${origin}/#different-person` },
    }),
  );
  expect(auditPage(wrong, caseUrl).failures).toContain(
    "case work is missing or has a different creator",
  );
});

it("checks scholarly authors and publisher links against the HTML content", () => {
  const article = {
    "@type": "ScholarlyArticle",
    headline: "Verified water research",
    author: [
      { "@id": person["@id"] },
      { "@type": "Person", name: "Example Coauthor" },
    ],
    url: "https://publisher.example/record",
    isPartOf: {
      "@type": "Periodical",
      url: "https://publisher.example/journal",
    },
  };
  const nodes = [
    { ...graph[0], "@type": "CollectionPage", mainEntity: undefined },
    article,
  ];
  const document = html(nodes).replace(
    "<main>",
    '<main><p>Verified water research · Example Coauthor</p><a href="https://publisher.example/record">Publisher</a><a href="https://publisher.example/journal">Accepted listing</a>',
  );
  expect(audit(document)).toEqual([]);
  expect(audit(document.replace(" · Example Coauthor", ""))).toContain(
    "paper author is missing from HTML content",
  );
  expect(
    audit(
      document.replace(
        '<a href="https://publisher.example/record">Publisher</a>',
        "",
      ),
    ),
  ).toContain("paper publisher record is missing from HTML links");
  expect(
    audit(
      document.replace(
        '<a href="https://publisher.example/journal">Accepted listing</a>',
        "",
      ),
    ),
  ).toContain("paper publisher listing is missing from HTML links");
});
