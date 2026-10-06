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

- **Titles and cards.** The home page title leads with my name (`Onur Ergüden — AI Engineer` / `AI Mühendisi`); other pages keep `Page | Onur Ergüden`. Open Graph and X cards carry the full title and always use the large image.
- **Structured data** (`src/lib/structured-data.ts`). One graph per page, linked by `@id`: the home page is a `ProfilePage` whose main entity is the `Person` (role, employer, university, degree, certificates, profiles), with the `WebSite`. Case studies are `CreativeWork`s with their source as `SoftwareSourceCode`; the archive is an `ItemList`; the paper is a `ScholarlyArticle` with every author in order and `creativeWorkStatus: Accepted`. Pages below the home page carry a `BreadcrumbList`. Only facts the pages show belong there. Check with the Rich Results Test after each content change.
- **AI assistants (GEO).** `/llms.txt` (llmstxt.org) maps the site; `/llms-full.txt` carries the About, services, experience, research, case studies and certificates as Markdown. Both are built from the same content files as the pages, in English, and are static.
- **Crawling.** `/` answers with a permanent 308 to `/en` (the `x-default`). The sitemap lists `x-default` next to `en` and `tr`. `GOOGLE_SITE_VERIFICATION` and `BING_SITE_VERIFICATION` add the ownership tags when set; a DNS TXT record for a Search Console domain property is the preferred route.
- **Region.** Functions run in `fra1` (Frankfurt), next to the visitors in Türkiye and Europe. Redis stays in us-east-1: the activity API is cached at the edge, and only the archive page reads Redis while rendering.
- [x] Production: `SITE_INDEXABLE=true`, then redeployed (6 October 2026).
- [x] Search Console (domain property, DNS TXT at Name.com) and the sitemap submitted; Bing Webmaster Tools imported from Search Console (6 October 2026).

## Maintenance

- `/.well-known/security.txt` (RFC 9116) names the public email; its expiry is a year after each deploy, so a year without deploys lets it lapse.
- After each production deploy, `.github/workflows/indexnow.yml` submits the sitemap's pages to IndexNow (Bing, Yandex and others). The key in `public/<key>.txt` is public by design; to rotate it, replace the file.
- Dependabot opens one grouped npm pull request a week and one for the GitHub Actions each month; CI decides whether they merge.

## PR order

Foundation -> design -> content -> 3D -> GitHub synchronization -> release QA. Stacked branches preserve reviewable changes without merging ahead of approval. Retarget the next PR to main after its prerequisite is merged, preserving commits.

## Targets

LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1 at the 75th percentile of real visits. Laboratory results do not substitute for field measurements.
