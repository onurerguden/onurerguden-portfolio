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
npm run perf:check
```

Results are medians of three runs, written to `docs/qa/perf/<label>.{json,md}`. `perf:check` compares them with `tests/perf/budgets.json`. CI renders WebGL in software, so these runs happen on a GPU-backed Mac and their summary goes into each pull request.

`npm run qa:stops -- capture <label>` captures the desk's stops in both languages at 1440 × 900 and 2400 × 1000 into `work/perf-stops/`; `npm run qa:stops -- compare <before> <after>` prints the PSNR of each pair and fails below 45 dB. Two captures of the same build measure 54 dB or more. About sways on its own and is captured for review only.

## Baseline (8 October 2026)

`baseline.md`, production build of main (6970b7e) on an M1 Pro. A first visit froze for about 3 s at the moment the desk became ready: 53 shader programs linked synchronously on its first frame (4.2 s of blocking WebGL calls in total). Returning visits had one 180 ms frame; a four-times slower CPU, six frames over 100 ms in the first seconds. Once loaded, scrolling held 60 fps (p95 17 ms).

The live site measured the same day (cold HTTP cache, TTFB 320–415 ms from fra1) froze 3.4–4.6 s on a first visit.
