# Performance: flow-baseline-igpu-misread

2026-11-16 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1536×730 @1.25x · profile igpu-misread · CPU 2× slower · GPU load 320 · medians of 1 runs

| Metric | returning/trackpad |
|---|---|
| Display (Hz) | 60 |
| Longest frame (ms) | 54 |
| Frames > 100 ms | 0 |
| Frames > 50 ms | 1 |
| …while scrolling, desk ready | 0 |
| Scroll p95 (ms) | 17 |
| Scroll p99 (ms) | 17 |
| Slow scroll frames (%) | 0.67 |
| Scroll frames > 50 ms | 0 |
| Desk GPU p95 (ms) | 12.63 |
| Balls GPU p95 (ms) | 12.47 |
| About GPU p95 (ms) | 7.34 |
| Desk frames per second while it draws | 59.88 |
| Uneven desk frames (%) | 0.54 |
| Uneven balls frames (%) | 1.14 |
| Uneven About frames (%) | 11.16 |
| Desk resolution at the end (device px per CSS px) | 0.85 |
| Desk's pace (refreshes per frame) | 1 |
| About frames under the curtain | 45 |
| Camera's largest step in a frame (m) | 0.0548 |
| Scrolls under 1 px | 0 |
| Scroll events with dirty style (%) | 39.95 |
| Desk lowered its resolution | 0 |
| Site took the low tier by itself | 1 |
| WebGL blocking (ms) | 27 |
| …after desk ready (ms) | 0 |
| Shader programs | 44 |
| Desk ready (ms) | 1412 |
| TTFB (ms) | 3 |
| FCP (ms) | 276 |
| LCP (ms) | 276 |

### returning/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 175 | 17 | 17 | 17 | 0.57 | 1 | desk 9.07/12.05 |
| monitor | 654 | 17 | 17 | 17 | 0.31 | 1 | desk 8.9/15.96, balls 3.4/12.47 |
| macbook | 199 | 17 | 17 | 33 | 1.51 | 2 | desk 10.86/11.73, balls 1.67/1.67 |
| room | 263 | 17 | 17 | 17 | 0.38 | 1 | desk 9.28/12.47, about 2.77/6.01 |
| about | 129 | 17 | 17 | 17 | 0 | 0 | desk 7.27/11.1, about 4.83/7.54 |
| flow | 680 | 17 | 17 | 33 | 1.03 | 1 | about 5.26/7.24 |

### At each stop (returning/trackpad)

| Stop | Layers that draw | Their area (views) | Canvases: draw calls / triangles |
|---|---|---|---|
| opening | 16 | 8.72 | desk 28 / 27628 |
| monitor | 21 | 7.87 | desk 29 / 26963 |
| balls | 23 | 10.21 | balls 1 / 21600, desk 37 / 37838 |
| explorer | 22 | 9.9 | desk 37 / 37838 |
| room | 35 | 12.38 | desk 55 / 51471, about 9 / 19410 |
| about | 28 | 10.01 | desk 55 / 51471, about 28 / 41374 |
