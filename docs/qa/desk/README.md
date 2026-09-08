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
