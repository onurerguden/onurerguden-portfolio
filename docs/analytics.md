# Analytics

Two counters, both anonymous: no cookies, no identifiers, no third-party host, so the Content Security Policy stays `'self'` and no consent banner is needed. Neither counts a visitor who sends Global Privacy Control or Do Not Track (`src/lib/privacy.ts`).

## Page views

Vercel Web Analytics, on production deployments only (`VERCEL_ENV=production`). `src/components/site/site-events.tsx` injects its script after the page has loaded; the script and its beacons are served from this origin under `/_vercel/insights`. Web Analytics must be enabled for the project in the Vercel dashboard. Read the numbers there.

## Conversion events

The Hobby plan has no custom events, so a small first-party counter takes them:

| Event | Property | When |
|---|---|---|
| `email_click` | `location` | A `mailto:` link, except the CV request |
| `cv_request` | `location` | The "Request my CV" mail link |
| `email_copy` | `location` | The copy-address button succeeded |
| `linkedin_click`, `github_click` | `location` | A LinkedIn or GitHub profile link (or a repository outside the case studies) |
| `source_click` | `project` | A case study's source link, on its page or its home card |
| `language_switch` | `to` | The language link |
| `case_study_read` | `project` | The case study's last paragraph came into view, once per page view |

`location` is the home section the link is in (`contact`, `about`, …), or `footer`, `desk` (the XP desktop), `case`, `research`, `archive`, `page`. `project` is a case study's slug. The allowlist is `src/lib/events.ts`; anything else is dropped.

The browser code (`src/lib/event-beacon.ts`) loads on the visitor's first scroll, tap or key, and sends one `navigator.sendBeacon` per event to `POST /api/event`. The route accepts only same-origin requests (`Sec-Fetch-Site`), at most 512 bytes, ignores obvious bots, and counts with one Redis call: `HINCRBY portfolio:events:v1:day:<YYYY-MM-DD> <event>:<value> 1`, kept 400 days, under a global ceiling of 120 events a minute. It stores no address, user agent or anything else about the visitor.

Read a month with the production Redis credentials in the environment (for example after `vercel env pull .env.local`):

```sh
set -a; . ./.env.local; set +a
npm run events -- 2026-10
```
