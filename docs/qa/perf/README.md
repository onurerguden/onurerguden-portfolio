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
- The share of scroll events that find style or layout already invalid, whether the desk lowered its resolution, and whether the site took the low 3D tier by itself (a desk that could not keep up, on this visit or one in the week before).
- With `--trace`, a Chrome trace of the visit, read by `scripts/perf/trace.mjs`: the cost of each wheel and scroll event, main-thread time per frame, layout forced by scripts, and the frames the compositor drew without the main thread's update (partial) or dropped.
- WebGL calls that blocked for longer than a frame, and when; shader programs created.

The harness sets `localStorage["portfolio:qa"]` to `1` for the page's QA-only attributes.

### Another computer (`--quality`, `--cpu`, `--gpu`, `--viewport`)

The lab is an M1 Pro; the visitors who feel lag are on slower machines. Four options stand in for one:

| Option                     | What it does                                                                                                                                                                                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--quality low`            | Forces the site's low 3D tier, which its GPU check picks for integrated Intel and AMD graphics (`src/lib/quality.ts`).                                                                                                                                                     |
| `--cpu 4`                  | Slows the CPU of every measured visit four times (CDP); the first visit of a returning scenario runs at full speed.                                                                                                                                                        |
| `--gpu 24`                 | Adds 24 iterations of arithmetic to every fragment the page's canvases shade (`inject.js`): their GPU time grows with the pixels they shade, as on integrated graphics, which run out of shading throughput long before geometry. The browser's compositing is not slowed. |
| `--viewport 1536x730@1.25` | The window's CSS size and pixel ratio: a 1920 × 1080 laptop at Windows' default 125% scale, with Chrome's toolbars.                                                                                                                                                        |

The estimated laptop of the November 15 final revisions (a friend's Windows laptop that no one could measure) is four runs of the same window:

```bash
npm run perf -- --viewport 1536x730@1.25 --quality low --cpu 4 --scenario first-visit,returning --input notch,trackpad --label <name>
npm run perf -- --viewport 1536x730@1.25 --quality low --cpu 6 --scenario returning --input notch,trackpad --label <name>-cpu6
npm run perf -- --viewport 1536x730@1.25 --cpu 2 --gpu 80 --scenario returning --input notch,trackpad --label <name>-gpu
npm run perf -- --viewport 1536x730@1.25 --quality low --cpu 2 --gpu 80 --scenario returning --input notch,trackpad --label <name>-gpu-low
```

`--gpu` is a load, not a model of a GPU. On the M1 Pro, in that window on the low tier, the desk's GPU time per frame (p95) was 2.0 ms without it, 8.1 ms at 40, 10.6 ms at 80, 11.7 ms at 160 and 17.3 ms at 320, where the desk first lowered its resolution. The profile uses 80: the desk at about five times its cost here, two thirds of a 60 Hz frame. Which real GPU that matches is a guess until someone runs the site on one (`docs/qa/feel-test.md` asks for the GPU's name).

Keep the machine idle while a profile runs: a build or a test run beside it shows up as slow frames.

`--trace --save-trace` also writes each measured visit's whole trace next to the results, for DevTools' Performance panel; use `--out` with a scratch folder, since a trace runs to hundreds of megabytes.

`npm run qa:stops -- capture <label>` captures the desk's stops in both languages at 1440 × 900 and 2400 × 1000 into `work/perf-stops/`; `npm run qa:stops -- compare <before> <after>` prints the PSNR of each pair and fails below 45 dB. Two captures of the same build measure 54 dB or more. About sways on its own and is captured for review only.

### Classes of computer (`--profile`)

Since the flow series (16 November 2026) the options above have names, one per class of computer the site is expected on. A flag still overrides its profile.

| Profile                  | What it runs                                                 | The class it stands for                                                                   |
| ------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `m1-60`                  | the defaults                                                 | The lab itself; the budgets of the earlier series.                                        |
| `m1-120`                 | `--headed`, notch and trackpad                               | A fast GPU on a 120 Hz screen.                                                            |
| `igpu-60`                | `1536x730@1.25`, low tier, CPU 2×, GPU load 80               | Integrated graphics on a 60 Hz laptop screen.                                             |
| `igpu-120`               | the same, `--headed`                                         | Integrated graphics behind a 120 Hz screen (a gaming laptop whose browser uses the iGPU). |
| `igpu-misread`           | `1536x730@1.25`, CPU 2×, GPU load 320, the GPU's own tier    | A slow GPU the site takes for a fast one.                                                 |
| `cpu-slow`, `cpu-slower` | `1536x730@1.25`, low tier, CPU 4× and 6×                     | An old processor.                                                                         |
| `phone`, `phone-android` | `--device "iPhone 13"` and `"Pixel 7"`, returning and 4× CPU | Phones, with Chromium standing in for their browsers.                                     |

```bash
npm run perf -- --profile igpu-120 --label <name>-igpu-120
npm run perf:check -- --profile igpu-60
```

`--headed` profiles open a window on this display and measure at its refresh rate, so the display has to be set to 120 Hz and left alone meanwhile. A profile's ceilings live under `profiles.<name>` in `tests/perf/budgets.json`.

Three numbers came with the profiles:

- **Uneven frames (%)**, per canvas. Each frame a canvas draws lasts a whole number of the display's refreshes. One that keeps up holds one number; one that cannot wavers between one refresh and two, which is seen as judder even at a high average rate. This is the share of a canvas's frames off its usual number, while it kept drawing; the results also list how many lasted 1, 2, 3… refreshes. Draws are timed by the frame they were made in (the document timeline's time), not by the harness's own frame callback, which can run before or after the page's in a given frame.
- **Desk resolution at the end**: the device pixels per CSS pixel the desk settled on, not only whether it ever lowered them.
- **At each stop**: the compositor's layers that draw content inside the window and the area they cover, in views (a layer the size of the window is 1), from the DevTools protocol's layer tree; and each canvas's draw calls and triangles. `--gpu` does not slow the browser's own compositing, so this area stands in for it. It ignores what an opaque layer in front hides: read it as a change between two builds.

### What each part costs (`scripts/perf/ablate.mjs`)

```bash
node scripts/perf/ablate.mjs --quality low --gpu 80 --label <name>-ablation
node scripts/perf/ablate.mjs --scene about --label <name>-about
```

Stops where each scene is on screen and draws it with one thing taken away at a time: each named part hidden, each light off, clearcoat and sheen off, the environment off, three quarters of the resolution. The table says what the GPU saved, so a cut is chosen by its gain and not by its triangle count. With `--gpu` it answers "what do this part's pixels cost a fill-rate-bound GPU"; without, "what does its shader cost here". The page offers its scenes to the script on a QA visit only (`src/components/three/qa-scenes.ts`).

## Baseline (8 October 2026)

`baseline.md`, production build of main (6970b7e) on an M1 Pro. A first visit froze for about 3 s at the moment the desk became ready: 53 shader programs linked synchronously on its first frame (4.2 s of blocking WebGL calls in total). Returning visits had one 180 ms frame; a four-times slower CPU, six frames over 100 ms in the first seconds. Once loaded, scrolling held 60 fps (p95 17 ms).

The live site measured the same day (cold HTTP cache, TTFB 320–415 ms from fra1) froze 3.4–4.6 s on a first visit.

## Butter baseline (9 October 2026)

`butter-baseline.md`, production build of main (ce63d36) with trackpad input. The page no longer freezes for long, but it does not flow: every visit lowered the desk's resolution on an M1 Pro, About drew about 230 frames while the curtain still covered it, a notch moved the camera nearly four times as far as the median frame step, and the MacBook's Explorer list dropped about one frame in five while it scrolled (a single 33 ms frame each time, with the main thread mostly idle).

## Butter final (9 October 2026)

`butter-final.md`, the live site after the butter series (#95–#106), trackpad input. See `docs/scene-budget.md` ("October 9 butter series") for before and after. `tests/perf/budgets.json` now holds these numbers with some headroom, so `npm run perf:check` fails if a change gives them back.

## Final baseline (15 November 2026)

`final-baseline.md`, `-cpu6`, `-gpu` and `-gpu-low`: production build of main (ad7cdda) under the estimated laptop profile above, after a friend's Windows laptop felt heavy throughout. No one could measure that laptop, so these stand in for it.

- **A slow CPU is what the desk story feels.** At 4× the returning visit dropped 2.7–3.5 % of its scroll frames; at 6×, 12–13 %, and 12–34 % in each region of the desk story, while the sections after it stayed at 2.6 %. A frame of the story costs about 3 ms of main thread here (three's draw, then style, layers and commit for the screens' HTML), which is a whole 60 Hz frame at 6×.
- **The low tier holds on a slow GPU.** With the GPU load the desk took 10.7–11.9 ms per frame (p95) on the low tier and 15.8–17.8 ms on the high one: a slow GPU the site takes for a fast one is over a 60 Hz frame from the start, and nothing lowered its tier.
- Traces named three costs that were not the desk's own work: the cursor ring's hit test on every scroll event, one material that asked three for a new program every frame, and a logo for About whose 27,000 triangles were extruded in one task while the MacBook was on screen (12 ms on this machine once warm, about four times that on a cold page, before any CPU slowdown).

## Final after (15 November 2026)

`final-after.md`, `-cpu6`, `-gpu` and `-gpu-low`: the same four runs on the build of the final revisions' performance branch. See `docs/scene-budget.md` ("November 15 final revisions") for the table and what changed. In short: a third fewer slow frames at 6× CPU (12–13 % to 8–9 %), 2.0–3.0 % at 4× on a returning visit, one or two frames over 50 ms while scrolling instead of four, and a desk that the site moves to the low tier by itself when its lowest resolution still cannot keep up. A first visit with a notched wheel did not change.

The standard budgets (`npm run perf:check`, the M1 Pro at 1440 × 900) are unchanged: the estimated laptop's runs share their scenario names, so they are compared by reading the two files, not by `--check`.

## Flow series (16 November 2026)

`flow-baseline-*.md` is main under each class of computer; `flow-01-*` the paced build, `flow-02-igpu-60` About's lighter objects and `flow-03-*` the lighter balls; `flow-ablation-low.md` the ablation that chose what to cut. See `docs/scene-budget.md` ("November 16 flow series") for the before and after.
