# GitHub project sync

The public archive reads a durable Redis snapshot on every server request. Editorial descriptions and featured project order stay separate. `getPublicProjects()` returns `{ repos, syncedAt }`; missing/unavailable Redis returns an empty result for the UI’s editorial fallback. No token, webhook body, private repository record or provider error reaches the browser. During a GitHub outage, Redis keeps the last complete snapshot. During a Redis outage that snapshot cannot be read, so the archive falls back rather than claiming live data.

## Configuration

Set these server-only environment variables in the hosting dashboard (never `NEXT_PUBLIC_`):

- `GITHUB_TOKEN`: a fine-grained token scoped to public repository metadata, read-only. Avoid access to private repositories.
- `GITHUB_WEBHOOK_SECRET`: a strong random shared secret.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: dedicated Redis REST credentials.
- `CRON_SECRET`: a strong random secret for the reconciliation endpoint.

Redis is accessed with its HTTPS REST command API to apply explicit 2.5-second timeouts and `no-store`; no browser SDK is used. Keep preview deployments on a separate Redis database and do not configure production webhooks against previews.

For each public `onurerguden` repository, add a GitHub repository webhook:

- Payload URL: `https://YOUR_DOMAIN/api/github/webhook`
- Content type: `application/json`; secret: the matching webhook secret; SSL verification enabled.
- Subscribe to **Pushes** and **Repositories**. Ping is supported.
- The endpoint accepts signed payloads up to 2 MiB. An exceptionally large push delivery should be recovered through reconciliation.

Schedule authenticated `GET /api/cron/github` daily (for example `0 3 * * *` in Vercel cron configuration). Vercel attaches `Authorization: Bearer <CRON_SECRET>`. Invoke the endpoint once after configuration to create the initial snapshot. A successful response reports `ok: true`; 503 means the existing snapshot was preserved and the run needs attention.

## Behavior and recovery

The webhook validates SHA-256 HMAC on raw UTF-8 body bytes, delivery ID and owner. Confirmed deleted/private/transferred repository IDs are removed before acknowledgment, even during GitHub rate limiting. Accepted deliveries receive 202; the full public list refresh runs with Next.js `after()` under a 60-second function limit. The GitHub fetch budget is 35 seconds with six-second per-request limits; pagination is complete-or-fail (100 entries per page, at most 100 pages). No partial result replaces a complete snapshot. Repo identity uses GitHub’s immutable numeric ID, so renames naturally replace the prior name and URL.

A 90-second delivery lock prevents concurrent duplicate processing; its random ownership token prevents an expired worker from releasing a newer lock. The seven-day success marker is written only after a successful snapshot commit. Failed delivery IDs remain retryable. Optimistic snapshot revisions reject stale concurrent writes, including a public fetch that began before a confirmed removal. GitHub 403/429 backoff is persisted from retry/reset headers, with a minimum one-minute delay. API error bodies are never logged.

Normal healthy processing targets 2–5 minutes; this is not an availability guarantee. `after()` is bounded background work, **not a durable job queue**: GitHub does not automatically redeliver every failed background attempt. Inspect generic function errors and `syncedAt` when diagnosing staleness. After a background error or revision conflict, use GitHub’s delivery redelivery control (same ID is safe) or invoke the protected cron endpoint; daily reconciliation is the automatic recovery path. If stronger recovery guarantees become necessary, add a durable queue before tightening the SLA.

Daily reconciliation discovers new public repositories and removes repositories no longer in the complete public API result. Configure a webhook for each new repository to obtain prompt updates. The account profile repository is excluded; forks are preserved with their flag. Returned URLs are constructed on `github.com/onurerguden`, never accepted as arbitrary upstream URLs. The system stores only public summary fields and does not fetch commit bodies or private code.

## Validation

Run `npx vitest run tests/github-sync.test.ts` plus the repository typecheck/build. The mocked tests cover signature tampering, wrong owner, private filtering, repeated deliveries, retry after failure, complete pagination, partial-fetch preservation, rename, deletion, persisted rate limits and a deletion racing a stale fetch. Before production, verify a real signed push, repository rename, private transition and manual cron run against the configured staging integration. No live integration test is claimed without credentials.

Sources: [GitHub signature validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries), [repository API](https://docs.github.com/en/rest/repos/repos#list-repositories-for-a-user), and the installed Next.js `after` documentation.
