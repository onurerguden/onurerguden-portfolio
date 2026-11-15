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
- **Mounting** waits for the next frame, a slot held for 300 ms and then a pause in scrolling: 200 ms without wheel, touch or scroll input (`src/lib/scroll-pause.ts`), or 3 s of continuous scrolling at most. Preparation (warm-up, the About parts, the ball atlas) then runs in slices of at most 6 ms, one per frame (`src/lib/yield.ts`). Reduced motion, missing WebGL2 and an earlier failure keep a stage static for the visit.
- **One studio environment per page.** The first context to light a scene draws the three panels and filters them into a PMREM, with its programs linked in the background, then reads the result back to the CPU; every other context uploads that copy (`src/components/desk/studio.ts`). Since three 0.187 the PMREM is a cube with six mip levels (256 px down to 8 px per face, about 4 MB as half floats on the CPU), uploaded as a compressed cube texture stored mirrored so it samples exactly like the original. Section scenes no longer link the capture's and the filter's programs, and the maker lets its own go once done.
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

With the warm-up alone, the remaining first-visit frame was the reflective floor (its blur pass and one reflection variant compiled inside the hidden frame). Without the live mirror the desk shows with no long frame; the first-visit maximum is now About's scene mounting (about 9 s in). Final view: 55 draw calls / 101,287 triangles, peak 136 during the one-off setup; 36 shader programs.

The lighter model does not move main-thread numbers (its cost was never the main thread); it cuts the download from 497 to 311 KB and the final view's submitted triangles from 101,287 to 54,769, which matters on integrated GPUs.

## October 9 butter series

The page no longer froze after the performance series, but it did not flow. Three experts (graphics, browser runtime, motion) found the remaining cost was feel, not speed: the camera followed a mouse wheel's notches one-to-one, R3F raycast the whole desk on every wheel event, section scenes were prepared while the visitor scrolled, About drew beneath the closed curtain, and the desk lowered its resolution on computers with GPU time to spare. Merged as #95–#106; measured on the live site (`docs/qa/perf/butter-final.md`, before: `butter-baseline.md` on main's build):

| Trackpad scrolling, M1 Pro, 60 Hz (medians of 3)          | Before (9 Oct)    | After             |
| --------------------------------------------------------- | ----------------- | ----------------- |
| Longest frame: first visit / returning / 4× CPU           | 512 / 83 / 211 ms | 258 / 59 / 179 ms |
| Frames over 50 ms while scrolling, desk ready (returning) | 2                 | 1                 |
| Slow scroll frames: first visit / returning / 4× CPU      | 3.1 / 3.0 / 4.8 % | 1.2 / 0.5 / 1.7 % |
| Slow frames reading the MacBook's Explorer list           | 18–24 %           | 0–3 %             |
| Desk GPU time per frame, p95                              | 7.7–8.9 ms        | 6.8–7.5 ms        |
| About GPU time per frame, p95                             | 3.6–4.7 ms        | 2.2–2.4 ms        |
| Desk lowered its resolution on an M1 Pro                  | every visit       | never             |
| Camera's largest step in a frame, notched wheel           | 0.30 m            | about 0.1 m       |

- **Per frame:** no wheel raycast; raycasts only where the pointer can act; pointer moves redraw only for a visible change; one story state per scroll; QA attributes only with `portfolio:qa`.
- **Section scenes:** prepared on a scroll pause, a frame at a time; the studio environment built once per page; About draws only once the curtain opens; balls and About at 1.25 device pixels on dense screens.
- **Desk resolution:** judged by the desk's own GPU time against the display's refresh rate, changed only while the desk is still, remembered for a week.
- **Motion:** the story clock (`src/lib/desk-story/clock.ts`), travels paced by what the visitor sees, no stop at the desktop waypoint, the cursor's dot drawn by the system.
- **Low tier:** no sun shadow or glow lights, half-density grid, down to 0.85 device pixels; Intel Macs in Safari count as low.
- **Phones:** the remaining hitch is evaluating three.js once (about 160 ms at 4× CPU), which now lands in a scroll pause; a three-free balls renderer was judged not worth it.

## November 15 final revisions

