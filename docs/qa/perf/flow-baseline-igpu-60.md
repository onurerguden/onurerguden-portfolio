# Performance: flow-baseline-igpu-60

2026-11-16 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1536×730 @1.25x · profile igpu-60 · low tier · CPU 2× slower · GPU load 80 · medians of 3 runs

| Metric | returning/notch | returning/trackpad |
|---|---|---|
| Display (Hz) | 60 | 60 |
| Longest frame (ms) | 82 | 82 |
| Frames > 100 ms | 0 | 0 |
| Frames > 50 ms | 2 | 2 |
| …while scrolling, desk ready | 0 | 0 |
| Scroll p95 (ms) | 17 | 17 |
| Scroll p99 (ms) | 33 | 17 |
| Slow scroll frames (%) | 1.68 | 0.53 |
| Scroll frames > 50 ms | 1 | 0 |
| Desk GPU p95 (ms) | 9.72 | 11.01 |
| Balls GPU p95 (ms) | 8.04 | 9.69 |
| About GPU p95 (ms) | 2.47 | 3.23 |
| Desk frames per second while it draws | 59.88 | 59.88 |
| Uneven desk frames (%) | 0.36 | 0.4 |
| Uneven balls frames (%) | 0 | 0 |
| Uneven About frames (%) | 42.5 | 10.55 |
| Desk resolution at the end (device px per CSS px) | 1 | 1 |
| Desk's pace (refreshes per frame) | 1 | 1 |
| About frames under the curtain | 0 | 35 |
| Camera's largest step in a frame (m) | 0.09380000000000001 | 0.0548 |
| Scrolls under 1 px | 0 | 0 |
| Scroll events with dirty style (%) | 57.46 | 41.8 |
| Desk lowered its resolution | 0 | 0 |
| Site took the low tier by itself | 0 | 0 |
| WebGL blocking (ms) | 19 | 21 |
| …after desk ready (ms) | 0 | 0 |
| Shader programs | 44 | 44 |
| Desk ready (ms) | 1424 | 1426 |
| TTFB (ms) | 4 | 5 |
| FCP (ms) | 284 | 280 |
| LCP (ms) | 284 | 280 |

### returning/notch by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 99 | 17 | 17 | 33 | 2.02 | 1 | desk 6.16/9.49 |
| monitor | 436 | 17 | 17 | 17 | 0.23 | 1 | desk 6.12/9.88, balls 2.83/9.86 |
| macbook | 107 | 17 | 17 | 17 | 0.93 | 1 | desk 7.17/11.16, balls 3/9.99 |
| room | 159 | 17 | 17 | 17 | 0.63 | 1 | desk 5.18/8.82 |
| about | 71 | 17 | 17 | 17 | 0 | 0 | desk 4.49/9.37, about 2.19/3.42 |
| flow | 602 | 17 | 17 | 33 | 2.16 | 1 | about 2.04/3.15 |

### returning/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 178 | 17 | 17 | 17 | 0.56 | 1 | desk 6.8/11.29 |
| monitor | 652 | 17 | 17 | 17 | 0 | 0 | desk 6.75/11.64, balls 2.77/11.81 |
| macbook | 188 | 17 | 17 | 33 | 1.06 | 2 | desk 6.98/12.18, balls 0.9/2.79 |
| room | 264 | 17 | 17 | 17 | 0.76 | 1 | desk 5.17/8.66, about 1.12/3.28 |
| about | 129 | 17 | 17 | 17 | 0 | 0 | desk 4.99/9.22, about 2.1/3.38 |
| flow | 670 | 17 | 17 | 17 | 0.9 | 1 | about 1.97/2.81 |

### At each stop (returning/notch)

| Stop | Layers that draw | Their area (views) | Canvases: draw calls / triangles |
|---|---|---|---|
| opening | 16 | 8.72 | desk 28 / 27628 |
| monitor | 21 | 7.87 | desk 29 / 26963 |
| balls | 23 | 10.21 | balls 1 / 21600, desk 37 / 37838 |
| explorer | 22 | 9.9 | desk 37 / 37838 |
| room | 35 | 12.38 | desk 55 / 51471, about 9 / 19410 |
| about | 28 | 10.01 | desk 55 / 51471, about 28 / 41374 |
