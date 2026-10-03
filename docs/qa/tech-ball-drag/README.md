# Technology ball drag QA (3 October 2026)

The MacBook's settled balls can be grabbed with the primary mouse / pen button. A damped spring preserves the grab offset and allows collisions to move neighbouring balls. Release adds a bounded coast; Escape, pointer cancellation, lost capture, blur, resize, motion pause and story phase changes clear the grab. Touch retains native scrolling and tap-to-pin. A labelled ball selector and two native movement buttons provide keyboard and single-click alternatives.

## Validation

- `npm run check` passed: typecheck, lint, 139 unit tests, EN/TR content validation, production build, content tracing and the public asset audit.
- Five new physics tests cover grab offset, smooth movement, held-ball wakefulness, displacement of sleeping neighbours, input and boundary handling, cancellation, bounded release, resizing/reset and return to sleep.
- Across targeted Playwright runs, 21 checks passed and 12 were skipped by the existing device / WebGL gates. Desktop Chromium verifies a real primary-button drag moves the ball, hides its balloon while held, releases and returns to idle drawing. Escape and secondary clicks are checked separately. Desktop and mobile Chromium verify the native movement controls, axe, keyboard activation and pause. EN/TR keyboard access and reduced motion pass in Chromium and mobile WebKit; the software WebKit environment does not provide the WebGL2 physics stage.
- The native-control test's initial run was interrupted to correct its pause selector from `checkbox` to the XP Start menu's actual `menuitemcheckbox`; both final Chromium runs passed.
- First-load budget passed in desktop / mobile Chromium: script 219,622 B, font 47,964 B, image 151,986 B and stylesheet 17,886 B.
- Browser review at 1280 × 800 and 390 × 844 confirmed mouse dragging, mobile button movement and no horizontal overflow. Captures: [desktop](desktop-tr.jpg), [mobile](mobile-tr.jpg).

Physical iPhone Safari coverage remains outstanding as recorded in `docs/release.md`.
