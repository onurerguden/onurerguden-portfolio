# Performance: flow-03-igpu-60

2026-11-16 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1536×730 @1.25x · profile igpu-60 · low tier · CPU 2× slower · GPU load 80 · medians of 3 runs

| Metric | returning/notch | returning/trackpad |
|---|---|---|
| Display (Hz) | 60 | 60 |
| Longest frame (ms) | 63 | 90 |
| Frames > 100 ms | 0 | 0 |
| Frames > 50 ms | 2 | 2 |
| …while scrolling, desk ready | 0 | 0 |
| Scroll p95 (ms) | 17 | 17 |
| Scroll p99 (ms) | 33 | 17 |
| Slow scroll frames (%) | 1.69 | 0.69 |
| Scroll frames > 50 ms | 1 | 1 |
| Desk GPU p95 (ms) | 9.7 | 9.65 |
| Balls GPU p95 (ms) | 8.47 | 7.21 |
| About GPU p95 (ms) | 2.78 | 2.67 |
| Desk frames per second while it draws | 59.88 | 59.88 |
| Uneven desk frames (%) | 0.48 | 0.48 |
| Uneven balls frames (%) | 0 | 0 |
| Uneven About frames (%) | 42 | 9.43 |
| Desk resolution at the end (device px per CSS px) | 1 | 1 |
| Desk's pace (refreshes per frame) | 1 | 1 |
| About frames under the curtain | 0 | 26 |
| Camera's largest step in a frame (m) | 0.09449999999999999 | 0.0545 |
| Scrolls under 1 px | 0 | 0 |
| Scroll events with dirty style (%) | 59.34 | 44.95 |
| Desk lowered its resolution | 0 | 0 |
| Site took the low tier by itself | 0 | 0 |
| WebGL blocking (ms) | 18 | 23 |
| …after desk ready (ms) | 0 | 0 |
| Shader programs | 40 | 40 |
| Desk ready (ms) | 1496 | 1512 |
| TTFB (ms) | 5 | 4 |
| FCP (ms) | 316 | 324 |
| LCP (ms) | 316 | 324 |

### returning/notch by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 99 | 17 | 17 | 33 | 2.02 | 1 | desk 5.81/9.52 |
| monitor | 435 | 17 | 17 | 17 | 0.23 | 1 | desk 5.97/10.03, balls 2.14/8.67 |
| macbook | 107 | 17 | 17 | 17 | 0.93 | 1 | desk 5.97/8.91, balls 0.92/4.19 |
| room | 161 | 17 | 17 | 17 | 0 | 0 | desk 5.61/8.5 |
| about | 71 | 17 | 17 | 17 | 0 | 0 | desk 4.17/8.75, about 1.71/3.44 |
| flow | 601 | 17 | 17 | 33 | 2.66 | 1 | about 1.68/2.5 |

### returning/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 164 | 17 | 17 | 33 | 1.22 | 1 | desk 6.22/10.51 |
| monitor | 655 | 17 | 17 | 17 | 0.15 | 1 | desk 6.31/10.44, balls 1.97/8.93 |
| macbook | 161 | 17 | 17 | 33 | 1.24 | 1 | desk 7.24/9.82 |
| room | 247 | 17 | 17 | 17 | 0.4 | 1 | desk 6.04/9.34, about 1.61/3.59 |
| about | 129 | 17 | 17 | 17 | 0 | 0 | desk 5.44/9.18, about 1.68/2.66 |
| flow | 665 | 17 | 17 | 33 | 1.2 | 1 | about 1.67/2.07 |

### At each stop (returning/notch)

| Stop | Layers that draw | Their area (views) | Canvases: draw calls / triangles |
|---|---|---|---|
| opening | 16 | 8.72 | desk 28 / 27628 |
| monitor | 21 | 7.87 | desk 29 / 26963 |
| balls | 23 | 10.21 | balls 1 / 10560, desk 37 / 37838 |
| explorer | 22 | 9.9 | desk 37 / 37838 |
| room | 35 | 12.38 | desk 55 / 51471, about 5 / 1222 |
| about | 28 | 10.01 | desk 55 / 51471, about 24 / 12694 |
