# GitHub connected local preview

Verified on 4 October 2026 with the authenticated `onurerguden` GitHub CLI. This is a local integration; no Vercel deployment, hosted Redis database or public webhook was configured.

## Verified live data

The initial complete GitHub response showed 1,184 contributions in the rolling twelve-month calendar, 250 commits, 42 pull requests, a current streak of six days and a longest streak of thirteen days. Calendars cover 2022–2026 (19, 14, 35, 457 and 1,075 contributions respectively). The public archive contains fourteen owned public repositories, excluding the account profile repository. These are time-specific API observations, never hardcoded page content.

Only contribution counts, public repository summaries, public language shares and twelve filtered public events are saved. Anonymous private-contribution counts contain no private repository names, commit text or source. The CLI token remains in the local sync process's memory; it is not stored in `.env`, snapshots or browser responses, and is not passed to the Next.js child process.

The sync process refreshes every two minutes; the browser polls every three minutes while visible. Failed or incomplete API responses preserve the previous complete snapshot. The command binds the web server to localhost and stops it with the refresh timer on exit. Explicit loopback opt-in is required; Vercel always uses the existing Redis path. Generated files under ignored `work/github/` were confirmed absent from every deployment trace, with the files present during the production build.

## Validation

- `npm run check`: typecheck, lint, 155 unit tests, content validation, production build, content trace and public asset checks.
- `PLAYWRIGHT_PORT=3103 PLAYWRIGHT_GITHUB_LIVE=1 npx playwright test tests/e2e/github-connected.spec.ts`: six real-data checks covering EN/TR in desktop Chromium, mobile Chromium and mobile WebKit, API freshness, calendar sums, 304 responses, keyboard heatmap access, public repository links and axe audits.
- Existing activity regression scenarios verify unavailable data, unknown response shapes, tab and heatmap focus, older responses, new-contribution announcements and polling. The full run passed 34 scenarios; two ended with missing trace files because another Playwright run shared the default output directory. Both affected scenarios passed in a separate rerun across all three browser projects (six passes), with no assertion failures. Run these commands sequentially or give them separate output/report directories. The real-data checks additionally verify statistic text fits its cell.
- Manual in-app browser review at 1280×800 and 390×844. Real Wednesday/Çarşamba labels exposed clipping in the display font; textual weekday values now use readable body type and wrap within the statistic cell. Keyboard controls and reduced motion retain their existing behavior.

## Screenshots

- [Desktop activity](activity-desktop-tr.png)
- [Mobile activity](activity-mobile-tr.png)
- [Mobile public repositories](repos-mobile-tr.png)

## Remaining hosted setup

Configure Vercel with a dedicated public read-only GitHub token, Upstash credentials, webhook and cron secrets. Configure repository webhooks and daily reconciliation, initialize the snapshots with the protected cron endpoint, and repeat signed-webhook checks against the public HTTPS deployment. The local CLI token must not be reused for hosted deployment.
