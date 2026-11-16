# Performance: flow-baseline-igpu-misread

2026-11-15 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1536×730 @1.25x · profile igpu-misread · CPU 2× slower · GPU load 320 · medians of 1 runs

| Metric | returning/trackpad |
|---|---|
| Display (Hz) | 60 |
| Longest frame (ms) | 89 |
| Frames > 100 ms | 0 |
| Frames > 50 ms | 1 |
| …while scrolling, desk ready | 0 |
| Scroll p95 (ms) | 17 |
| Scroll p99 (ms) | 17 |
| Slow scroll frames (%) | 0.48 |
| Scroll frames > 50 ms | 0 |
| Desk GPU p95 (ms) | 12.78 |
| Balls GPU p95 (ms) | 11.9 |
| About GPU p95 (ms) | 7.78 |
| Desk frames per second while it draws | 58.82 |
| Uneven desk frames (%) | 0.39 |
| Uneven balls frames (%) | 0 |
| Uneven About frames (%) | 12.39 |
| About frames under the curtain | 46 |
| Camera's largest step in a frame (m) | 0.0548 |
| Scrolls under 1 px | 0 |
| Scroll events with dirty style (%) | 41.22 |
| Desk lowered its resolution | 0 |
| Site took the low tier by itself | 1 |
| WebGL blocking (ms) | 20 |
| …after desk ready (ms) | 0 |
| Shader programs | 44 |
| Desk ready (ms) | 1463 |
| TTFB (ms) | 3 |
| FCP (ms) | 288 |
| LCP (ms) | 288 |

### returning/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 170 | 17 | 17 | 17 | 0.59 | 1 | desk 9.63/12.61 |
| monitor | 645 | 17 | 17 | 17 | 0 | 0 | desk 8.05/13.63, balls 3.23/11.9 |
| macbook | 204 | 17 | 17 | 17 | 0.98 | 2 | desk 10.91/11.68, balls 3.18/6.43 |
| room | 263 | 17 | 17 | 17 | 0.76 | 1 | desk 9.64/12.85, about 3.17/5.56 |
| about | 129 | 17 | 17 | 17 | 0 | 0 | desk 8.89/14.51, about 6.18/7.86 |
| flow | 686 | 17 | 17 | 17 | 0.73 | 1 | about 5.19/7.78 |

### At each stop (returning/trackpad)

| Stop | Layers that draw | Their area (views) | Canvases: draw calls / triangles |
|---|---|---|---|
| opening | 16 | 8.72 | desk 28 / 27628 |
| monitor | 21 | 7.87 | desk 29 / 26963 |
| balls | 23 | 10.21 | balls 1 / 21600, desk 37 / 37838 |
| explorer | 22 | 9.9 | desk 37 / 37838 |
| room | 35 | 12.38 | desk 55 / 51471, about 9 / 19410 |
| about | 28 | 10.01 | desk 55 / 51471, about 28 / 41374 |
