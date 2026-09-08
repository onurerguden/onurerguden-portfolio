# Desk journey review

Local production review, September 7, 2026. Separate from the homepage; no field performance claim.

## Experience

`/en/lab/desk/journey` and `/tr/lab/desk/journey` implement wide desk → portrait projects → ultrawide research → MacBook biography/contact → the shared homepage continuation. Both routes are noindex and unavailable on production Vercel deployments. The existing desk inspection route is preserved.

The pinned section uses 7.5 stable viewport heights of native scrolling, split into 0.5 / 0.75 / 2 / 0.75 / 1.25 / 0.75 / 1 / 0.5. A pure timeline separates screen reading from cubic camera travel; reverse scrolling and instant section jumps use the same state. Roll peaks below two degrees and returns to zero for reading. Other screens dim through an opacity overlay. No autonomous motion or nested scroll containers.

The wide camera matches the Blender poster's position and target; its field of view adapts to the contained 4:3 image. Narrow viewports retain the content on physical screens, with a center crop for the ultrawide. Project summaries come from existing content; publication status and journal come from shared facts. Homepage continuation is shared rather than copied.

## Validation

- `npm run check`: typecheck, lint, **27 unit tests**, bilingual content validation and production build pass.
- `npm run test:e2e`: **57 passed, 6 skipped**. Skips are documented headless WebKit GPU cases, including the original desk tests; static WebKit paths pass.
- Active and static accessibility audits report zero WCAG A/AA violations in tested Chromium views; static views also pass in headless WebKit.
- Reading camera positions stay identical while screen content advances; forward/reverse scrolling, focus jumps, native section exit and offscreen rendering are covered.
- A delayed model starts at the current scroll position. Download failure, context loss, reduced motion and disabled JavaScript preserve semantic content without a pinned empty region. Loading has a 12-second static fallback.
- Focus testing caught browser-induced inner scrolling; `overflow: clip` fixes it. Failure testing caught a stale scroll callback hiding the fallback heading; inactive journeys now ignore those updates.
- At 390 × 844, projected body text measures at least 16 CSS px at all three reading stops. A 640 × 400 zoom-equivalent viewport has no horizontal overflow and retains the skip link. This is viewport testing, not a claim of physical browser zoom/device validation.

## Evidence and budgets

`desktop-*.png` and `mobile-*.png` cover the opening, all reading stops, transition midpoints, final cards and exit. The two `.webm` recordings show real browser scroll playback. `browser-report.json` records camera coordinates and renderer counters; it contains no page errors or horizontal overflow.

Maximum sampled renderer load: **20 draw calls / 71,758 triangles**. The unchanged model is **392,940 bytes** with 71,746 exported triangles, within the 1.5 MB / 100k triangle / 50 draw-call budget. DPR remains capped at 1.5. No post-processing was added.

`network.json` records cold-context local encoded resource sizes. Total fetched JavaScript (including application/runtime code and the decoder wrapper): **468,056 bytes**. GLB and decoder WASM are listed separately. This total is not a claim about the isolated 3D bundle, CDN transfer, FPS or Core Web Vitals.

## Interface guideline audit

Snapshot: `guidelines.md`, SHA-256 `5a775e6411f790f518dbc9c1fa7c50a89e6873502d9a3530a6eb223a590bcfe8`.

- `src/components/desk/journey.tsx`: pass — semantic navigation, modified-click support, loading status, focus restoration and reduced/static fallback.
- `src/components/desk/journey-scene.tsx`: pass — decorative canvas hidden from assistive technology; actual links remain HTML; focus reveals the matching screen/card.
- `src/components/desk/journey.module.css`: pass — explicit focus/hover states, safe-area padding, touch targets and interruptible transforms/opacity.

The approved brief intentionally uses first person and sentence-case headings, overriding generic copy defaults. Actual camera transforms are the approved 3D effect. No form or destructive-action rules apply.

Physical iOS Safari, measured device FPS and final visual approval remain outstanding. The study does not claim photographic accuracy or production readiness.

Lazy 3D JavaScript measured separately: **262,954 encoded bytes**, identified from the production dynamic-import chunk list. The Draco wrapper adds **11,748 bytes** and WASM adds **63,458 bytes**; shared application/runtime code and CSS are excluded from the 3D JavaScript subtotal. See `network.json` for the exact chunk paths and method.
