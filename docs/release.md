# Release checklist

## External inputs

- [x] CI is active (4 October 2026): `.github/workflows/ci.yml` checks formatting, types, lint, unit tests, the production build and each Playwright project on every pull request and on `main`.
- [x] Vercel project linked; production deploys from `main`, every pull request gets a preview (6 October 2026).
- [x] Onur supplied Kuyumcum screenshots. Merchant map and AI report list are included; balance/holdings screens are excluded.
- [ ] Onur supplies updated publication-ready CV (July file has outdated publication status and personal phone).
- [ ] Confirm per-project contribution details and current LinkedIn text against drafts.
- [x] Own Vercel project and Upstash Redis (production only); secrets set in Vercel, not in source (6 October 2026).
- [x] Webhooks on the public repositories and the daily 03:00 UTC reconciliation (6 October 2026).
- [x] Domain `onurerguden.dev` connected, `www` redirects to the apex; `NEXT_PUBLIC_SITE_URL=https://onurerguden.dev` (6 October 2026).
- [x] Vercel Speed Insights enabled (6 October 2026). Field p75 metrics remain unmeasured until sufficient visits exist.
- [ ] Confirm actual iOS Safari on a physical device, not just Playwright WebKit.
- [x] `SITE_INDEXABLE=true` on production only (6 October 2026).
- [x] Bliss: Onur chose the original Microsoft photograph with a visible credit and accepts the republication risk (29 September 2026, see docs/bliss.md). Revisit if Microsoft objects; the pipeline can swap the source.

## S+ home page inputs

- [ ] Onur reviews the About paragraph and the five What I do rows (EN/TR), including the basketball and tennis line.
- [ ] Onur confirms the technology list in `src/content/tech-stack.json`.
- [x] Onur supplied the certificates (4 October 2026). Six selected education credentials passed `npm run certificate` and personal-data review; openHPI emails are omitted from the public raster images. See `docs/qa/selected-certificates/README.md` for the selection and source review.
- [x] Course Intelligence: the unconfirmed "100% on the quantitative set" sentence was removed (2 October 2026); the case study now describes the evaluation approach. The repository's own 5 / 4 / 1 rating can be added later with Onur's approval.
- [ ] Optional: TaskFoo and ScoreStack screenshots for the archive card.
- [x] Vercel: `GITHUB_TOKEN` (fine-grained, public read-only) and Upstash credentials; first sync matched the GitHub profile totals (6 October 2026).
- [x] Local GitHub connection verified with Onur's authenticated CLI (4 October 2026): real contribution calendars, public events and public repository metadata, refreshed by `npm run preview:github`. Credentials are kept in the sync process's memory; hosted configuration above remains pending. See `docs/qa/github-connected/README.md`.
- [x] Compact GitHub panels and certificate paper stacks verified (4 October 2026): three metrics/languages/updates, equal panel bounds, genuine percentages and six complete document images. EN/TR desktop/mobile Chromium and mobile WebKit, keyboard, motion preferences and axe checks passed. See `docs/qa/github-certificates-polish/README.md`.
- [ ] Physical iPhone Safari pass: About objects, balls, desk release and restore, memory and context loss.

## Desk story (October 2026)

- [x] Onur approved the desk-story plan and its copy (`docs/content-review.md`), and asked for each PR to be merged once checked (2 October 2026).
- [x] The AVIF opening portrait passed its gate (PSNR 43.28 dB at the same 1254 px) and replaced the WebP for browsers that support it; the WebP stays as the fallback.
- [x] The opening portrait comes in two widths (review 02, 11 October 2026): 1080 px for 1x desktops and phones up to 2.6x, 1254 px for 3x phones and 2x desktops, AVIF with a lossy WebP fallback (1,076,728 → 233,608 bytes). The lossless master moved to `assets/avatar/`. Each file keeps at least 42 dB as seen over the page background; captures of the opening differ from before by 47 dB at 1440 × 900 and 375 × 812. A 640 px file was tried and dropped: resized ahead, it looked softer on a 1x desktop than the browser's own reduction.
- [ ] Physical iPhone Safari pass for the desk story: monitor reading, MacBook takeover, balls, two contexts, context loss, LinkedIn in-app browser.

