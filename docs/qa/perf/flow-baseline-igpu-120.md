# Performance: flow-baseline-igpu-120

2026-11-16 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1536×730 @1.25x · profile igpu-120 · low tier · CPU 2× slower · GPU load 80 · headed · medians of 3 runs

| Metric | returning/notch | returning/trackpad |
|---|---|---|
| Display (Hz) | 116 | 118 |
| Longest frame (ms) | 52 | 51 |
| Frames > 100 ms | 0 | 0 |
| Frames > 50 ms | 2 | 1 |
| …while scrolling, desk ready | 0 | 0 |
| Scroll p95 (ms) | 16 | 15 |
| Scroll p99 (ms) | 18 | 18 |
| Slow scroll frames (%) | 6.49 | 5.85 |
| Scroll frames > 50 ms | 1 | 0 |
| Desk GPU p95 (ms) | 5.67 | 5.84 |
| Balls GPU p95 (ms) | 4.32 | 4.95 |
| About GPU p95 (ms) | 4.52 | 3.1 |
| Desk frames per second while it draws | 119.05 | 119.05 |
| Uneven desk frames (%) | 9.92 | 8.96 |
| Uneven balls frames (%) | 9.62 | 8 |
| Uneven About frames (%) | 64.29 | 50 |
| Desk resolution at the end (device px per CSS px) | 1 | 1 |
| Desk's pace (refreshes per frame) | 1 | 1 |
| About frames under the curtain | 0 | 0 |
| Camera's largest step in a frame (m) | 0.0934 | 0.0443 |
| Scrolls under 1 px | 0 | 0 |
| Scroll events with dirty style (%) | 62.98 | 49.13 |
| Desk lowered its resolution | 0 | 0 |
| Site took the low tier by itself | 0 | 0 |
| WebGL blocking (ms) | 21 | 23 |
| …after desk ready (ms) | 0 | 0 |
| Shader programs | 44 | 44 |
| Desk ready (ms) | 1514 | 1457 |
| TTFB (ms) | 7 | 5 |
| FCP (ms) | 388 | 340 |
| LCP (ms) | 388 | 340 |

### returning/notch by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 159 | 9 | 17 | 18 | 15.72 | 7 | desk 3.16/4.92 |
| monitor | 768 | 8 | 10 | 18 | 4.43 | 2 | desk 3.65/5.34, balls 2.11/4.6 |
| macbook | 182 | 8 | 17 | 58 | 9.89 | 6 | desk 4.77/6.03, balls 1.47/4.67 |
| room | 246 | 9 | 18 | 18 | 20.33 | 12 | desk 4/5.96 |
| about | 124 | 8 | 15 | 17 | 5.65 | 2 | desk 3.75/6.29 |
| flow | 1149 | 8 | 10 | 17 | 1.83 | 2 | about 1.72/3.38 |

### returning/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 242 | 8 | 17 | 18 | 9.5 | 2 | desk 3.15/5.27 |
| monitor | 968 | 8 | 14 | 18 | 5.79 | 5 | desk 3.45/6.38, balls 1.27/4.94 |
| macbook | 236 | 8 | 10 | 25 | 3.39 | 5 | desk 4.36/5.19, balls 5.97/5.97 |
| room | 346 | 9 | 17 | 19 | 22.25 | 12 | desk 3.68/5.81 |
| about | 160 | 8 | 10 | 26 | 4.38 | 4 | desk 3.25/7.55, about 1.7/3.21 |
| flow | 1107 | 8 | 10 | 10 | 0.72 | 1 | about 1.32/3.05 |

### At each stop (returning/notch)

| Stop | Layers that draw | Their area (views) | Canvases: draw calls / triangles |
|---|---|---|---|
| opening | 12 | 8.78 | desk 28 / 27628 |
| monitor | 10 | 6.61 | desk 29 / 26963 |
| balls | 22 | 10.59 | balls 1 / 21600, desk 37 / 37838 |
| explorer | 21 | 10.39 | desk 37 / 37838 |
| room | 25 | 10.73 | desk 55 / 51471, about 9 / 19410 |
| about | 7 | 5.72 | desk 55 / 51471, about 28 / 41374 |
