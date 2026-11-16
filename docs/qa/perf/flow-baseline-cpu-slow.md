# Performance: flow-baseline-cpu-slow

2026-11-16 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1536×730 @1.25x · profile cpu-slow · low tier · CPU 4× slower · medians of 3 runs

| Metric | returning/notch | returning/trackpad |
|---|---|---|
| Display (Hz) | 60 | 60 |
| Longest frame (ms) | 127 | 152 |
| Frames > 100 ms | 1 | 1 |
| Frames > 50 ms | 8 | 8 |
| …while scrolling, desk ready | 1 | 1 |
| Scroll p95 (ms) | 17 | 17 |
| Scroll p99 (ms) | 33 | 33 |
| Slow scroll frames (%) | 2.73 | 1.81 |
| Scroll frames > 50 ms | 1 | 0 |
| Desk GPU p95 (ms) | 1.94 | 2.23 |
| Balls GPU p95 (ms) | 3.61 | 2.68 |
| About GPU p95 (ms) | 1.2 | 0.97 |
| Desk frames per second while it draws | 59.88 | 59.88 |
| Uneven desk frames (%) | 2.4 | 2.42 |
| Uneven balls frames (%) | 4.35 | 2.17 |
| Uneven About frames (%) | 40.54 | 10.75 |
| Desk resolution at the end (device px per CSS px) | 1 | 1 |
| Desk's pace (refreshes per frame) | 1 | 1 |
| About frames under the curtain | 0 | 30 |
| Camera's largest step in a frame (m) | 0.0949 | 0.054000000000000006 |
| Scrolls under 1 px | 0 | 0 |
| Scroll events with dirty style (%) | 60.22 | 41.15 |
| Desk lowered its resolution | 0 | 0 |
| Site took the low tier by itself | 0 | 0 |
| WebGL blocking (ms) | 56 | 64 |
| …after desk ready (ms) | 0 | 0 |
| Shader programs | 44 | 44 |
| Desk ready (ms) | 2101 | 2133 |
| TTFB (ms) | 3 | 5 |
| FCP (ms) | 392 | 392 |
| LCP (ms) | 392 | 392 |

### returning/notch by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 97 | 17 | 33 | 34 | 5.15 | 2 | desk 0.64/1.13 |
| monitor | 432 | 17 | 17 | 33 | 1.62 | 2 | desk 0.51/1.98, balls 0.51/3.61 |
| macbook | 103 | 17 | 33 | 33 | 7.77 | 2 | desk 1.07/2.3, balls 0.94/3.01 |
| room | 162 | 17 | 17 | 17 | 0 | 0 | desk 0.92/2.21 |
| about | 69 | 17 | 17 | 33 | 2.9 | 2 | desk 0.74/1.74, about 0.53/1.21 |
| flow | 596 | 17 | 17 | 33 | 2.35 | 1 | about 0.48/1.12 |

### returning/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 169 | 17 | 17 | 33 | 1.78 | 2 | desk 0.66/1.89 |
| monitor | 644 | 17 | 17 | 33 | 1.55 | 2 | desk 0.5/1.85, balls 0.53/1.95 |
| macbook | 191 | 17 | 17 | 50 | 4.71 | 3 | desk 1.04/1.87, balls 0.34/1.27 |
| room | 262 | 17 | 17 | 33 | 3.44 | 3 | desk 1.05/2.35, about 0.41/0.62 |
| about | 127 | 17 | 17 | 17 | 0 | 0 | desk 1.18/2.39, about 0.48/1.08 |
| flow | 707 | 17 | 17 | 17 | 0.99 | 1 | about 0.46/0.51 |

### At each stop (returning/notch)

| Stop | Layers that draw | Their area (views) | Canvases: draw calls / triangles |
|---|---|---|---|
| opening | 16 | 8.72 | desk 28 / 27628 |
| monitor | 21 | 7.87 | desk 29 / 26963 |
| balls | 23 | 10.21 | balls 1 / 21600, desk 37 / 37838 |
| explorer | 22 | 9.9 | desk 37 / 37838 |
| room | 35 | 12.38 | desk 55 / 51471, about 9 / 19410 |
| about | 28 | 10.01 | desk 55 / 51471, about 28 / 41374 |
