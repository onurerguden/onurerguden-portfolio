# Analytics

Two counters, both anonymous: no cookies, no identifiers, no third-party host, so the Content Security Policy stays `'self'` and no consent banner is needed. Neither counts a visitor who sends Global Privacy Control or Do Not Track (`src/lib/privacy.ts`).

## Page views

Vercel Web Analytics, on production deployments only (`VERCEL_ENV=production`). `src/components/site/site-events.tsx` injects its script after the page has loaded; the script and its beacons are served from this origin under `/_vercel/insights`. Web Analytics must be enabled for the project in the Vercel dashboard. Read the numbers there.

## Conversion events

The Hobby plan has no custom events, so a small first-party counter takes them:

| Event                            | Property   | When                                                                         |
| -------------------------------- | ---------- | ---------------------------------------------------------------------------- |
| `email_click`                    | `location` | A `mailto:` link, except the CV request                                      |
| `cv_request`                     | `location` | The "Request my CV" mail link                                                |
| `email_copy`                     | `location` | The copy-address button succeeded                                            |
| `linkedin_click`, `github_click` | `location` | A LinkedIn or GitHub profile link (or a repository outside the case studies) |
| `source_click`                   | `project`  | A case study's source link, on its page or its home card                     |
| `language_switch`                | `to`       | The language link                                                            |
| `case_study_read`                | `project`  | The case study's last paragraph came into view, once per page view           |

`location` is the home section the link is in (`contact`, `about`, …), or `footer`, `desk` (the XP desktop), `case`, `research`, `archive`, `page`. `project` is a case study's slug. The allowlist is `src/lib/events.ts`; anything else is dropped.

The browser code (`src/lib/event-beacon.ts`) loads on the visitor's first scroll, tap or key, and sends one `navigator.sendBeacon` per event to `POST /api/event`. A clipboard event can import it directly. The route accepts only same-origin requests (`Sec-Fetch-Site`), at most 512 bytes, ignores obvious bots and GPC/DNT headers, and counts with one Redis Lua operation under the existing global ceiling of 120 events a minute.

The legacy counter remains exactly `portfolio:events:v1:day:<YYYY-MM-DD>` with `<event>:<value>` fields. The same operation also increments `<event>:<value>:<channel>` in `portfolio:event-channels:v1:day:<YYYY-MM-DD>`. Both daily hashes are kept 400 days; the minute ceiling expires after 120 seconds. There is no second beacon or rate-limit charge. It stores no IP address, user agent, URL, referrer, query, cookie or visitor identifier.

Read a month with the production Redis credentials in the environment (for example after `vercel env pull .env.local`):

```sh
set -a; . ./.env.local; set +a
npm run events -- 2026-10
```

## Conversion entry channels

Each conversion payload can contain one optional, allowlisted `channel`: `chatgpt`, `claude`, `perplexity`, `google`, `bing`, `other_referral`, `internal`, or `direct_or_unknown`. The classifier lives in `src/lib/event-channels.ts`. Recognized host names must match a whole domain or its subdomain: `chatgpt.com.evil.test` does not match `chatgpt.com`. Google country domains use an explicit list, including `google.com.tr`; an unlisted search domain is `other_referral`.

At the initial client module load, `src/lib/event-entry.ts` reads the document's current URL and `document.referrer`, reduces them to this enum and keeps only that enum in document memory. `SiteEvents` imports this small helper eagerly, before interactions import the beacon module. This also covers an early clipboard action. It uses no cookies, local/session storage, fingerprint or stable ID, and the server never keeps browser request state in a shared module.

Classification order is:

1. A recognized external HTTP(S) referrer, even if a campaign source disagrees.
2. An exact, case-insensitive allowlisted `utm_source` value (provider name/domain, or `copilot` mapped to `bing`). Other query values are discarded.
3. An unrecognized external referrer: `other_referral`.
4. A same-origin referrer: `internal`.
5. No usable signal: `direct_or_unknown`.

Client navigation keeps the entry classification for that document. A fresh document, including the site's plain language-switch link, classifies its own observed referrer and final URL again. A same-origin language navigation therefore becomes `internal`; this is **document entry attribution**, not first-touch or visitor/session attribution. An HTTP redirect is classified from the final document's observable URL/referrer; a redirect, app, browser or privacy policy can hide the original source. Direct visits and missing/referrer-suppressed sources cannot be separated.

GPC/DNT still stops every conversion beacon, including early copy events, and is checked again for each action. No page-view or source-only beacon is introduced. Counts measure observed conversion actions, not unique people, completed email submissions, AI citations, recommendation rates or causal SEO impact. Campaign values can be supplied by a link author and are not proof that an AI system referred someone.

Old payloads without `channel` remain accepted and count as `unattributed` in the new hash. `unattributed` is a server fallback, not a client channel. Historical legacy hashes are not backfilled; they cannot reveal a source that was never collected.

The existing command still reads legacy totals only. Request the separate channel breakdown explicitly:

```sh
npm run events -- 2026-10 --channels
```

This report has separate `event` and `channel` columns and reads only the channel hashes. Do not add its totals to the legacy report: they overlap for events accepted after this change. On deployment day the channel total may be lower, because earlier counts remain legacy-only. Comparing by channel is useful after enough real actions accumulate; a small or missing count is not evidence of an SEO penalty.
