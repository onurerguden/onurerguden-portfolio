# Hero scene budget

The four-layer object is an original schematic of data becoming a working system. It is not presented as the literal architecture of any project. Ceramic inserts and cobalt acrylic plates are drawn from primitives; the fallback SVG is the same conceptual diagram.

- **Model and texture requests: 0 bytes.** No GLTF, external textures, environment maps, shadow maps, or post-processing.
- **Geometry: 29 meshes / approximately 1,000 triangles**, below 100,000 triangles and 50 draw calls. Transparent plate materials can affect render ordering; verify actual renderer counters in the production scene when changing materials.
- **DPR: capped at 1.5**, low-power renderer preference, orthographic camera. No continuous rotation or animation loop. Demand frames are invalidated by scroll, resizing, and initial scene setup.
- The separate dynamic scene chunk mounts at browser idle only while visible. Offscreen canvas unmounts, removing scroll listeners and releasing renderer resources. Reduced motion never needs WebGL. Preference changes and context loss return to the SVG.
- The scene is decorative and unfocusable. The meaningful layer labels remain HTML. No interactions require waiting for a model or moving a pointer.

## Verification

Run a production build and inspect the browser Network panel with cache disabled: record compressed size of the lazy Three/R3F chunks separately from route JavaScript. The 1.5 MB cap applies to models/textures, not the JS runtime. Confirm no 3D chunks load with reduced motion, and that their load starts after the initial document/content paint. Record device, browser, viewport, and network profile alongside results.

In React Three Fiber's development renderer inspect `gl.info.render.calls` and `gl.info.render.triangles` after a settled frame; these are the measured values and supersede the primitive estimate above. Use browser Performance/GPU tooling to confirm idle frames stop after scroll and the canvas disappears offscreen. Simulate `WEBGL_lose_context` and confirm poster replacement with no lost content. Resize from 320 px to desktop and check labels, crop, and shape legibility.

Test an actual iPhone Safari before production release; desktop device emulation does not validate mobile GPU memory or WebGL behavior. No iOS measurement is claimed by this document.

## September 11 replacement

The schematic above is retained as historical documentation only; it is no longer the homepage hero. The homepage now uses the desk and room journey. Its actual multi-pass accounting, reflection resolution, fallback and QA record are documented in `docs/qa/room/README.md`. Do not apply the schematic's zero-texture or 50-call estimates to the new reflective room.

## September 16 cosmic environment

The desk journey now ends on a thin elliptical marble platform in a cosmic field. Room walls and ceiling were removed. The replacement adds one responsive segmented grid plane, one point geometry for all stars and one platform edge; it introduces no external texture, post-processing pass or continuous animation. The existing marble texture supplies the platform top.

Desktop uses 3,840 grid triangles and 240 points; mobile uses 2,304 grid triangles and 130 points. The same geometry remains visible at every camera stop. Pointer values stay in refs and shader uniforms. Frames are invalidated during scroll, pointer movement and the approximately one-second return to rest, then stop. The established steady-frame ceiling remains 130 draw calls / 210,000 submitted triangles, including reflection and shadow passes. Current measurements and screenshots live in `docs/qa/room/README.md`.

## September 29 section stages

The homepage now allows section scenes after the desk (see `docs/design.md`). They share one policy, implemented in `src/lib/stage-registry.ts` and `src/components/three/use-section-stage.ts`:

- **At most two live WebGL contexts, including the desk.** Visible stages outrank offscreen ones; the desk has the highest priority among offscreen stages. A stage asks for a context within 60% of a viewport and gives it up after staying more than 160% away for a second.
- **The desk releases its context** once its stage is more than 1.5 viewports away (after one second). Returning remounts it from the `useGLTF` cache; the language's `room-poster-{en,tr}.webp` covers the stage until the remounted scene reports ready. The section carries `data-journey-released`.
- **Mounting** waits for the next frame and then idle time (`requestIdleCallback` with an 1.8 s timeout, or 250 ms where it is missing). Reduced motion, missing WebGL2 and an earlier failure keep a stage static for the visit.
- **Canvas defaults** (`SectionCanvas`): demand frames, `never` when the stage is offscreen, the tab is hidden or motion is paused; DPR at most 1.5 (1.25 on coarse pointers); low-power; `aria-hidden` and `tabindex=-1`. Scenes that animate on their own declare a frame rate, capped at 30 fps on coarse pointers. Context loss shows the section's static state.
- **Counters.** Every section canvas reports `data-stage-frames`, `data-stage-draw-calls` and `data-stage-triangles`, measured the same way as the desk.

Per-section targets are recorded here as each scene lands; they are measured in the production build, not estimated.

### About objects (measured 29 September)

