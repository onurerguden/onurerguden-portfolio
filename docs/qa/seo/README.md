# Search visibility release validation

Implementation reviewed on 12 October 2026 using Node 24 and the installed
Next.js 16.4 documentation. The four dependent PRs are reviewable changes;
no production merge or deployment is claimed by these local results.

## Completed checks

- `npm run check`: type generation/typecheck, lint, 344 unit tests in 48 files,
  content validation, production build, static-page, trace and asset checks.
- `npm run format:check`: passed.
- Production-indexable local build and `SITE_URL=http://localhost:3100 npm run
smoke:seo`: passed for 14 editorial pages, 14 share cards and four icon
  resources, including representative crawler parity and grounding directives.
- `tests/e2e/seo.spec.ts` against that indexable build: 15 passed across desktop
  Chromium, mobile Chromium and mobile WebKit. Includes EN/TR server content
  without JavaScript, graph/location evidence and keyboard/pointer access to the
  separate LangGraph proof link.
- The entry-channel implementation's browser suite passed across all three
  profiles, including GPC/DNT, one payload per click and preserved SPA entry
  attribution. The added two-case SPA observer regression passed on all three.
- Manual browser inspection: opening identity at desktop and 375 × 812 phone
  size, EN/TR research author wrapping and publisher links. Geometry and reading
  order remained consistent with the approved design.
- Initial-load script bytes measured 187,965 compressed in desktop Chromium,
  about 0.5 KB above the previous 187,452-byte measurement. The required eager
  entry enum classifier and route-aware observer add no dependencies or extra
  beacons. The script ceiling increases by 500 bytes to 188,100 with this
  measured rationale recorded in `tests/e2e/budgets.json`; other ceilings stay
  unchanged. The existing byte-budget test continues to enforce that limit.

The final affected browser suite additionally covers site navigation, release
accessibility, homepage sections, crawler semantics and conversion events.
Record its final result with the release PR; hosted CI runs the full suite.

## Interpretation and remaining release work

Local crawler user-agent checks do not verify provider IP access or actual
retrieval. Physical iOS Safari remains an existing release check. Search Console
and Bing inspections, production smoke and verified crawler log review follow
the authorized production merge. CI and Vercel statuses belong to their actual
PR runs, not these local counts.

The private planning baseline includes observed Search Console aggregates;
the fixed consumer AI-search runs are pending and unscored. No synthetic
response, ranking improvement or LLM recommendation is counted. Follow
`docs/seo/README.md` for real response capture and equal-period comparisons.
No production Redis writes or private dashboard exports are used by the tests.