A friend's Windows laptop (Chrome, a 1536 × 730 window) felt heavy throughout, and no one could measure it. `npm run perf` learned to stand in for such a computer (`--quality`, `--cpu`, `--gpu`, `--viewport`; `docs/qa/perf/README.md`), and only what its traces named was changed. Before: main (ad7cdda), `docs/qa/perf/final-baseline*.md`; after: `final-after*.md`. Medians of three runs, notched wheel / trackpad.

| Estimated laptop, 1536 × 730 at 1.25x                              | Before         | After                               |
| ------------------------------------------------------------------ | -------------- | ----------------------------------- |
| Slow scroll frames, low tier, 4× slower CPU: returning             | 3.5 / 2.7 %    | 3.0 / 2.0 %                         |
| …first visit                                                       | 3.7 / 3.4 %    | 4.1 / 2.3 %                         |
| Frames over 50 ms while scrolling, desk ready (returning, 4×)      | 4 / 4          | 1 / 2                               |
| Slow scroll frames, low tier, 6× slower CPU (returning)            | 12.1 / 12.7 %  | 8.8 / 8.3 %                         |
| …in the regions of the desk story (6×)                             | 12–34 %        | 9–23 %                              |
| Longest frame, 6× slower CPU                                       | 193 / 183 ms   | 161 / 179 ms                        |
| Desk GPU time per frame (p95), GPU load 80: high tier              | 15.8 / 17.8 ms | 14.4 / 14.3 ms                      |
| …low tier                                                          | 10.7 / 11.9 ms | 11.3 / 11.7 ms                      |
| Slow scroll frames, GPU load 80: high tier                         | 1.5 / 1.2 %    | 1.4 / 0.6 %                         |
| A slow GPU taken for a fast one (GPU load 320): desk GPU time, p95 | not measured   | 38 ms, then 13 ms on the next visit |

- **Cursor ring.** It hit-tested the page on every scroll event, which laid the page out in the middle of each scrolling frame; with a mouse on the page 21 % of frames ran slow against 15.6 % without (6× CPU, one run each). Its look now catches up 100 ms after the page stops, as the browser's own hover does.
- **Steel mesh.** three draws a transparent double-sided material in two passes and flags it for a new program before each, so the desk's expanded steel mesh looked its program up twice and uploaded all its uniforms again in every frame. It is now two meshes, back faces and front; the desk's stops compare at 46 dB or more with the build before (`npm run qa:stops`), in both tiers.
- **About's logos.** The Hugging Face mark extruded into 27,000 triangles in one task while the MacBook was on screen. Curves are sampled by their length (10,500 triangles for the same outline at the size About shows it) and each outline is extruded in its own step.
- **A desk that cannot keep up.** The desk may now draw below one device pixel per CSS pixel on any tier (0.85 high, 0.75 low). If its frames miss the display's budget even there, the site takes the low tier for whatever mounts next and for the week's visits (`demoteQuality`, `src/lib/quality.ts`); a visitor's own choice still wins. Under a GPU load of 320 the first visit stepped 1.25 → 1 → 0.85 and then to the low tier; the next visit's desk took 13 ms per frame instead of 38.
- **GPU names.** "AMD Radeon(TM) Vega 8 Graphics", "Radeon(TM) R5", "Radeon(TM) 610M" and "Intel(R) Graphics" (Core Ultra) now read as integrated.
- **Tried and left out,** each on an A/B that showed no gain: `content-visibility: auto` on the sections after the desk (layerize and commit fell, slow frames did not), `will-change: opacity` on the screens' shades, and removing the screens' hover state. The low tier's section scenes stayed as they are: About and the balls took 3–4.5 ms and 10–12 ms per frame (p95) under the GPU load, inside a 60 Hz frame.

What is left is the story's own frame: about 3 ms of main thread on the M1 Pro (three's draw, then style, layerize and commit for the screens' HTML), which is a whole 60 Hz frame on a CPU six times slower. At 4× the returning visit meets the series' target (under 3 % slow frames); at 6× it does not, and a first visit with a notched wheel did not improve (About's shaders compile wherever in the story its mount lands). None of this was measured on the laptop itself: `docs/qa/feel-test.md` now asks for the GPU's name, which says which tier the site picked.
