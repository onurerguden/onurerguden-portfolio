# Search and AI visibility

The approved 12 October 2026 brief targets job and project opportunities for
Onur in İzmir, Türkiye, with national and international remote work. The order
is RAG/LLM/agents, AI product engineering, then applied research. It covers the
existing bilingual portfolio. External profile edits, outreach, ongoing blog
publication, paid SEO services and new scheduled jobs are outside this release.

## Evidence and decisions

- The live audit checked 14 editorial sitemap pages: HTTP 200, self-canonical,
  reciprocal en/tr/x-default, indexable HTML, a single H1 and parseable JSON-LD.
  IndexNow and the post-deploy smoke already exist.
- Clear person, role, city and linked personal contributions are the main
  content gaps. Keep the visual system and the current Experience treatment.
  RAG links to Course Intelligence; MCP to GymRap; LangGraph to the verified
  CarbonPilot/experience evidence; products to Kuyumcum and GymRap; evaluation
  to Water Safety and Research.
- The publisher's accepted-articles list is the approved authority for the
  paper's authors. Acceptance is not publication; no DOI or publication date is
  inferred from a portfolio edit. [IJEA publisher](https://dergipark.org.tr/en/pub/ijea).
- AI Search needs accessible, useful, original evidence. Google does not use
  llms.txt as a ranking boost. Maintain the existing Markdown outputs for tools
  without promising retrieval or rankings. [Google guidance, updated 10 July 2026](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).
- Search bot access and model training permission are distinct. Preserve the
  current training policy; audit search access against the providers' current
  bot/IP guidance. A spoofed user agent returning 200 is not proof of access
  from verified crawler IPs. [OpenAI](https://developers.openai.com/api/docs/bots),
  [Anthropic](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler),
  [Perplexity](https://docs.perplexity.ai/docs/resources/perplexity-crawlers).
- No city doorway pages, bought links, prompt-injection instructions, invented
  customer results, age claims, LocalBusiness identity or repetitive AI articles.
  A 2026 graduation can describe early career without disclosing a birth date.

## Release checks

Use Node 24. Run `npm run check`, `npm run format:check` and the affected
Playwright projects. For a production-indexable local build, explicitly set
`SITE_INDEXABLE=true` and `NEXT_PUBLIC_SITE_URL` to the local test origin, build,
then run the SEO smoke against that same origin. Default local/preview builds
remain noindex. Never enable indexing on a hosted preview.

Review both locales at desktop and phone sizes, with keyboard access, reduced
motion and no JavaScript. Check readable identity and evidence, working contact
links, heading structure, focus and no horizontal overflow. Full author names
must not overflow the research layout.

After Onur authorizes the relevant merges and production is deployed:

1. Run `SITE_URL=https://onurerguden.dev npm run smoke:seo`; verify the workflow
   passed before its existing IndexNow submission.
2. Inspect `/tr`, `/en`, `/tr/projects/course-intelligence`,
   `/tr/projects/gymrap-ai-coach` and both Research pages in Search Console.
   Confirm rendered facts, crawl eligibility and selected canonical; request
   re-indexing once for the changed priority pages where appropriate.
3. Confirm sitemap processing and page-specific exclusions. Redirect URLs are
   not editorial pages to index. Do not interpret a delayed coverage report as
   a current live fetch failure.
4. Confirm Search Console > Settings > Search generative AI remains Include.
   It was already Include during the planning audit. [Control documentation](https://support.google.com/webmasters/answer/16908024).
5. Check Bing URL Inspection, sitemap, IndexNow delivery and AI Performance in
   the existing property. Do not recreate the property or send daily unchanged
   URL submissions. IndexNow acceptance is not an indexing guarantee.
6. Review existing Vercel firewall/crawler logs for verified Google, Bing and AI
   search bots. Use current provider IP lists or the host's verified-bot
   classification. Record absent/unavailable logs as unverified; do not weaken
   the firewall for arbitrary requests claiming a bot user agent.
7. Check field p75 LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 when sufficient data
   exists. The previously approved 3D design is reopened only for an evidenced
   regression. Physical Safari checks remain separate from Playwright WebKit.

Rollback a release that makes editorial pages noindex, changes their canonical
origin, removes essential server HTML, breaks contact actions or introduces a
privacy/accessibility regression. Revert the responsible reviewed change and
rerun the smoke. Do not reset production settings or unrelated work.

## Measurement protocol

Keep raw dashboard exports, responses and screenshots in ignored `work/seo/`,
never in this public repository. Record deployment SHA/time and actual report
dates. Export Search Console classic Performance, index coverage and Generative
AI Performance separately; the latter can be absent with insufficient
impressions. Record Bing AI Performance citations, intents and topics separately
from search traffic. [Google report](https://support.google.com/webmasters/answer/16984139),
[Bing report metrics](https://blogs.bing.com/search/2026/6/New-AI-Visibility-Insights-in-Bing-Webmaster-Tools-Intents-Topics-Citation-Share-Compare/).

`prompts.json` version 1 fixes 12 questions in each language. Run each three
times in independent new conversations on ChatGPT Search, Claude web search,
Perplexity and Google AI Mode where available. Turn off memory, use the same
Türkiye/İzmir location context and record the actual model/surface, locale,
timestamp and whether search was used. Do not feed the answer, portfolio link
or Onur's name into unbranded questions. Do not mix API/model-only results with
consumer web-search surfaces.

For each response record name mention, appropriate recommendation, portfolio
citation, citation of independent evidence and fact accuracy separately. Keep
the source URLs and an answer capture privately so a reviewer can verify the
scores. Score facts only when a response makes claims about Onur. Unavailable
surfaces are `unavailable`, not false; pending runs are `pending`, not zero.
The last two branded controls assess identity accuracy and are excluded from
unbranded discovery rates. Report successes/eligible measured responses per
surface and language, with denominators; do not combine repeated runs into
claims of statistically proven lift.

Run before production release, then at release +28, +56 and +90 days. Compare
equal 28-day dashboard periods once available. Keep classic impressions/clicks,
AI impressions/citations, referral visits and contact-intent counts separate.
Email/CV clicks are intent proxies, not delivered messages, job offers or unique
people. Source attribution is a document-entry hint and can be unavailable.

The private baseline seeded from planning contains observed Search Console
aggregate values with their report date. Prompt responses are explicitly
unmeasured until executed; no synthetic successes are entered. If there is no
growth, inspect exclusions and repeated citation-source gaps before adding more
pages. External authority remains a scope limit, not a guarantee that site-only
work can dominate every national query.

## Maintenance

Update `src/lib/editorial.ts` only for significant paired-language editorial
edits. Page dates do not re-date software or the scholarly manuscript. Unknown
creation/modification times stay absent. Maintain the prompt version when
questions change, and start a new measurement series instead of comparing
different question sets as an improvement.
