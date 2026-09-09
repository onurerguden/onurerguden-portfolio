# Validation record

Tested on the final integrated branch, 2026-09-05, using Node 24.19.0 and a production Next.js 16.3.4 build. These are local checks, not a claim that deployment or live integration is complete.

## Passed
- TypeScript, ESLint, Zod/MDX locale validation, production build.
- 18 unit tests: content completeness, shared measurements, signature validation, owner checks, private filtering, deduplication, retry, pagination, rate limiting and snapshot races.
- 26 Playwright tests across desktop Chromium, mobile Chromium and mobile WebKit. English/Turkish routes, metadata, navigation, image loading, axe WCAG A/AA checks, reduced motion, fail-closed endpoints and internal links passed.
- One WebKit GPU test is skipped: headless WebKit is not a physical iPhone GPU. Its static fallback and content are tested. Desktop Chromium checks actual Tab order; mobile contexts check explicit focus plus keyboard activation because mobile WebKit does not emulate desktop full keyboard access.
- Chromium canvas: 29 draw calls, 924 triangles. Context-loss fallback passed.
- 640×400 layout at device scale 2 (equivalent layout density to 200% zoom on 1280×800): no horizontal overflow. This is emulation, not an OS-level zoom test.
- JavaScript-disabled navigation to research works.
- All referenced public GitHub URLs returned 200. LinkedIn returned 999 (automated access blocked); it is not classified as a verified broken link.
- Next.js output trace includes all eight content files needed by serverless deployment.

## Local performance sample
See lab-measurement.json for actual results, browser/version and throttling settings. This is a single local run in a fresh context with 150 ms latency, 200,000 B/s download and 4× CPU throttling. It is not a Lighthouse score or real-user p75. INP is not measured.

The LCP element was H1 in this run. The deferred 3D chunk was requested separately after the initial content. There are zero model/texture downloads; JavaScript resources are listed separately in the JSON.

## Visual review
Screenshots cover desktop homepage, selected work, research, Kuyumcum case study, Turkish mobile, WebKit static fallback and zoom-equivalent layout. Reviewed for cropping, missing images, overflow and text hierarchy. Only actual supplied application screenshots are used for Kuyumcum; other project images are conceptual architecture diagrams.

## Guideline review
Review uses docs/skills/web-interface-guidelines-2026-09-05.md and its recorded hash. Intentional brief-specific choices: first-person writing, sentence case and decorative WebGL. Keyboard focus, skip link, semantic navigation, alt text, image dimensions, locale links and reduced motion checked. Increased main project copy to 16 px; corrected image aspect-ratio metadata; decorative canvas remains outside tab order.

## Still requires external validation
Real Vercel deployment, Redis-backed snapshot, live signed webhook, domain/DNS and real-user Speed Insights are not configured. Actual iPhone Safari and final CV are release inputs. See ../release.md. No public production launch is claimed.
