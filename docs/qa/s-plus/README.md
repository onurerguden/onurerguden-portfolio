# S+ home page: QA record

This records how the S+ home page (PRs #19 onwards) was verified, what was measured and what is still unverified. Screenshots in this folder come from the production build.

## Method

- **Every PR:** `npm run check` (typecheck, lint, unit tests, content validation, production build, content tracing), then the full Playwright suite in an isolated worktree on desktop Chromium (1440×1000), Pixel 7 Chromium (390×844) and iPhone 13 WebKit.
- **Software WebGL.** Headless Chromium renders WebGL with SwiftShader. Section scenes deliberately stay static there (see `docs/scene-budget.md`), so the scene tests opt in with `localStorage["portfolio:force-3d"] = "1"`. Headless WebKit has no WebGL2, so its runs cover the static paths.
- **Accessibility:** axe (WCAG 2.0 A/AA and 2.1 AA) on every section, with and without reduced motion and in both languages. Keyboard walkthroughs are automated for the Sections menu, stacked project cards (focus never under a later card), the Start menu, the heatmap grid and tabs, and the certificate lightbox. Hydration is checked for page errors on every engine.
- **Visual review:** production screenshots at 390 and 1440 px in both languages, including scroll-driven states (Services reveal mid-scroll, stacked cards, Bliss parallax, ball drop and launch).

## Measurements

| Scene | Steady frame | Notes |
| --- | --- | --- |
| Desk journey | ≤ 130 draw calls, ≤ 210k triangles | Unchanged; releases its context once far offscreen |
| About objects | 20 calls / 79,492 triangles (desktop); 6 / 14,650 (390 px) | Up to 60 fps while visible (30 on touch) |
| Tech-stack balls | 1 call / 58,320 triangles (27 balls); 38,880 (18 balls) | Draws nothing once the pile settles |
| Display font | 9.5 KB (two WOFF2 subsets) | Turkish capitals load only when used |
| Bliss layers | ≈150 KB AVIF at 1920 px for all three layers | Reduced motion downloads only the original photo |

At most two WebGL contexts exist at any scroll position (checked by walking the whole page with scenes forced on).

### First load

Compressed bytes for `/en` before any scrolling, from the production build on 30 September 2026. `tests/e2e/release.spec.ts` enforces the ceilings in `tests/e2e/budgets.json`.

| Resource | `main` | This release | Ceiling |
| --- | --- | --- | --- |
| Script (reduced motion) | 195,465 | 208,623 (+13.2 KB) | 215,945 (`main` + 20 KB, as planned) |
| Script (full motion, desk scene included) | 507,179 | 520,584 (+13.4 KB) | not enforced |
| Font | 98,040 | 106,048 (+8.0 KB, the display font) | 112,000 |
| CSS | 10,101 | 16,832 | 20,000 |
| Image | 1,085,266 | 1,085,266 | 1,150,000 |

The image total is almost entirely the opening portrait, `public/images/avatar/onur-head-v4.webp` (1,076,728 bytes, 1254 × 1254 with alpha), which predates this work and is served at full resolution on purpose (`docs/design.md`, 23 September). A trial AVIF at quality 70 is 152,577 bytes (43 dB PSNR). It is left for Onur to decide, since the start screen is still being designed.

## Known limitations

- **No physical iPhone was available.** iOS Safari memory, context loss and frame rate still need a real-device pass (see `docs/release.md`).
- **Firefox isn't in the Playwright matrix.** By design it shows the finished state of the Services reveal (no scroll timelines); this is unverified in a real Firefox.
- **No field data yet.** Live activity has only been verified against the real GitHub API from the command line; Redis, the webhook and the cron await Vercel configuration.
- **Lab page only.** The `/lab/desk` review page (noindex, 404 in production) has six e2e failures that predate this work; the same six fail on `main` (04fb538, rerun on 30 September): `desk.spec.ts` "desk camera visits four stops…" and `desk-interactions.spec.ts` "review desk actions and keyboard access" (EN and TR) on desktop and Pixel 7 Chromium. After "Explore in 3D", the HTML screen panels are projected thousands of pixels wide and cover the desk (`lab-desk-review-panels.webp`, 1440 px). The home page journey is not affected. They are left for the desk redesign rather than patched here.
- **Timing under load.** With the machine's load average at 8–11 (other apps running), a few WebGL-heavy tests failed now and then: journey camera stops, and the Sections menu landing on Pixel 7. In the Sections case the trace shows the page on target within a second, then a 12-second renderer stall during which the viewport check could not answer. Each passed on isolated reruns. The long journey walkthrough now has a slow-test budget, since it takes 48–52 s under load.
- **Unread polls.** Chromium keeps a `fetch` open until its body is read, so the activity poll now reads its empty 304 and small 503 bodies. Without that, the page never reached network idle while the API was unavailable.
