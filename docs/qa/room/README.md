# Ultrawide-to-room review — September 11, 2026

The approved sequence is now shared by `/en`, `/tr`, and the noindex journey demos. Scroll is native, with a sticky 100svh stage and 8.5 viewport heights of travel. Stops: opening 0–0.15, tabletop 1.15–1.25, portrait reading 2–4, MacBook reading 5–6, room exploration 7.5–8.5. No content has been added to the ultrawide. Research remains in normal HTML after the homepage introduction. The original model and its accessories are preserved.

The room uses matte smoke walls, a local authored 512px marble SVG, a pale ceiling and side daylight. The floor is at -0.694m, immediately below the support contract's -0.692m. The room poster is a capture of the same scene with blank screens from the noindex `/en/lab/desk/room` review route; this route returns 404 in Vercel production. Plants and other decor remain deferred.

## Browser review

Manual review uses the Codex Chromium browser against a local production server, with 390×844 mobile, 1440×900 desktop and 2400×1000 ultrawide viewports. Screenshots in this directory record opening, MacBook and room compositions. The manual mobile viewport is a layout check; actual touch-device behavior is covered by the automated mobile Chromium profile, not inferred from a desktop pointer.

The first review caught a room texture suspending outside the model boundary, which caused the Canvas lifecycle to restart; room and model now share a Suspense boundary. Other corrections include a full-viewport opening, avoiding horizontal overflow, moving chapter controls upward after leaving the opening, explicit header contrast, and larger mobile MacBook text.

## Performance interpretation

Demand rendering stops after input settles and when offscreen/hidden. DPR is capped at 1.5. Reflection resolution is 512 on desktop and 256 below 700px. Geometry is unchanged except for five room planes. The material adds a reflection render plus two blur passes; scene counters now count **all passes**, rather than only the last renderer call. A settled desktop room capture measured 106 calls / 192,503 submitted triangles. The initial environment/shadow capture peaked at 279 calls; moving drawers also refresh shadow maps. These are pass submissions, not unique mesh triangles.

The prior 50-call budget described the desk without a reflective room and is not comparable to all-pass accounting. The revised steady-frame check is 130 calls / 210,000 submitted triangles. Initial and moving-shadow frames are recorded separately. This is a laboratory check, not a field INP/LCP or physical iPhone GPU claim.

## Accessibility and release

English/Turkish content, reduced motion, no JavaScript, failed model, context loss, native keyboard navigation, screen links, reverse scroll and offscreen idle behavior are exercised by the updated test suites. Reduced motion loads a room poster and HTML without requesting the model. The scroll cue animates twice (3.6s total), and never animates under reduced motion.

Web Interface Guidelines were reviewed from the upstream source on September 11. The approved first-person and sentence-case contract overrides the source's stylistic defaults. No deployment or merge is included. A physical iPhone Safari GPU review and Onur's visual acceptance remain release prerequisites.

## Completion audit — September 15, 2026

The remaining array-position camera lookup was replaced with explicit contract screen identities. Reading ranges and stop names now share a screen-keyed configuration. Camera arc vectors are reused instead of allocating two vectors on every rendered frame. Changing the OS motion preference back to no-preference now re-enables the journey without requiring a new intersection event or reload; a browser regression test covers both directions.

The current production build passes type generation, TypeScript, ESLint, all 40 unit tests and content validation. Final browser results are recorded below after the complete run. The existing review backdrop is #17191c; its pixel assertion now checks [23, 25, 28], correcting an outdated pure-black expectation without changing the scene.

Physical iPhone Safari testing has not been performed: no physical iPhone browser is available in this environment. The automated iPhone WebKit profile validates the HTML/static path and must not be presented as a physical GPU test.

Manual follow-up confirmed the frameless opening, leg-free tabletop composition, complete desk and room at 2400×1000, and reverse exit into the introduction. `ultrawide-room-final.png` records the final room. A subsequent all-pass counter sample recorded 129 draw calls / 194,557 triangles, with a 216-call peak during the review. These remain laboratory render counters, not FPS or field performance measurements. Loading status text is now visually clipped instead of `display:none`, preserving its live announcement for assistive technology.

The final Playwright run completed 87 scenarios with one shared GPU worker: **73 passed and 14 were skipped**. The skipped cases are the explicitly gated WebGL interaction checks in the headless mobile WebKit project; WebKit still passed the localized static content, reduced-motion, no-JavaScript, failure fallback, keyboard, navigation and API checks. A focused Chromium interaction run also completed **12 passed and 6 WebKit skips**, covering both locales and both the review and homepage journey surfaces.