## Final polish (October 2026)

- [x] Open PRs #39–#43 merged into `main` (4 October 2026); tree identical to their stack.
- [x] CI active on every pull request and `main` (PR 01).
- [x] Onur approved the corrected facts (PR 02) and the AI work copy (PR 07) in `docs/content-review.md` (5 October 2026).
- [x] Onur approved the technologies added from his organizations' repositories (PR 11, `docs/content-review.md`; 5 October 2026).
- [x] Onur approved the visual gates on 5 October 2026: desk controls (PR 04), portrait framing (PR 05), studio About (PR 06), section sheets (PR 08, reduced to About → Projects after his review), paper curtain (PR 09) and the smaller tech stack windows (PR 11). Captures: `docs/qa/final-polish/`.
- [x] The Kuyumcum team approved publishing `kuyumcum_ai_workflow_chart.png` (5 October 2026); it is in the case study's "Multi-agent reports" section with a step-by-step text equivalent (PR 12). Onur approved its copy, the error page and the manifest text the same day.
- [x] Icons and error pages (PR 12): `favicon.ico`, Apple touch icon, web manifest, and localized error pages for a failed page or root layout.
- [ ] Physical iPhone Safari pass: hint, sheets (off on phones), About objects, curtain (off on phones), two WebGL contexts.

## Deploy readiness (next step, outside this series)

1. Create the Vercel project from this repository; production branch `main`.
2. Set, before the first production build (robots, sitemap and canonical URLs are rendered at build time): `NEXT_PUBLIC_SITE_URL` (canonical HTTPS origin) and, on production only, `SITE_INDEXABLE=true`. Previews keep it unset.
3. Server-only secrets: `GITHUB_TOKEN` (fine-grained, public read-only), Upstash Redis URL and token, `CRON_SECRET`, `GITHUB_WEBHOOK_SECRET`, optionally `CRON_HEARTBEAT_URL` (see `docs/github-sync.md`). Separate Redis for previews.
4. Domain: add it in Vercel, then point DNS; HSTS is already sent (no preload).
5. After the first deploy: call `/api/cron/github` once, add the repository webhooks, check the activity totals against the GitHub profile, enable Speed Insights.
6. Lab routes return 404 in production (`VERCEL_ENV=production` or `SITE_INDEXABLE=true`) and always send `X-Robots-Tag: noindex`.

## SEO and GEO (October 2026)

- **Titles and cards.** The home page title leads with my name, role and approved location (`Onur Ergüden — AI engineer in İzmir: LLM apps, RAG and agents` / `Onur Ergüden — İzmir’de yapay zekâ mühendisi: LLM, RAG ve ajanlar`); other pages keep `Page | Onur Ergüden`, with descriptive search titles for the four featured cases. Open Graph and X cards carry the full title and always use the large image. Each page has one card at `…/opengraph-image/card` (and `…/twitter-image/card`), with alt text in the page's language. Cards are rendered on their first request and then cached, not at build time. The old addresses without `/card` answer 308 to the card.
- **Smoke test.** After each production deploy, `scripts/seo-smoke.mjs` checks every sitemap page as a crawler sees it (200, own canonical, hreflang, description, JSON-LD, a loading share card), plus the `/` redirect, robots.txt (no search or AI token, Google-Extended included, shut out of the site), a real 404 and the old card addresses; indexed pages must allow full snippets and large image previews; IndexNow runs only if it passes. Run it by hand with `SITE_URL=https://onurerguden.dev npm run smoke:seo`.
- **Structured data** (`src/lib/structured-data.ts`). One graph per page, linked by `@id`: the home page is a `ProfilePage` whose main entity is the `Person` (role, employer, university, degree, certificates, profiles), with the `WebSite`. Case studies are `CreativeWork`s with their source as `SoftwareSourceCode`; the archive is an `ItemList`; the paper is a `ScholarlyArticle` with every author in order and `creativeWorkStatus: Accepted`. Pages below the home page carry a `BreadcrumbList`. Only facts the pages show belong there. Check with the Rich Results Test after each content change.
- **AI assistants (GEO).** `/llms.txt` (llmstxt.org) maps the site; `/llms-full.txt` carries the About, services, experience, research, case studies and certificates as Markdown. Both are built from the same content files as the pages, in English, and are static.
- **Crawling.** `/` answers with a permanent 308 to `/en` (the `x-default`). The sitemap lists `x-default` next to `en` and `tr`. `GOOGLE_SITE_VERIFICATION` and `BING_SITE_VERIFICATION` add the ownership tags when set; a DNS TXT record for a Search Console domain property is the preferred route.
- **Region.** Functions run in `fra1` (Frankfurt), next to the visitors in Türkiye and Europe. Redis stays in us-east-1: the activity API is cached at the edge. Pages are built ahead and served from the CDN; the archive page's repository list is cached for an hour and refreshed after each sync.
- [x] Production: `SITE_INDEXABLE=true`, then redeployed (6 October 2026).
- [x] Search Console (domain property, DNS TXT at Name.com) and the sitemap submitted; Bing Webmaster Tools imported from Search Console (6 October 2026).

