# Performance: flow-baseline-igpu-60

2026-11-15 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1536×730 @1.25x · profile igpu-60 · low tier · CPU 2× slower · GPU load 80 · medians of 3 runs

| Metric | returning/notch | returning/trackpad |
|---|---|---|
| Display (Hz) | 60 | 60 |
| Longest frame (ms) | 71 | 76 |
| Frames > 100 ms | 0 | 0 |
| Frames > 50 ms | 2 | 3 |
| …while scrolling, desk ready | 0 | 1 |
| Scroll p95 (ms) | 17 | 17 |
| Scroll p99 (ms) | 33 | 17 |
| Slow scroll frames (%) | 1.64 | 0.6 |
| Scroll frames > 50 ms | 1 | 1 |
| Desk GPU p95 (ms) | 9.54 | 10.47 |
| Balls GPU p95 (ms) | 10.23 | 9.66 |
| About GPU p95 (ms) | 2.51 | 2.47 |
| Desk frames per second while it draws | 58.82 | 58.82 |
| Uneven desk frames (%) | 0.47 | 0.41 |
| Uneven balls frames (%) | 0 | 0 |
| Uneven About frames (%) | 42.22 | 8.7 |
| About frames under the curtain | 0 | 35 |
| Camera's largest step in a frame (m) | 0.0944 | 0.0548 |
| Scrolls under 1 px | 0 | 0 |
| Scroll events with dirty style (%) | 57.14 | 43 |
| Desk lowered its resolution | 0 | 0 |
| Site took the low tier by itself | 0 | 0 |
| WebGL blocking (ms) | 18 | 23 |
| …after desk ready (ms) | 0 | 0 |
| Shader programs | 44 | 44 |
| Desk ready (ms) | 1424 | 1442 |
| TTFB (ms) | 3 | 5 |
| FCP (ms) | 284 | 288 |
| LCP (ms) | 284 | 288 |

### returning/notch by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 107 | 17 | 17 | 33 | 1.87 | 1 | desk 6.46/11.54 |
| monitor | 430 | 17 | 17 | 17 | 0.23 | 1 | desk 6.13/10.89, balls 2.14/10.23 |
| macbook | 107 | 17 | 17 | 17 | 0.93 | 1 | desk 7/13.11, balls 2.32/2.32 |
| room | 166 | 17 | 17 | 17 | 0 | 0 | desk 5.84/10.28 |
| about | 81 | 17 | 17 | 17 | 0 | 0 | desk 4.99/7.16, about 2.04/4.12 |
| flow | 601 | 17 | 17 | 33 | 3.33 | 1 | about 2.02/2.42 |

### returning/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 167 | 17 | 17 | 33 | 1.2 | 1 | desk 5.98/10.31 |
| monitor | 633 | 17 | 17 | 17 | 0.16 | 1 | desk 6.26/10.5, balls 2.6/9.36 |
| macbook | 170 | 17 | 17 | 17 | 0.59 | 1 | desk 7.27/9.45, balls 0.45/0.45 |
| room | 230 | 17 | 17 | 17 | 0.43 | 1 | desk 5.14/8.1, about 2.13/7.11 |
| about | 111 | 17 | 17 | 17 | 0 | 0 | desk 3.99/10.46, about 2.13/2.51 |
| flow | 681 | 17 | 17 | 33 | 1.03 | 1 | about 2.04/2.3 |

### At each stop (returning/notch)

| Stop | Layers that draw | Their area (views) | Canvases: draw calls / triangles |
|---|---|---|---|
| opening | 16 | 8.72 | desk 28 / 27628 |
| monitor | 21 | 7.87 | desk 29 / 26963 |
| balls | 23 | 10.21 | balls 1 / 21600, desk 37 / 37838 |
| explorer | 22 | 9.9 | desk 37 / 37838 |
| room | 35 | 12.38 | desk 55 / 51471, about 9 / 19410 |
| about | 28 | 10.01 | desk 55 / 51471, about 28 / 41374 |
