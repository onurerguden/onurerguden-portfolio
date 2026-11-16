# Performance: flow-01-igpu-120

2026-11-16 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1536×730 @1.25x · profile igpu-120 · low tier · CPU 2× slower · GPU load 80 · headed · medians of 3 runs

| Metric | returning/notch | returning/trackpad |
|---|---|---|
| Display (Hz) | 115 | 118 |
| Longest frame (ms) | 51 | 77 |
| Frames > 100 ms | 0 | 0 |
| Frames > 50 ms | 2 | 1 |
| …while scrolling, desk ready | 0 | 0 |
| Scroll p95 (ms) | 16 | 10 |
| Scroll p99 (ms) | 18 | 17 |
| Slow scroll frames (%) | 6.73 | 3.56 |
| Scroll frames > 50 ms | 1 | 0 |
| Desk GPU p95 (ms) | 7.98 | 8.34 |
| Balls GPU p95 (ms) | 3.15 | 6.8 |
| About GPU p95 (ms) | 4.58 | 3.33 |
| Desk frames per second while it draws | 59.88 | 59.88 |
| Uneven desk frames (%) | 2.64 | 1.77 |
| Uneven balls frames (%) | – | 4.55 |
| Uneven About frames (%) | 59.26 | 1.32 |
| Desk resolution at the end (device px per CSS px) | 1 | 1 |
| Desk's pace (refreshes per frame) | 2 | 2 |
| About frames under the curtain | 0 | 0 |
| Camera's largest step in a frame (m) | 0.10859999999999999 | 0.0863 |
| Scrolls under 1 px | 0 | 0 |
| Scroll events with dirty style (%) | 58.01 | 44.88 |
| Desk lowered its resolution | 0 | 0 |
| Site took the low tier by itself | 0 | 0 |
| WebGL blocking (ms) | 21 | 23 |
| …after desk ready (ms) | 0 | 0 |
| Shader programs | 44 | 44 |
| Desk ready (ms) | 1508 | 1417 |
| TTFB (ms) | 6 | 4 |
| FCP (ms) | 376 | 292 |
| LCP (ms) | 376 | 292 |

### returning/notch by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 178 | 8 | 16 | 18 | 7.87 | 5 | desk 4.79/8.59 |
| monitor | 726 | 8 | 10 | 17 | 4.13 | 3 | desk 5.07/8.06, balls 0.04/0.04 |
| macbook | 156 | 9 | 18 | 34 | 26.92 | 4 | desk 5.78/7.46 |
| room | 241 | 9 | 18 | 19 | 24.07 | 19 | desk 4.2/8.29 |
| about | 146 | 8 | 10 | 17 | 4.79 | 2 | desk 4.03/7.91, about 1.35/2.72 |
| flow | 1152 | 8 | 10 | 17 | 2.08 | 1 | about 1.46/3.22 |

### returning/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 203 | 8 | 17 | 19 | 7.88 | 6 | desk 4.52/8.75 |
| monitor | 812 | 8 | 10 | 17 | 2.22 | 3 | desk 4.7/8.86, balls 2.19/7.62 |
| macbook | 214 | 8 | 10 | 17 | 2.8 | 2 | desk 5.51/8.34, balls 2.76/2.76 |
| room | 312 | 9 | 17 | 18 | 16.03 | 7 | desk 3.77/7.28 |
| about | 149 | 8 | 10 | 17 | 2.01 | 2 | desk 3.49/4.99, about 2.13/4.3 |
| flow | 1114 | 8 | 10 | 10 | 0.9 | 1 | about 2.05/3.09 |

