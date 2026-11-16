# Performance: flow-baseline-m1-120

2026-11-16 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1440×900 @2x · profile m1-120 · headed · medians of 3 runs

| Metric | returning/notch | returning/trackpad |
|---|---|---|
| Display (Hz) | 120 | 119 |
| Longest frame (ms) | 54 | 50 |
| Frames > 100 ms | 0 | 0 |
| Frames > 50 ms | 1 | 0 |
| …while scrolling, desk ready | 1 | 0 |
| Scroll p95 (ms) | 10 | 10 |
| Scroll p99 (ms) | 17 | 17 |
| Slow scroll frames (%) | 1.76 | 1.58 |
| Scroll frames > 50 ms | 1 | 1 |
| Desk GPU p95 (ms) | 4.15 | 4.07 |
| Balls GPU p95 (ms) | 2.52 | 3.34 |
| About GPU p95 (ms) | 4.85 | 3.89 |
| Desk frames per second while it draws | 59.88 | 60.24 |
| Uneven desk frames (%) | 12.28 | 19.89 |
| Uneven balls frames (%) | – | 4.24 |
| Uneven About frames (%) | 55.7 | 46.12 |
| Desk resolution at the end (device px per CSS px) | 1.5 | 1.5 |
| Desk's pace (refreshes per frame) | 1 | 1 |
| About frames under the curtain | 0 | 39 |
| Camera's largest step in a frame (m) | 0.1067 | 0.0535 |
| Scrolls under 1 px | 0 | 0 |
| Scroll events with dirty style (%) | 54.3 | 42.03 |
| Desk lowered its resolution | 0 | 0 |
| Site took the low tier by itself | 0 | 0 |
| WebGL blocking (ms) | 13 | 23 |
| …after desk ready (ms) | 0 | 0 |
| Shader programs | 44 | 44 |
| Desk ready (ms) | 1259 | 1274 |
| TTFB (ms) | 5 | 6 |
| FCP (ms) | 228 | 236 |
| LCP (ms) | 228 | 236 |

### returning/notch by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 240 | 8 | 10 | 17 | 1.67 | 1 | desk 1.9/3.49 |
| monitor | 704 | 8 | 10 | 17 | 1.14 | 1 | desk 2.07/4.52, balls 1.57/1.96 |
| macbook | 170 | 8 | 10 | 23 | 3.53 | 2 | – |
| room | 383 | 8 | 10 | 17 | 1.57 | 1 | desk 2.59/4.69 |
| about | 163 | 8 | 10 | 32 | 1.23 | 2 | about 1.6/6.41 |
| flow | 1207 | 8 | 10 | 17 | 1.41 | 1 | about 1.64/4.59 |

### returning/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 279 | 8 | 10 | 17 | 1.43 | 2 | desk 1.51/3.16 |
| monitor | 918 | 8 | 10 | 17 | 1.53 | 2 | desk 2.02/3.41, balls 1.65/3.34 |
| macbook | 245 | 8 | 10 | 17 | 2.45 | 4 | balls 1.42/1.42 |
| room | 434 | 8 | 10 | 17 | 3.23 | 3 | desk 2.39/4.22, about 0.81/5.49 |
| about | 196 | 8 | 10 | 10 | 0 | 0 | about 1.73/3.45 |
| flow | 1248 | 8 | 10 | 10 | 0.32 | 1 | about 1.9/3.86 |

### At each stop (returning/notch)

| Stop | Layers that draw | Their area (views) | Canvases: draw calls / triangles |
|---|---|---|---|
| opening | 12 | 8.8 | desk 27 / 30048 |
| monitor | – | – | desk 29 / 29643 |
| balls | – | – | balls 1 / 21600, desk 35 / 37184 |
| explorer | – | – | desk 35 / 37184 |
| room | 28 | 12.77 | desk 55 / 54151, about 9 / 19410 |
| about | 7 | 5.6 | desk 55 / 54151, about 28 / 41374 |