Procedural geometry only: no model or texture downloads; the three logos share the generated icon data with the tech-stack balls. Steady frame in the production build, headless Chromium: **desktop 20 draw calls / 79,492 triangles**, **390 px phone 6 / 14,650** (budget 32 / 120,000). The first frame also renders the one-off Lightformer environment capture. The scene animates at up to 60 fps (30 on coarse pointers) only while the section is visible and motion is not paused, and unmounts once the section is more than 1.6 viewports away.

### Tech-stack balls (measured 30 September)

One instanced sphere mesh draws every ball, with logos sampled from a texture atlas drawn at runtime from the generated icon paths (no image download). Steady frame in the production build, headless Chromium with scenes forced on: **1 draw call** (plus the one-off Lightformer capture) and **58,320 triangles** for 27 balls on desktop, **38,880** for 18 on a 390 px phone (budget 8 / 80,000). The simulation is a fixed-step 2D solver (`src/lib/physics/ball-world.ts`): about 0.05 ms per frame for the full pile in Node. Frames render only while a ball moves or the pointer is over the stage; a settled pile draws nothing, and scroll events alone drive the drop, launch and return.

## October 2 desk story

- **Shadow maps no longer refresh every frame.** three r185 renders `PCFSoftShadowMap` as `PCFShadowMap` and rewrites the type; R3F set it back on every Canvas render and, seeing a change, marked the cached maps dirty, so each scroll frame paid for a shadow pass inside the platform's reflection. The desk canvases now name `shadows="percentage"` and the journey scene is memoised. Settled desk frames at 1440 × 1000, headless Chromium, production build: **monitor 40 draw calls / 53,285 triangles, MacBook 45 / 74,777, final view 107 / 189,053** (main before: 140 / 145 / 107). The one-off environment and shadow setup still peaks at about 200 calls.
- **The MacBook's balls (`desk-stack`).** A second, transparent, demand-rendered canvas inside the MacBook's panel, sized by its own layout box (`resize.offsetSize`). The story, not an intersection observer, says when it is wanted (from halfway through the monitor) and visible (on the MacBook until the Explorer has risen); it releases its context once the list is open. The simulation lives outside the canvas, so a released and reacquired context draws the same frame. Settled frame: **1 draw call, 19,440 triangles for 27 balls (24 × 16 segments) on desktop; 6,336 for 18 (16 × 12) on a Pixel 7** (budget 8 / 80,000). At most two contexts at once: the desk and the balls.
- **Behind a takeover** the desk's frame loop is `never`.
- **First load (`/en`, reduced motion):** script 218,328 B, font 47,964 B, CSS 17,619 B, images 151,986 B (`tests/e2e/budgets.json`). three.js stays out of it: the page's own screen geometry is in modules without three.

## October 4 final polish

- **Desk.** Scrolling inside a reading stop no longer redraws the desk: only a change of camera stop, travel, active screen or takeover invalidates a frame. The paper curtain is CSS (clip, scale, dim) over a still camera, so the desk draws no WebGL frames while it is drawn aside, and stops drawing once it is gone. Touch screens cap the desk's pixel ratio at 1.25. The grid curtain widens with the aspect up to 32:9; 16:10 keeps 3,840 grid triangles (more segments only on wider views, in proportion to the width).
- **Loading.** The model (497 KB) and the Draco decoder are preloaded alongside the scene chunk and cached as immutable (`?v=` revisions; the decoder lives in a folder named for its three release). Shaders compile before the desk and About report ready.
- **About.** Geometry is built once per visit; one instanced mesh draws every contact shadow (one draw call, no shadow map); the scene's code is fetched while the desk shows the MacBook. Draw calls stay within the existing 32 budget.
- **First load** (`/en`, reduced motion): 176 KB script (from 220 KB), 20 KB CSS, 48 KB fonts, 152 KB images; `motion` is no longer a dependency.

## October 8 performance series

Measured with `npm run perf` (`docs/qa/perf/`): headless Chromium on an M1 Pro GPU, 1440 × 900 at 2x, wheel scrolling from 0.7 s, medians of three runs. "First visit" changes every shader's source so no GPU cache helps.

|                         | Longest frame, first visit | Returning | 4× slower CPU | Desk ready (first / returning) |
| ----------------------- | -------------------------- | --------- | ------------- | ------------------------------ |
| Baseline (main 6970b7e) | 3,063 ms                   | 180 ms    | 344 ms        | 4.4 s / 1.2 s                  |
| Desk warm-up            | 898 ms                     | 148 ms    | 341 ms        | 3.5 s / 1.2 s                  |

The warm-up's remaining first-visit frame is the reflective floor: its blur pass and one reflection variant compile inside the hidden frame.
