# Onur Ergüden — portfolio

Bilingual AI engineering and research portfolio built with Next.js, TypeScript, React Three Fiber and versioned MDX content.

## Local development

Use Node 24 (`nvm use`), run `npm ci`, copy `.env.example` to `.env.local`, then `npm run dev`.

`npm run check` validates TypeScript, lint, content, tests, a production build and content tracing. `npm run test:e2e` exercises the production server (install Playwright browsers first). No credentials are required for local editorial pages. Live GitHub synchronization and activity require the server environment described in `docs/github-sync.md` and `docs/github-activity.md`; without it the activity section says the data is unavailable.

## Home page

The desk's screens tell the first part of the story: the ultrawide shows my name, the portrait monitor reads What I do and then Experience, and the MacBook is a Windows XP desktop on Bliss with my tech stack (balls to hover, an Explorer window with every technology and where it was used). On phones the MacBook takes over the view. The page then runs About, stacked project cards, Research, live GitHub activity, certificates (hidden until added) and contact; without the desk the same sections read in that order. `docs/design.md` records the design contract, `docs/scene-budget.md` the WebGL budget and `docs/qa/desk-story/README.md` the latest QA.

## Content and assets

| Command                                          | What it does                                                                                                     |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `npm run validate:content`                       | Checks EN/TR parity, references, image sizes and generated icons (runs before every build).                      |
| `npm run tech:icons`                             | Regenerates `src/lib/tech-icons.generated.json` after editing `src/content/tech-stack.json`.                     |
| `npm run bliss:build`                            | Rebuilds the Bliss parallax layers from the verified source photo (see `docs/bliss.md`).                         |
| `npm run certificate -- <file> <id>`             | Strips metadata from a certificate image or PDF and writes WebP; then add it to `src/content/certificates.json`. |
| `npm run icons:build`                            | Renders `favicon.ico`, the Apple touch icon and the manifest icons from `public/icon.svg`.                       |
| `node scripts/kuyumcum/workflow-chart.mjs <png>` | Converts the Kuyumcum report workflow chart to lossless WebP (`public/images/kuyumcum/`).                        |
| `python3 scripts/fonts/subset-display.py`        | Rebuilds the Portfolio Display title font and its metrics (needs `scripts/fonts/requirements.txt`).              |
| `npm run check:trace`                            | After a build, confirms every content file is traced into the routes that read it.                               |
| `npm run check:assets`                           | Lists files under `public/` that nothing references (part of `npm run check`).                                   |
| `npm run og:thumbs`                              | Re-renders the share cards' PNG images in `assets/og/` after a source image changes.                             |
| `npm run desk:portrait`                          | Encodes the opening portrait at 1080 and 1254 px (AVIF, WebP fallback) from `assets/avatar/`, gated at 42 dB.    |
| `npm run assets:revisions`                       | Records the content revisions of the portrait, About posters and display fonts, which are cached as immutable.   |
| `npm run events -- <YYYY-MM>`                    | Prints a month of conversion counts from the production store (`docs/analytics.md`).                             |
| `node scripts/desk/capture-cosmic-poster.mjs`    | Captures the final-view posters per language from a running production server.                                   |
| `node scripts/desk/capture-story.mjs`            | Captures the QA screenshots in `docs/qa/desk-story/captures/`.                                                   |
| `npm run about:poster`                           | Captures the About scene at rest as its wide and narrow poster (`ABOUT_URL` = a running production server).      |
| `node scripts/qa/*.mjs`                          | QA captures: a page or element (`shot`, `element`), section sheets (`scroll-shot`) and the paper curtain.        |

Section scenes stay static on software WebGL renderers; set `localStorage["portfolio:force-3d"] = "1"` to review them in headless or GPU-less browsers.

## Ownership and release

Work proceeds through reviewable PRs under Onur's Git identity, merged on Onur's instruction. See `AGENTS.md` for contributor rules, `docs/design.md` for the visual contract and `docs/release.md` for outstanding release inputs. Vercel deploys `main` to production on every merge; after each production deploy the SEO smoke test and IndexNow run (`.github/workflows/indexnow.yml`), and `.github/workflows/sync-monitor.yml` checks every day that the GitHub data is fresh.

## Review artifacts

`docs/qa/README.md` records tests and limitations; screenshots are in the same directory. GitHub Actions (`.github/workflows/ci.yml`) runs on every pull request and on `main`: one job for formatting, types, lint, unit tests and the production build, then one browser job per Playwright project. CI retries a failed browser test once and uploads the report when a job fails. CI renders WebGL in software, so the few tests that measure the desk's real-time animation (listed as `gpuOnly` in `playwright.config.ts`) are skipped there; run the full suite locally on a machine with a GPU (`npx playwright test`) before merging changes to the desk.

Every pull request gets a Vercel preview, linked from the pull request. Previews keep `SITE_INDEXABLE` unset and use their own Redis; production and preview Redis stay separate.
