# Desk model verification

September 7, 2026. Local production build; no field performance claim.

- `npm run check`: typecheck, lint, 23 unit tests, bilingual content validation and production build pass.
- Geometry checks cover transfer/triangle/material budgets, embedded assets, integration anchors, monitor-top alignment and the 50% clearance reduction.
- `blender/` contains four camera stops plus mouse, headphones, riser, front, side and lamp inspection renders. `browser-*.png` captures the actual interactive renderer.
- `browser-report.json` records measured renderer counters, local resource sizes, accessibility findings and offscreen behavior.
- Full browser coverage includes English/Turkish parity, static-first loading, camera transitions, reduced motion, failed downloads, context loss, keyboard controls and overflow checks. Headless WebKit GPU checks are explicitly skipped; this is not physical iPhone validation.

## Visual review

The September 7 reference controls aligned touching monitors and the right-offset Lenovo assembly on the riser. The laptop remains a 14-inch MacBook Pro M1 Pro. Front/rear riser rails were rebuilt; close-up inspection caught and removed spline overshoot. Mouse wheels were lowered into the body after the initial detail render. The right lamp's extra square base is removed, and the left light sits at the rear-left corner.

Physical device thicknesses and exact depth placement remain photo-derived. Final visual approval and physical iOS Safari testing remain outstanding; this lab is not the published homepage.

## Measured final export

GLB: 392,968 bytes; 71,746 exported triangles; 18 material batches. The wide browser view measures 71,758 rendered triangles and 20 draw calls including viewer geometry. Lazy JavaScript plus the decoder wrapper transferred 272,223 encoded bytes in the local production capture; decoder WASM is recorded separately in the network report. These are local transfer measurements, not deployment or phone performance guarantees.

The active 3D accessibility audit reports zero violations; the capture reports no page errors, no narrow-viewport overflow, and stopped rendering once the stage is offscreen and pending frames have settled.

Final full Playwright run: **39 passed, 3 skipped** across desktop Chromium, mobile Chromium and mobile WebKit. The image optimizer explicitly allows only the current desk revision query; static image loading is checked in both languages and all three browser projects.

Tablet/headphone follow-up: tablet edges are parallel to desk axes and the tablet sits left of the MacBook. The narrower oval headband joins inward-tilted cups through closed adjustment sliders. `accessory-fit.json` records a 1.216 mm separation between cushion mesh extents in headphone-local coordinates. Final follow-up checks: 23 unit tests and 39 browser tests passed, 3 GPU checks skipped.
