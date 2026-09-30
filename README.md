# Onur Ergüden — portfolio

Bilingual AI engineering and research portfolio built with Next.js, TypeScript, React Three Fiber, Motion and versioned MDX content.

## Local development
Use Node 24 (`nvm use`), run `npm ci`, copy `.env.example` to `.env.local`, then `npm run dev`.

`npm run check` validates TypeScript, lint, content, tests, a production build and content tracing. `npm run test:e2e` exercises the production server (install Playwright browsers first). No credentials are required for local editorial pages. Live GitHub synchronization and activity require the server environment described in `docs/github-sync.md` and `docs/github-activity.md`; without it the activity section says the data is unavailable.

## Home page

After the desk journey the home page runs in story order: About (floating procedural 3D objects), the tech stack on the original Windows XP Bliss photograph (parallax layers and physics balls), What I do, stacked project cards, live GitHub activity, certificates (hidden until added), experience and contact. `docs/design.md` records the design contract; `docs/scene-budget.md` records the WebGL budget and measurements.

## Content and assets

| Command | What it does |
| --- | --- |
| `npm run validate:content` | Checks EN/TR parity, references, image sizes and generated icons (runs before every build). |
| `npm run tech:icons` | Regenerates `src/lib/tech-icons.generated.json` after editing `src/content/tech-stack.json`. |
| `npm run bliss:build` | Rebuilds the Bliss parallax layers from the verified source photo (see `docs/bliss.md`). |
| `npm run certificate -- <file> <id>` | Strips metadata from a certificate image or PDF and writes WebP; then add it to `src/content/certificates.json`. |
| `python3 scripts/fonts/subset-display.py` | Rebuilds the Portfolio Display title font and its metrics (needs `scripts/fonts/requirements.txt`). |
| `npm run check:trace` | After a build, confirms every content file is traced into the routes that read it. |

Section scenes stay static on software WebGL renderers; set `localStorage["portfolio:force-3d"] = "1"` to review them in headless or GPU-less browsers.

## Ownership and release
Work proceeds through unmerged, stacked PRs under Onur's Git identity. See `AGENTS.md` for contributor rules, `docs/design.md` for the visual contract and `docs/release.md` for outstanding release inputs. There is no automatic production publication.

## Review artifacts

The six stacked PRs preserve each implementation layer. `docs/qa/README.md` records tests and limitations; screenshots are in the same directory. The ready-to-activate GitHub Actions workflow is in `docs/ci/validate-portfolio.yml` because the current CLI token lacks workflow-upload permission. After `gh auth refresh -h github.com -s workflow`, copy it to `.github/workflows/ci.yml` and commit in the release PR.

Remote preview requires renewing the expired Vercel login. `vercel login`, then `vercel` from this repository creates a preview; configure the server-only environment in Vercel before testing synchronization. Keep production and preview Redis separate. Do not use `--prod` until the release checklist is complete.
