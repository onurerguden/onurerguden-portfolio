# Performance: flow-01-igpu-60

2026-11-16 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1536×730 @1.25x · profile igpu-60 · low tier · CPU 2× slower · GPU load 80 · medians of 3 runs

| Metric | returning/notch | returning/trackpad |
|---|---|---|
| Display (Hz) | 60 | 60 |
| Longest frame (ms) | 78 | 68 |
| Frames > 100 ms | 0 | 0 |
| Frames > 50 ms | 2 | 2 |
| …while scrolling, desk ready | 0 | 0 |
| Scroll p95 (ms) | 17 | 17 |
| Scroll p99 (ms) | 33 | 17 |
| Slow scroll frames (%) | 1.34 | 0.58 |
| Scroll frames > 50 ms | 1 | 0 |
| Desk GPU p95 (ms) | 11.46 | 12.3 |
| Balls GPU p95 (ms) | 10.3 | 9.35 |
| About GPU p95 (ms) | 4.24 | 4.05 |
| Desk frames per second while it draws | 59.88 | 59.88 |
| Uneven desk frames (%) | 0.36 | 0.38 |
| Uneven balls frames (%) | 0 | 0 |
| Uneven About frames (%) | 41.3 | 10.5 |
| Desk resolution at the end (device px per CSS px) | 1 | 1 |
| Desk's pace (refreshes per frame) | 1 | 1 |
| About frames under the curtain | 0 | 34 |
| Camera's largest step in a frame (m) | 0.0943 | 0.0512 |
| Scrolls under 1 px | 0 | 0 |
| Scroll events with dirty style (%) | 55.8 | 39.39 |
| Desk lowered its resolution | 0 | 0 |
| Site took the low tier by itself | 0 | 0 |
| WebGL blocking (ms) | 18 | 21 |
| …after desk ready (ms) | 0 | 0 |
| Shader programs | 44 | 44 |
| Desk ready (ms) | 1411 | 1405 |
| TTFB (ms) | 4 | 3 |
| FCP (ms) | 276 | 284 |
| LCP (ms) | 276 | 284 |

### returning/notch by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 101 | 17 | 17 | 17 | 0.99 | 1 | desk 7.08/11.63 |
| monitor | 421 | 17 | 17 | 17 | 0 | 0 | desk 7.53/10.73, balls 4.19/11.16 |
| macbook | 117 | 17 | 17 | 33 | 1.71 | 2 | desk 7.91/12.66, balls 1.07/3.07 |
| room | 166 | 17 | 17 | 17 | 0 | 0 | desk 6.81/11.26 |
| about | 80 | 17 | 17 | 17 | 0 | 0 | desk 4.99/8.02, about 2.2/7.5 |
| flow | 589 | 17 | 17 | 33 | 3.74 | 1 | about 1.97/2.19 |

### returning/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 171 | 17 | 17 | 17 | 0.58 | 1 | desk 6.83/9.32 |
| monitor | 653 | 17 | 17 | 17 | 0.31 | 1 | desk 6.49/11.19, balls 2.08/9.35 |
| macbook | 171 | 17 | 17 | 17 | 0.58 | 1 | desk 7.72/12.14, balls 0.77/0.77 |
| room | 230 | 17 | 17 | 17 | 0.87 | 2 | desk 5.04/9.71, about 3.03/7.02 |
| about | 113 | 17 | 17 | 17 | 0 | 0 | desk 5.36/9.6, about 2.04/4.01 |
| flow | 682 | 17 | 17 | 17 | 0.73 | 1 | about 1.95/3.81 |

