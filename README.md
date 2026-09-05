# Onur Ergüden — portfolio

Bilingual AI engineering and research portfolio built with Next.js, TypeScript, React Three Fiber, Motion and versioned MDX content.

## Local development
Use Node 24 (`nvm use`), run `npm ci`, copy `.env.example` to `.env.local`, then `npm run dev`.

`npm run check` validates TypeScript, lint, content, tests and a production build. `npm run test:e2e` exercises the production server (install Playwright browsers first). No credentials are required for local editorial pages. Live GitHub synchronization requires the server environment described in `docs/github-sync.md`.

## Ownership and release
Work proceeds through unmerged, stacked PRs under Onur's Git identity. See `AGENTS.md` for contributor rules, `docs/design.md` for the visual contract and `docs/release.md` for outstanding release inputs. There is no automatic production publication.
