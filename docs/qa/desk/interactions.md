# Desk object interactions — September 9, 2026

The review and scroll journey share one interaction runtime. No homepage integration or music asset is included. The selected track can later be configured with its path and title in `src/lib/desk-audio.ts`.

## Verified behavior

- The visible black dial below the ultrawide switches the left light, lightbar and rear bias light together. The right lamp stays independent; its five colors affect only the emissive lamp and its shadow-casting pool on the desk; the backdrop stays black.
- The headphones lift and settle without moving their stand. Missing music is reported in the native control disclosure; no audio request occurs.
- The mouse uses five bounded paths and a short click ring. Rapid clicks do not accumulate extra animations. The tablet is fixed while the pencil rolls onto the mat and returns.
- Both locales provide keyboard buttons, pressed states for lights/music, visible focus, 44 px targets and a polite music status. Mobile touch controls fit without horizontal overflow.
- Reduced motion in the review snaps lights and suppresses accessory motion. The journey keeps its static fallback. Model failure and context loss keep the existing recovery paths.
- Demand rendering stops at rest and when the scene is inactive. The model has 93,011 triangles and is 462,644 bytes. The main render pass remains within the existing 50 draw-call budget; shadow maps add separate depth passes while rendering.

## Lighting correction

The backdrop is fixed black in both Canvas views and their stage CSS. The right lamp has a brighter emissive diffuser, a local additive halo and a wide shadow-casting spotlight aimed at the desk. Model meshes receive shadows and cast them, except for the lamp housing around its own source. A visible warm strip below the ultrawide and its stronger rear fill follow the same dial transition as the lightbar and left vertical light.

## Verification

`npm run check` passes: typecheck, lint, 38 unit tests, English/Turkish content validation and production build. The unit suite covers exported interaction anchors, neutral receiver materials, motion endpoints and bounds, pencil clearance, missing audio, pending-play cancellation, playback errors and cleanup.

The 54-case browser matrix finished with 42 passes, 11 expected headless WebKit GPU skips and one wide-viewport mobile camera timeout. The camera polling deadline was raised from 5 to 20 seconds for software-rendered high-resolution frames; the unchanged occlusion assertions then passed on both desktop and mobile in a targeted rerun. All 43 executable scenarios are verified.

Browser coverage includes both demos/locales, direct object picking, keyboard operation, color cycling while task lights are off, repeated clicks, reduced motion, render idling, existing camera journeys, occlusion, model failure, no-JavaScript and static fallback behavior. Animation tests use Playwright's controlled clock to inspect short motions without depending on host rendering speed.

Visual review: the lamp uses a bright emissive diffuser and a subtle local halo against a fixed black backdrop. Neutral receiver maps contain no switched-light contributions; moving meshes, curves and text are excluded from their bake. Screen projection and desk layout remain unchanged.

The Web Interface Guidelines review used the [current primary guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md). The approved sentence case and first-person content contract takes precedence over its copy defaults. No remaining actionable findings in the new controls.

Physical iPhone GPU performance remains a release prerequisite; headless WebKit fallback coverage and Chromium touch emulation are not a physical-device test.

## Reproduce visual evidence

With the production server running:

```sh
DESK_REVIEW_URL=http://localhost:3101 node scripts/desk/capture-interactions.mjs
```

The script saves `interactions-on.png`, `interactions-off.png`, `interactions-purple.png` and `interactions-mobile.png` in this directory. For browser tests, `PLAYWRIGHT_PORT=3101` isolates this run from another local server; the default remains 3100.
