# Performance: flow-baseline-igpu-120

2026-11-15 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1536×730 @1.25x · profile igpu-120 · low tier · CPU 2× slower · GPU load 80 · headed · medians of 3 runs

| Metric | returning/notch | returning/trackpad |
|---|---|---|
| Display (Hz) | 119 | 116 |
| Longest frame (ms) | 53 | 52 |
| Frames > 100 ms | 0 | 0 |
| Frames > 50 ms | 1 | 2 |
| …while scrolling, desk ready | 0 | 0 |
| Scroll p95 (ms) | 16 | 16 |
| Scroll p99 (ms) | 17 | 17 |
| Slow scroll frames (%) | 6.43 | 6.21 |
| Scroll frames > 50 ms | 1 | 1 |
| Desk GPU p95 (ms) | 5.82 | 5.66 |
| Balls GPU p95 (ms) | 4.64 | 4.81 |
| About GPU p95 (ms) | 5.94 | 3.08 |
| Desk frames per second while it draws | 125 | 125 |
| Uneven desk frames (%) | 9.86 | 9.77 |
| Uneven balls frames (%) | – | 10 |
| Uneven About frames (%) | 56.41 | 49.32 |
| About frames under the curtain | 0 | 0 |
| Camera's largest step in a frame (m) | 0.0892 | 0.044000000000000004 |
| Scrolls under 1 px | 0 | 0 |
| Scroll events with dirty style (%) | 62.43 | 50.56 |
| Desk lowered its resolution | 0 | 0 |
| Site took the low tier by itself | 0 | 0 |
| WebGL blocking (ms) | 21 | 22 |
| …after desk ready (ms) | 0 | 0 |
| Shader programs | 44 | 44 |
| Desk ready (ms) | 1517 | 1527 |
| TTFB (ms) | 5 | 8 |
| FCP (ms) | 392 | 388 |
| LCP (ms) | 392 | 388 |

### returning/notch by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 171 | 8 | 17 | 18 | 15.79 | 7 | desk 3.32/5.93 |
| monitor | 752 | 8 | 9 | 17 | 4.65 | 3 | desk 3.69/5.06, balls 2.33/5.04 |
| macbook | 189 | 8 | 9 | 34 | 4.76 | 5 | desk 4.64/5.27 |
| room | 251 | 9 | 17 | 18 | 23.9 | 33 | desk 4.05/6.28 |
| about | 136 | 8 | 16 | 17 | 5.88 | 2 | desk 3.3/5.55, about 2.05/2.05 |
| flow | 1131 | 8 | 9 | 17 | 2.65 | 1 | about 1.61/7.87 |

### returning/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 238 | 8 | 16 | 17 | 7.98 | 3 | desk 3.27/5.3 |
| monitor | 925 | 8 | 16 | 18 | 7.46 | 5 | desk 3.52/5.58, balls 1.14/4.74 |
| macbook | 285 | 8 | 9 | 25 | 2.81 | 5 | desk 4.72/5.5, balls 5.57/5.57 |
| room | 358 | 9 | 18 | 26 | 29.89 | 15 | desk 3.28/6.16, about 1.46/3.07 |
| about | 174 | 8 | 9 | 16 | 1.15 | 1 | desk 3.44/5.63, about 1.48/2.98 |
| flow | 1113 | 8 | 9 | 9 | 0.9 | 1 | about 1.47/2.84 |

### At each stop (returning/notch)

| Stop | Layers that draw | Their area (views) | Canvases: draw calls / triangles |
|---|---|---|---|
| opening | 12 | 8.79 | desk 28 / 27628 |
| monitor | 10 | 6.63 | desk 29 / 26963 |
| balls | 22 | 10.64 | balls 1 / 21600, desk 37 / 37838 |
| explorer | 21 | 10.44 | desk 37 / 37838 |
| room | 26 | 10.77 | desk 55 / 51471, about 9 / 19410 |
| about | 7 | 5.73 | desk 55 / 51471, about 28 / 41374 |
