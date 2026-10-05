# Final polish QA (4–5 October 2026)

The pre-deploy series, PRs 00–10 (plan approved by Onur on 4 October 2026). Captures come from a local production build (`next start`) with headless Chromium: `QA_URL=http://localhost:3400 node scripts/qa/final-polish.mjs`.

## Captures (`captures/`)

| File | Shows |
| --- | --- |
| `en-1440-opening`, `tr-1440-opening`, `tr-390-opening` | The wordless scroll hint hanging below the chin; no controls over the desk |
| `en-1440-portrait`, `tr-1440-portrait` | The portrait monitor's closer framing (1/1.15 of the height) with the new "Tool-calling agents" row |
| `en-1440-final-view`, `tr-1440-final-view` | The final hold: paper edges showing at the sides, the hint, no buttons |
| `en-1440-curtain`, `tr-1440-curtain` | The paper curtain at 40%: About beneath, the desk receding and dimming |
| `en-1440-about`, `tr-1440-about`, `tr-390-about` | Studio About after the curtain, and on a phone |
| `en-1440-sheet-hold`, `en-1440-sheet-cover` | Section sheets: About holding, then Projects sliding over it |
| `en-1440-card-gymrap`, `en-1440-card-archive` | GymRap's card with its synthetic email screens; the four-entry archive |
| `en-1440-research`, `en-1440-contact` | The paper beside the independent study; Contact with copy and CV request |

## Measurements

| | Before | After |
| --- | --- | --- |
| First-load script (`/en`, reduced motion) | 219,622 B | 178,019 B (ceiling 184,000) |
| First-load stylesheet | 17,619 B | 21,001 B (ceiling 21,500, see `tests/e2e/budgets.json`) |
| Portrait close-up at 1440 × 900 | 692 px | 783 px |
| Desk frames while scrolling through a reading stop or the curtain | one per scroll event | 0 |
| CSP violations over a full desk scroll (Chromium) and the page (WebKit) | n/a | 0 |
| Technologies / balls | 32 / 27 | 41 / 30 |

## Checks

- Unit tests (177): timeline exit segment, About rotation bounds, measurements and withdrawn scores, description filter, certificates, evidence links, header rules, CSP and lab rules, activity de-duplication.
- Browser tests per PR on desktop Chromium, plus phone projects for the controls, sheets and headers; CI runs all three projects on every PR. New specs: `desk-controls`, `sheets`, `curtain`, `headers`.
- axe: no violations on the journey stage with controls focused, at every curtain state and on the case study, research and archive pages.

## Open

- Visual and content gates (see `docs/release.md`, "Final polish").
- Desktop Safari 26 and Firefox passes of the sheets and curtain; Firefox keeps the sheets' hold without the shrink (no scroll-driven animations yet).
- Physical iPhone Safari.
- The lab review styles still ride in the shared first-load CSS chunk (Turbopack's chunking); 1–2 KB.