### October 12: site-only search visibility release

Four dependent review PRs cover identity/evidence, editorial dates, crawler checks and anonymous entry-channel measurement. They require Onur's merge instruction; production remains on the existing main branch until then. Retarget each dependent PR after its prerequisite merges and repeat its checks. See `docs/seo/README.md` for the researched decisions, production inspections, rollback and the 28/56/90-day measurement protocol; `docs/qa/seo/README.md` records implementation validation.

The canonical identity comes from shared facts and feeds visible bilingual copy, metadata, cards and the Person graph. Native Turkish wording and İzmir support local discovery without duplicate location pages. RAG, MCP and LangGraph claims point to distinct verified project evidence. Publisher-linked author names preserve the accepted manuscript's status. Sitemap and WebPage modification dates change only for significant editorial edits; manuscript and software dates remain independent.

The smoke checks server HTML, grounding directives, canonical/hreflang/sitemap agreement and six representative crawler user agents. Verified crawler IP/WAF access still requires host logs. Source-channel event counts are aggregate intent signals; historical totals are not backfilled. Fixed AI-search prompts are scored only after real responses are captured privately. No ranking, citation or recommendation outcome is inferred from implementation tests.

## After a release: icons and link previews

- **Icons.** Browser and home-screen icon links carry their file's content revision (`src/lib/icons.ts`), and versioned icons are cached as immutable. Search gets `/favicon-96.png` at a stable, revalidating URL: Google's guidance recommends a square raster icon larger than 48 px and a stable address. The ICO contains 16, 32, 48 and 96 px images and declares all four sizes in the page head; the SVG declares `sizes="any"`. `/favicon.ico` itself still answers for crawlers. All files come from `public/icon.svg` via `npm run icons:build`. The post-deploy SEO smoke checks the icon links, responses and PNG dimensions. After a logo change, request indexing of `https://onurerguden.dev/en` in Search Console and allow several days to several weeks for Google to recrawl; a favicon is not guaranteed. The Vercel project's Avatar setting is separate from the site's favicon and must be updated separately.
- **Link previews.** The share card's address already changes with its content (`…/opengraph-image/card?<hash>`), but chat apps and social networks cache a page's preview by the page's address. To refresh one: LinkedIn Post Inspector and the Facebook Sharing Debugger re-scrape on request; WhatsApp and iMessage keep a preview per link for days, so share `https://onurerguden.dev/en?ref=…` (any new query) to get a fresh one.
- **Pages.** Each production deploy replaces the CDN's copy of every page; browsers revalidate HTML on every visit, so nothing else needs purging.

## Maintenance

- `/.well-known/security.txt` (RFC 9116) names the public email; its expiry is a year after each deploy, so a year without deploys lets it lapse.
- After each production deploy, `.github/workflows/indexnow.yml` submits to IndexNow (Bing, Yandex and others) only the sitemap pages whose editorial date differs from the previous production deploy's `src/lib/editorial.ts`, plus new pages; with no earlier deploy found it submits every page. A page edit therefore reaches IndexNow only when its date in `src/lib/editorial.ts` changes. The key in `public/<key>.txt` is public by design; to rotate it, replace the file.
- Dependabot opens one grouped npm pull request a week and one for the GitHub Actions each month; CI decides whether they merge.
- `.github/workflows/sync-monitor.yml` checks `/api/github/health` every day at 05:07 UTC and fails when the archive or the activity is older than 36 hours; GitHub emails the failure. Run it by hand from the Actions tab after fixing a sync.

