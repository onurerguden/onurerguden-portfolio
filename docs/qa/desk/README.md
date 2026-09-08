# Desk model verification

September 8, 2026. Local production build; no field performance claim.

- `npm run check`: typecheck, lint, 28 unit tests, bilingual content validation and production build pass.
- Geometry checks cover transfer/triangle/material budgets, embedded assets, integration anchors, monitor-top alignment and the 50% clearance reduction.
- `blender/` contains four camera stops plus mouse, headphones, riser, front, side and lamp inspection renders. `browser-*.png` captures the actual interactive renderer.
- `browser-report.json` records measured renderer counters, local resource sizes, accessibility findings and offscreen behavior.
- Full browser coverage includes English/Turkish parity, static-first loading, camera transitions, reduced motion, failed downloads, context loss, keyboard controls and overflow checks. Headless WebKit GPU checks are explicitly skipped; this is not physical iPhone validation.

## Visual review

The September 7 reference controls aligned touching monitors and the right-offset Lenovo assembly on the riser. The laptop remains a 14-inch MacBook Pro M1 Pro. Front/rear riser rails were rebuilt; close-up inspection caught and removed spline overshoot. Mouse wheels were lowered into the body after the initial detail render. The right lamp's extra square base is removed, and the left light sits at the rear-left corner.

Physical device thicknesses and exact depth placement remain photo-derived. Final visual approval and physical iOS Safari testing remain outstanding; this lab is not the published homepage.

## Measured final export

GLB: 474,208 bytes; 90,736 exported triangles; 18 material batches. The wide browser view measures 90,760 rendered triangles and 21 draw calls including viewer geometry. Lazy JavaScript plus the decoder wrapper transferred 299,310 encoded bytes in the local production capture; decoder WASM is recorded separately in the network report. These are local transfer measurements, not deployment or phone performance guarantees.

The active 3D accessibility audit reports zero violations; the capture reports no page errors, no narrow-viewport overflow, and stopped rendering once the stage is offscreen and pending frames have settled.

Final full Playwright run: **57 passed, 6 skipped** across desktop Chromium, mobile Chromium and mobile WebKit. The image optimizer explicitly allows only the current desk revision query; static image loading is checked in both languages and all three browser projects.

Tablet/headphone follow-up: tablet edges are parallel to desk axes and the tablet sits left of the MacBook. The narrower oval headband joins inward-tilted cups through closed adjustment sliders. `accessory-fit.json` records a 1.216 mm separation between cushion mesh extents in headphone-local coordinates. Final follow-up checks: 28 unit tests and 57 browser tests passed, 6 GPU checks skipped.

Tablet placement follow-up: moved 160 mm farther left to x = -0.435 m, preserving height, depth and zero rotation. Regenerated Blender, GLB and all posters; production checks and the full browser suite pass with the same documented GPU skips.

Realism follow-up: authored surface normals, hardware details and a one-time local reflection capture are included. Geometry remains below 100k triangles and transfer remains below 1.5 MB. See the journey review for regenerated screen-content and transition evidence.

## Loading poster correction

The journey now loads `wide-loading.webp`, captured from the production WebGL opening camera at 1280 × 960. The former Cycles poster had a diagonal lightbar highlight and different reflections. This capture uses the same local reflection environment as the live scene; HTML text and controls are excluded. `loading-in-browser.png` verifies the result while the model request is held.

Regeneration: after a model or lighting change, package/build/start the local review, run `node scripts/desk/capture-loading-poster.mjs`, then run `npm run desk:package`, `npm run check` and restart the production server. The capture records the source model hash in `loading-poster.json`; the unit test rejects a poster from an older model. Asset revisioning also covers the new poster.

Validation for the poster correction: typecheck, lint, 29 unit tests, content validation and production build pass. Journey browser run: 17 passed, 3 headless WebKit GPU skips; one offscreen-frame settling assertion initially observed one pending frame and passed on isolated rerun. The delayed-model loading-poster check passed.

## Accessory fit revision

The two MacBook cables now follow constant-height paths to the rear tabletop edge. The lightbar clamp and counterweight sit behind the continuous diffuser. The riser's expanded sheet follows the same sampled shoulder curves as its tubular frame; drawer panels have folded edge supports. The lightbar dial is moved left with 33.6 mm horizontal clearance from the headphone base. The headphone saddle follows the inner padded headband arc and its stem ends below the padding.

`accessory-revision-fit.json` records geometry checks from the editable Blender source (run `Blender --background --python scripts/desk/verify-accessory-fit.py`). These checks cover cable endpoint/height, clamp clearance, dial/base spacing, saddle fit and sheet-to-frame alignment. They do not claim exact physical product measurements.

Updated export: 478,044 bytes, 92,340 triangles, 18 material batches. Support-versus-headphone mesh surface checks report zero intersections. Typecheck, lint, 29 unit tests, content validation and production build pass.

Targeted desk/journey browser suite: **31 passed, 5 documented headless WebKit GPU skips**. Keyboard navigation, reduced motion, delayed loading, context loss, narrow/zoom-equivalent framing and offscreen rendering checks pass. Physical iOS Safari remains untested.
