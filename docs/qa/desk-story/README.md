# Desk story QA (2 October 2026)

Six PRs: #31 foundation, #32 monitor, #33 XP MacBook, #34 home flow, #35 pages, and this one (assets and QA). Captures are in `captures/` (`scripts/desk/capture-story.mjs`, production build, headless Chromium with section scenes forced on, 1440 × 900 desktop in EN and TR, Pixel 7 in EN).

## Method

- `npm run check`: typecheck, lint, unit tests (timeline purity and reversal, holds, rise, dive, remapping, close-up scale, inverse projection, content model and evidence, section ids), content validation, build, content tracing and the public asset audit.
- Playwright on desktop Chromium and Pixel 7 Chromium: journey, monitor, MacBook balls and takeover, stack, home sections, site (axe on every content page and the 404 in both languages), projects, desk, desk interactions, About 3D, activity, certificates and release budgets. Headless WebKit lacks reliable WebGL2; its static paths are covered.
- Browser review on a development server at 1440 × 900, 1280 × 800, 844 × 390, 390 × 844 and 375 × 812.

## Measurements

| What                                               | Value                                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Settled desk frame, monitor / MacBook / final view | 40 / 45 / 107 draw calls; 53,285 / 74,777 / 189,053 triangles                               |
| MacBook balls, desktop / Pixel 7                   | 1 draw call; 19,440 / 6,336 triangles                                                       |
| Live WebGL contexts                                | At most 2 (desk and balls)                                                                  |
| First load, `/en` reduced motion                   | Script 218,328 B, font 47,964 B, CSS 17,619 B, images 151,986 B                             |
| Opening portrait                                   | AVIF 151,986 B against WebP 1,076,728 B, 1254 px, PSNR 43.28 dB (gate 42); `portrait-avif/` |
| Final-view posters                                 | Captured from the real final frame per language (`final-view-en.png`, `final-view-tr.png`)  |

## Fixed along the way

- Shadow maps refreshed on every scroll frame since three r185 (`docs/scene-budget.md`), which tripled close-up draw calls. They are now cached again.
- three.js had entered the first load through shared geometry modules. It is back in the lazily loaded scene.
- The `/lab/desk` review page drew its screen panels thousands of pixels wide: the projection received the array index as the panel width. That is fixed, and its six e2e failures (open since 30 September) now pass.
- A released WebGL stage counted as a lost context and stayed static for the visit. Only a live canvas losing its context fails now.

## Open

- **No physical iPhone was available.** iOS Safari memory with two contexts, the takeover, context loss and the LinkedIn in-app browser still need a real-device pass. Emulation is not reported as one.
- No CI runs on pull requests: the workflow file still needs a token with workflow scope (`docs/release.md`). All checks above ran locally.
- One Pixel 7 About-3D pause check failed once on a frame counter (17 → 18) and passed on rerun.