## Site review (October 2026)

- [x] GitHub sync restored in production on 11 October 2026 at 20:14 UTC. It stopped on 6 October at 20:59 UTC and went unnoticed for five days, because the token had stopped working; Onur issued a new read-only token, the production deployment picked it up, and one run of the cron job brought both snapshots up to date (activity 2026 total 1,259 → 1,455; the archive shows the pushes of 7 and 11 October). The sync monitor's manual run passed. The review's figure of 1,507 was read from the GitHub profile page and could not be compared from here.
- [x] Sync failures name their step and HTTP status in the function log; missing settings are named, never printed (PR 01).
- [x] A failed Redis read after the build no longer publishes an empty archive: Next.js keeps the last good page (PR 01).
- [x] `/api/github/health` and the daily sync monitor (PR 01).
- [x] On phones the Explorer opens with three technologies per group and "Show all 48" (review 06; approved by Onur on 11 October: `docs/qa/site-review/stack/`).
- [x] Privacy-friendly analytics (review 05): Vercel Web Analytics page views on production and a first-party conversion counter (`docs/analytics.md`). No cookies, no third-party host, nothing sent under Global Privacy Control or Do Not Track.
- [x] Web Analytics is enabled for the project: `/_vercel/insights/script.js` answers 200 on production and a browser visit sends its page view (automated browsers are not counted). The conversion counter needs nothing more.
- [x] The Explorer's technology icons come from one cached SVG sprite (`public/images/tech/icons.svg`, 18.8 KB gzip) instead of 39 paths inline twice, in the HTML and the RSC payload (review 07). The home page's HTML drops from 71.4 to 32.5 KB gzip (TR 72.7 → 33.7 KB); captures of the Explorer are pixel-identical. Local mobile Lighthouse medians: FCP 1.69 → 1.53 s, LCP unchanged at 3.32 s.
- [ ] The About scene and the balls' texture atlas each bundle the 46 KB icon JSON (22 and 24 KB gzip lazy chunks), so a desktop visit downloads it twice. Sharing it means loading it asynchronously in the About scene; left for a later change.
- [x] The portrait, the About posters and the display fonts carry content revisions and are cached as immutable (review 02); `npm run assets:revisions` records them and a unit test fails when one is stale.
- [x] Mobile Lighthouse: LCP ≤ 2.5 s and performance ≥ 95. Review 02 cut the portrait from 152 to 106 KB on most phones, but the simulated LCP did not move measurably (local medians 3.46 s on main, 3.76 s with the change, within run-to-run noise); the rest of the time is the 72 KB HTML (icon paths inline twice), about 200 KB of scripts and four render-blocking stylesheets. Live after the series (11 October 2026, three runs on onurerguden.dev/en): performance 75 / 93 / 89, LCP 2.4 / 2.4 / 3.1 s, TBT 940 / 250 / 240 ms. What remains is laying out the whole page at once (about 2,100 elements, 0.2 s on a fast computer) and hydration after the first paint; deferring the off-screen sections with `content-visibility` did not change it, so the cost sits in the first screen's desk structure. Onur closed this on 11 October: the median LCP meets the target, and Speed Insights field data decides whether it is reopened.
- [x] Projects and Contact in the bar from the first screen; the desk chapters move to the Sections menu, which marks the one on screen. Content pages say Projects instead of Work and link to Contact (review 04; approved by Onur on 11 October: `docs/qa/site-review/navigation/`).
- [x] Future Is Now is named in Experience and the structured data only; About, the home meta description and the llms.txt summary say "AI engineer", and the Turkish description says "yapay zekâ (AI) mühendisi". The research study is labelled a course project (review 03; copy in `docs/content-review.md`).

## PR order

Foundation -> design -> content -> 3D -> GitHub synchronization -> release QA. Stacked branches preserve reviewable changes without merging ahead of approval. Retarget the next PR to main after its prerequisite is merged, preserving commits.

## Targets

LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1 at the 75th percentile of real visits. Laboratory results do not substitute for field measurements.
