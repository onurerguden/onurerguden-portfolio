# Performance: flow-03-igpu-120

2026-11-16 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1536×730 @1.25x · profile igpu-120 · low tier · CPU 2× slower · GPU load 80 · headed · medians of 3 runs

| Metric | returning/notch | returning/trackpad |
|---|---|---|
| Display (Hz) | 119 | 115 |
| Longest frame (ms) | 55 | 51 |
| Frames > 100 ms | 0 | 0 |
| Frames > 50 ms | 3 | 1 |
| …while scrolling, desk ready | 1 | 0 |
| Scroll p95 (ms) | 16 | 10 |
| Scroll p99 (ms) | 18 | 18 |
| Slow scroll frames (%) | 6.6 | 4.44 |
| Scroll frames > 50 ms | 1 | 1 |
| Desk GPU p95 (ms) | 7.86 | 8.39 |
| Balls GPU p95 (ms) | 8.37 | 7.49 |
| About GPU p95 (ms) | 3.51 | 3.27 |
| Desk frames per second while it draws | 59.88 | 59.88 |
| Uneven desk frames (%) | 2.77 | 2.45 |
| Uneven balls frames (%) | – | 5.41 |
| Uneven About frames (%) | 57.69 | 1.01 |
| Desk resolution at the end (device px per CSS px) | 1 | 1 |
| Desk's pace (refreshes per frame) | 2 | 2 |
| About frames under the curtain | 0 | 0 |
| Camera's largest step in a frame (m) | 0.12359999999999999 | 0.0849 |
| Scrolls under 1 px | 0 | 0 |
| Scroll events with dirty style (%) | 62.43 | 47.53 |
| Desk lowered its resolution | 0 | 0 |
| Site took the low tier by itself | 0 | 0 |
| WebGL blocking (ms) | 28 | 19 |
| …after desk ready (ms) | 0 | 0 |
| Shader programs | 40 | 40 |
| Desk ready (ms) | 1503 | 1484 |
| TTFB (ms) | 6 | 4 |
| FCP (ms) | 372 | 368 |
| LCP (ms) | 372 | 368 |

### returning/notch by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 163 | 8 | 17 | 18 | 12.27 | 5 | desk 4.58/8.04 |
| monitor | 742 | 8 | 9 | 17 | 3.77 | 3 | desk 4.72/8.01, balls 6.85/11.35 |
| macbook | 173 | 8 | 17 | 34 | 10.98 | 3 | desk 5.3/7.32 |
| room | 234 | 9 | 17 | 25 | 28.63 | 8 | desk 4.07/7.77 |
| about | 139 | 8 | 9 | 17 | 4.32 | 3 | desk 3.45/7.95 |
| flow | 1126 | 8 | 9 | 17 | 2.66 | 1 | about 1.12/3.45 |

### returning/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 207 | 8 | 15 | 18 | 7.73 | 3 | desk 4.65/8.46 |
| monitor | 822 | 8 | 10 | 17 | 3.41 | 3 | desk 4.77/8.91, balls 1.16/7.49 |
| macbook | 179 | 8 | 15 | 26 | 5.03 | 6 | desk 4.84/7.82, balls 1.99/1.99 |
| room | 300 | 9 | 17 | 18 | 19 | 13 | desk 3.9/6.33 |
| about | 147 | 8 | 10 | 17 | 2.04 | 2 | desk 5.92/9.84, about 1.38/4.35 |
| flow | 1090 | 8 | 10 | 10 | 0.83 | 1 | about 1.3/2.89 |

