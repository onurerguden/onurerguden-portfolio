# GitHub balance and certificate paper stacks

Reviewed on 4 October 2026 against Onur's approved brief and the [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). The existing first-person copy and sentence case are intentional portfolio conventions.

## Result

GitHub now shows three rolling twelve-month metrics, three actual language shares and three recent public pushes, pull requests or releases. The metric period remains visible when a different calendar year is selected. Creation events are filtered before the twelve-record storage limit; legacy snapshots are filtered again in the browser. Hidden events cannot update the seen watermark. The v1 response, remaining statistics and synchronization intervals are unchanged.

The calendar uses equal square cells that fill available width; when 12 px cells cannot fit, only the calendar box scrolls horizontally. A native table's fractional column rounding is handled once before summing its width, so the final week remains the same size as the others. The two lower panels stretch equally through CSS Grid and share padding, heading alignment and row spacing. Neither panel truncates its content.

Six verified certificates use two blank, decorative backing sheets and the complete document image in a 4:3 frame. Only the sheets move; credential copy and descriptions remain still. The effect uses CSS perspective, transform transitions and the existing motion preference. Touch, paused motion, reduced motion and pre-hydration stay closed. No credentials, raster images, dependencies or WebGL scenes were changed.

## Validation

- Node 24.21.0; `npm run check` passed: typecheck, lint, 163 unit tests, EN/TR content and shared facts, production build, content trace and public asset references.
- `PLAYWRIGHT_PORT=3104 npx playwright test tests/e2e/activity.spec.ts tests/e2e/certificates.spec.ts`: 59 passed, 13 intentionally skipped across desktop Chromium, mobile Chromium and mobile WebKit. Skips cover the empty-certificate condition and desktop-only hover, resizing and script-disabled scenarios; touch devices retain their own gallery and dialog checks.
- `PLAYWRIGHT_PORT=3105 PLAYWRIGHT_GITHUB_LIVE=1 npx playwright test tests/e2e/github-connected.spec.ts`: all six EN/TR real-data checks passed across the same browser projects, including API freshness, calendar sums, 304 responses, keyboard access, public repository links and axe audits.
- The surrounding home-section regression checks also passed 35 scenarios, with one desktop-inapplicable touch-navigation scenario skipped.
- Unit coverage checks useful-event filtering before the twelve-record limit, descending timestamp order, stable ties, legacy snapshot acceptance, non-mutating selection, true language shares and bilingual short action wording.
- Browser coverage includes equal panel bounds, long repository names, actual percentages, empty states, visible-only seen timestamps, year selection and heatmap keyboard navigation, older cached responses and the existing polling behavior.
- Certificate checks include hover and keyboard fan, fixed metadata, focus ring, live pause and reduced-motion changes, touch's closed stack, complete images, native dialog navigation, verified links and focus return. Normal, paused and reduced-motion states have section-scoped axe audits for WCAG 2 A/AA and WCAG 2.1 AA.
- Responsive checks cover EN/TR at 1440, 1100, 1099, 900, 700, 699 and 390 px for certificate columns, sheet containment and text overflow; the calendar additionally covers 320 and 760 px. A script-disabled browser verifies the closed server-rendered stack.

## Visual review

Manual in-app browser review covers desktop (1440×1000), tablet (900×1000) and mobile (390×844) in both languages, with the existing locally synchronized public GitHub data. At the desktop viewport both activity panels measured 625.25×323.80 px; at the tablet viewport both measured 387×304.80 px. They share their top and bottom boundaries. Mobile stacks the panels at a common horizontal edge. The snapshots below contain only public activity summaries and the previously reviewed certificate raster images. Live GitHub values are observations at capture time, not hardcoded page content.

- Desktop activity: [English](activity-desktop-en.jpg), [Turkish](activity-desktop-tr.jpg).
- Mobile WebKit activity: [English](activity-mobile-en.jpg), [Turkish](activity-mobile-tr.jpg).
- Desktop certificate fan: [English](certificates-desktop-en.jpg), [Turkish](certificates-desktop-tr.jpg).

The browser matrices are automated Chromium/WebKit coverage. Physical iPhone Safari and hosted setup retain the existing release-checklist status.
