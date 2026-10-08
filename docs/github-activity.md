# GitHub activity

The home page's activity section shows my contribution calendar for every year since the account was created, three last-twelve-month totals (contributions, commits and pull requests), the three largest language shares of my public repositories and the three newest public pushes, pull requests or releases. Private contributions are counted without detail. It updates itself when I commit.

## Data and privacy

- **Source.** One or two GraphQL queries (`contributionsCollection` per year plus the rolling window, and repository languages) and the public events feed `GET /users/onurerguden/events/public`. Both use the existing server-only `GITHUB_TOKEN`; a fine-grained, read-only token for public data is enough.
- **Private work** appears only as GitHub's own anonymous counts. Per-repository detail, commit messages and pull request titles are never requested or stored. Events keep only kind, repository name, time and numbers; links are built at render time as `https://github.com/{repo}`.
- **Compact view.** Creation events are excluded before storing the latest twelve public events; the browser also filters legacy snapshots and displays the latest three. Equal timestamps preserve provider order. Language percentages retain their share of all public repository language bytes, rather than being normalized to the three visible languages. Hidden events never advance the visitor's seen timestamp. The v1 snapshot schema still accepts older creation events, and retains the full calendar/statistic data.
- **Completeness.** A year is committed only if its days add up to GitHub's own total for that year, and a GraphQL error inside an HTTP 200 counts as a failure. Nothing partial replaces a complete snapshot.

## Storage

Upstash Redis, prefix `portfolio:github:activity:v1:`. The snapshot is stored as an opaque JSON string next to its fetch time, revision and the events ETag; the commit script only compares fetch times, so an older fetch that finishes late is rejected and JSON is never re-encoded in Lua. Other keys: a 60-second lock, a two-minute refresh cooldown, a fifteen-minute "dirty" marker set by pushes, and a persisted rate-limit backoff.

## Freshness

- **On read.** `getActivity()` (`GET /api/github/activity`; the page itself is built ahead and fetches it) reads Redis with a 1.2-second timeout. If the snapshot is older than ten minutes, or a push marked it dirty more than 90 seconds ago, it refreshes after the response with `after()`, guarded by the cooldown and lock. Incremental refreshes re-read only the last twelve months and the current year.
- **On push.** The existing repository webhook marks the data dirty and refreshes it. GitHub can take a few minutes to count a contribution, so reads stay eager for fifteen minutes. Pushes to private repositories arrive through the read-time refresh and the cron.
- **Daily.** `GET /api/cron/github` reconciles repositories and then does a full activity refresh; it returns 503 if either fails and reports `skipped` when either was turned away.
- **In the browser.** The section asks the API once it is near or the browser is idle, showing its skeleton until then, and polls every few minutes while the tab is visible; ETags make unchanged polls a 304.

Worst case this is about one GraphQL request and one conditional REST request every two minutes, far below GitHub's limits. `after()` is not a durable queue; the daily cron is the recovery path.

## Failure

The explicit local connected preview reads atomically replaced public files instead of Redis. See the `preview:github` command in [GitHub sync](github-sync.md). This mode is disabled on Vercel, and local snapshots are excluded from deployment traces. All failure rules below still apply to the hosted integration.

Without Redis or a token, or when a read fails, the API answers `503 {"available": false}` with `no-store`, and the section says the live data is unavailable. It never shows placeholder numbers. No error text, token or provider payload reaches the browser.

## Validation

`npx vitest run tests/github-activity.test.ts` covers the calendar mapping (ranges, leap years), streaks across years, the busiest weekday, event filtering, full and incremental refreshes, 304 reuse, GraphQL errors in HTTP 200, a year that disagrees with GitHub's total, cooldown and lock, a late older fetch and rate-limit backoff. The e2e suite checks the API fails closed. Totals were checked against the live API on 29 September 2026: 457 contributions in 2025, 892 so far in 2026.
