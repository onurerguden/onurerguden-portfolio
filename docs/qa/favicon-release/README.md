# Favicon and release review — 12 October 2026

## Finding and change

Production at `a047465` already serves the approved navy/volt OE logo at both
`/favicon.ico` and `/icon.svg`, including on the Vercel domain alias. Their
SHA-256 revisions matched the source: `7847293ff25d` and `07d00c10926e`.
Search Console's saved HTML from the 12 October homepage crawl includes that
same ICO revision. An old search-result icon therefore appears to be Google's
cached favicon; the page and icon are fetchable.

The ICO contained 16, 32 and 48 px images but its HTML declared only `32x32`.
The new build also includes 96 px, declares all embedded sizes and adds a
96 × 96 PNG at the stable, revalidating `/favicon-96.png` address. SVG stays
the source for all generated icons and declares `sizes="any"` in HTML.
This follows [Google's favicon guidance](https://developers.google.com/search/docs/appearance/favicon-in-search).
Eligibility does not guarantee a displayed favicon; Google says processing
can take several days to several weeks.

The post-deploy SEO smoke now checks every sitemap page's stable PNG link,
all favicon responses, the PNG signature and dimensions, and its cache policy.

## Vercel and search checks

- The blue symbol was the Vercel project's separately uploaded Avatar.
  Updated it from `public/icon-512.png` in the personal account and verified
  the saved OE avatar in Settings and the project navigation.
- The Production Checklist's remaining item is Speed Insights Plus.
  [The free tier is available on all plans](https://vercel.com/docs/speed-insights/limits-and-pricing)
  and is already collecting production data. Plus is an optional paid tier.
- The two deployment recommendations are concurrent builds and Skew
  Protection. Neither identifies a failed deployment or a launch blocker.
- Search Console reports the English homepage indexed, successfully fetched
  by smartphone Googlebot on 12 October, with its own canonical and a valid
  ProfilePage. The submitted sitemap is successful and lists 14 pages.
- The index coverage report was last updated on 9 October: 12 URLs were
  discovered and awaiting indexing, and two were redirects. Recheck this
  report after Google updates it; the live sitemap pages all respond 200.
- Production's public GitHub health endpoint returned fresh archive and
  activity timestamps on 12 October.
- LinkedIn Post Inspector successfully re-scraped both the bare origin and
  `/en`, showing the current portrait share card and title. It followed the
  origin's 308 redirect to `/en`. An initial Inspector error cleared on retry.
  Page and card also answered 200 to a request using the LinkedInBot agent.

## Validation

- Node 24.21.0; dependencies installed from the existing lockfile.
- `npm run format:check` and `git diff --check` passed.
- `npm run check` passed: types, lint, 292 unit tests, EN/TR content and shared
  facts, production build, static routes, traced content and public assets.
- Focused Playwright pass: 17 passed, one skipped, across desktop Chromium,
  mobile Chromium and mobile WebKit. Covers icon files and dimensions,
  caching, EN/TR keyboard access and axe, reduced motion and desk controls.
  The existing WebKit desk-interaction skip is retained.
- Visually checked the generated 96 px logo and the saved Vercel avatar.
- The pre-change production SEO smoke passed all 14 pages and 14 share cards.
  The expanded smoke must pass on production after this change is deployed.

## Remaining release actions

- Merge the reviewed PR on Onur's instruction, then let the production build
  finish and run `SITE_URL=https://onurerguden.dev npm run smoke:seo`.
- Request indexing of `https://onurerguden.dev/en` in Search Console after
  the deploy. Allow Google's favicon processing to finish.
- Complete the physical iPhone Safari and LinkedIn in-app browser checks
  recorded in `docs/release.md`; Playwright WebKit is not a physical device.

## Dependency maintenance

`npm audit` reported nine affected package entries from two advisory chains:
[braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) in the development
lint/glob dependencies and
[sprintf-js](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) through
`gray-matter` / `js-yaml`. Both advisories list no patched version; the latest
registry versions checked were 3.0.3 and 1.1.3. The latter chain reads checked-in
MDX in `src/lib/content.ts`; no visitor-controlled input to either affected
operation was found in this review. Keep this as a maintenance item and
evaluate a patched release or removal of the dependency chain separately.
The audit's proposed major downgrades were not applied.
