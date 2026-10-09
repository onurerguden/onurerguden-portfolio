# Performance measurements

`scripts/perf/measure.mjs` loads the home page in headless Chromium on the machine's real GPU (ANGLE Metal) and wheel-scrolls through it from 0.7 s after navigation, as a visitor who does not wait for the page to finish loading. It records long animation frames, frame intervals while scrolling, the WebGL calls that block the main thread and the number of shader programs.

| Scenario      | What it stands for                                                                                                                                                                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `first-visit` | A new browser profile, and shaders the GPU has never compiled: `scripts/perf/inject.js` adds a branch the compiler cannot remove to every shader, with a new value on every load, so the GPU caches of a machine that has seen the site before do not hide the cost. |
| `returning`   | The same profile after one full visit: HTTP and shader caches are warm.                                                                                                                                                                                              |
| `cpu4`        | Returning, with the CPU slowed four times (CDP), for a mid-range laptop.                                                                                                                                                                                             |
| `reduced`     | Reduced motion: the static flow.                                                                                                                                                                                                                                     |

```bash
npm run build && npx next start --port 3100
npm run perf -- --label <name>
npm run perf -- --scenario returning,cpu4 --input notch,trackpad --label <name>
npm run perf -- --scenario returning --input trackpad --runs 1 --trace --label <name>
npm run perf -- --scenario returning,cpu4 --device "iPhone 13" --label <name>
npm run perf -- --scenario returning --input trackpad --headed --label <name>
npm run perf:check
```

Results are medians of three runs, written to `docs/qa/perf/<label>.{json,md}` (or `--out <dir>` for a scratch run). `perf:check` compares them with `tests/perf/budgets.json`: a scenario's key is `returning`, `returning/trackpad` or `returning@iPhone 13`, and a limit can name a nested field (`regions.opening.p99`). CI renders WebGL in software, so these runs happen on a GPU-backed Mac and their summary goes into each pull request.

### How the visitor scrolls (`--input`)

| Input      | Wheel events                      | What it shows                                                                               |
| ---------- | --------------------------------- | ------------------------------------------------------------------------------------------- |
| `measure`  | 120 px every 100 ms               | The steady flick the first budgets were set with.                                           |
| `notch`    | 100–120 px every 80–150 ms        | A mouse wheel's notches: the cost of each event and how far one notch moves the camera.     |
| `trackpad` | 6–30 px every 8–16 ms             | A trackpad's stream: about one event per frame, so any per-event cost lands in every frame. |
| `touch`    | swipes of 300–600 px (`--device`) | A phone, with Chromium standing in for its browser and touch gestures through CDP.          |

The sequence is seeded (`--seed`), so runs of one input scroll alike. Headless Chromium applies each wheel event in one frame and draws at 60 Hz; `--headed` opens a window on this display, the only way to measure a 120 Hz screen. Each result records the display's refresh rate, and a frame counts as slow when it takes 1.2 refresh intervals or more.

### What each run records

- Long animation frames, with the scripts behind them, and frame intervals while scrolling: overall and per region of the page (opening, monitor, MacBook, room and curtain, About, the sections after it), with the share of slow frames and the longest run of them.
- Per canvas (desk, balls, About): the frames it drew and its GPU time per frame, from `EXT_disjoint_timer_query_webgl2`. "About frames under the curtain" counts About's frames while the journey still covers it.
- The desk camera's step per frame, and its largest step in one frame: large when a notch moves the camera in one go.
- Every scroll the page makes itself (`scrollTo`, `scrollIntoView`) and its caller; a correction under 1 px still cancels the browser's smooth scrolling.
- The share of scroll events that find style or layout already invalid, and whether the desk lowered its resolution.
- With `--trace`, a Chrome trace of the visit, read by `scripts/perf/trace.mjs`: the cost of each wheel and scroll event, main-thread time per frame, layout forced by scripts, and the frames the compositor drew without the main thread's update (partial) or dropped.
- WebGL calls that blocked for longer than a frame, and when; shader programs created.

The harness sets `localStorage["portfolio:qa"]` to `1` for the page's QA-only attributes.

`npm run qa:stops -- capture <label>` captures the desk's stops in both languages at 1440 × 900 and 2400 × 1000 into `work/perf-stops/`; `npm run qa:stops -- compare <before> <after>` prints the PSNR of each pair and fails below 45 dB. Two captures of the same build measure 54 dB or more. About sways on its own and is captured for review only.

## Baseline (8 October 2026)

`baseline.md`, production build of main (6970b7e) on an M1 Pro. A first visit froze for about 3 s at the moment the desk became ready: 53 shader programs linked synchronously on its first frame (4.2 s of blocking WebGL calls in total). Returning visits had one 180 ms frame; a four-times slower CPU, six frames over 100 ms in the first seconds. Once loaded, scrolling held 60 fps (p95 17 ms).

The live site measured the same day (cold HTTP cache, TTFB 320–415 ms from fra1) froze 3.4–4.6 s on a first visit.

## Butter baseline (9 October 2026)

`butter-baseline.md`, production build of main (ce63d36) with trackpad input. The page no longer freezes for long, but it does not flow: every visit lowered the desk's resolution on an M1 Pro, About drew about 230 frames while the curtain still covered it, a notch moved the camera nearly four times as far as the median frame step, and the MacBook's Explorer list dropped about one frame in five while it scrolled (a single 33 ms frame each time, with the main thread mostly idle).
