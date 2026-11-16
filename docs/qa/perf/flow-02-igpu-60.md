# Performance: flow-02-igpu-60

2026-11-16 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1536×730 @1.25x · profile igpu-60 · low tier · CPU 2× slower · GPU load 80 · medians of 3 runs

| Metric | returning/notch | returning/trackpad |
|---|---|---|
| Display (Hz) | 60 | 60 |
| Longest frame (ms) | 77 | 72 |
| Frames > 100 ms | 0 | 0 |
| Frames > 50 ms | 2 | 2 |
| …while scrolling, desk ready | 1 | 0 |
| Scroll p95 (ms) | 17 | 17 |
| Scroll p99 (ms) | 33 | 17 |
| Slow scroll frames (%) | 1.61 | 0.53 |
| Scroll frames > 50 ms | 1 | 0 |
| Desk GPU p95 (ms) | 11.34 | 11.77 |
| Balls GPU p95 (ms) | 10.74 | 8.8 |
| About GPU p95 (ms) | 2.04 | 3.88 |
| Desk frames per second while it draws | 59.88 | 59.88 |
| Uneven desk frames (%) | 0.36 | 0.39 |
| Uneven balls frames (%) | 0 | 0 |
| Uneven About frames (%) | 41.46 | 11.57 |
| Desk resolution at the end (device px per CSS px) | 1 | 1 |
| Desk's pace (refreshes per frame) | 1 | 1 |
| About frames under the curtain | 0 | 33 |
| Camera's largest step in a frame (m) | 0.09119999999999999 | 0.053099999999999994 |
| Scrolls under 1 px | 0 | 0 |
| Scroll events with dirty style (%) | 53.59 | 38.48 |
| Desk lowered its resolution | 0 | 0 |
| Site took the low tier by itself | 0 | 0 |
| WebGL blocking (ms) | 20 | 19 |
| …after desk ready (ms) | 0 | 0 |
| Shader programs | 40 | 40 |
| Desk ready (ms) | 1407 | 1410 |
| TTFB (ms) | 4 | 3 |
| FCP (ms) | 276 | 280 |
| LCP (ms) | 276 | 280 |

### returning/notch by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 99 | 17 | 17 | 33 | 1.01 | 1 | desk 7.64/11.28 |
| monitor | 435 | 17 | 17 | 17 | 0.23 | 1 | desk 7.67/11.92, balls 3.13/10.74 |
| macbook | 106 | 17 | 17 | 17 | 0.94 | 1 | desk 8.92/13.16, balls 3.14/3.6 |
| room | 162 | 17 | 17 | 17 | 0 | 0 | desk 5.51/11.86 |
| about | 71 | 17 | 17 | 17 | 0 | 0 | desk 4.98/6.05, about 1.73/6.32 |
| flow | 600 | 17 | 17 | 33 | 2.67 | 1 | about 1.73/1.8 |

### returning/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 172 | 17 | 17 | 17 | 0.58 | 1 | desk 7.2/11.62 |
| monitor | 657 | 17 | 17 | 17 | 0 | 0 | desk 7.65/11.42, balls 2.23/8.8 |
| macbook | 197 | 17 | 17 | 33 | 1.02 | 2 | desk 8.22/13.27, balls 1.05/2.3 |
| room | 266 | 17 | 17 | 17 | 0.38 | 1 | desk 5.81/12.5, about 1.55/4.4 |
| about | 130 | 17 | 17 | 17 | 0 | 0 | desk 6.04/9.09, about 1.67/1.84 |
| flow | 668 | 17 | 17 | 33 | 1.05 | 1 | about 1.59/1.76 |

### At each stop (returning/notch)

| Stop | Layers that draw | Their area (views) | Canvases: draw calls / triangles |
|---|---|---|---|
| opening | 16 | 8.72 | desk 28 / 27628 |
| monitor | 21 | 7.87 | desk 29 / 26963 |
| balls | 23 | 10.21 | balls 1 / 21600, desk 37 / 37838 |
| explorer | 22 | 9.9 | desk 37 / 37838 |
| room | 35 | 12.38 | desk 55 / 51471, about 5 / 1222 |
| about | 28 | 10.01 | desk 55 / 51471, about 24 / 12694 |
