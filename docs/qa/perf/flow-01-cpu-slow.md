# Performance: flow-01-cpu-slow

2026-11-16 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1536×730 @1.25x · profile cpu-slow · low tier · CPU 4× slower · medians of 3 runs

| Metric | returning/notch | returning/trackpad |
|---|---|---|
| Display (Hz) | 60 | 60 |
| Longest frame (ms) | 149 | 123 |
| Frames > 100 ms | 1 | 1 |
| Frames > 50 ms | 6 | 7 |
| …while scrolling, desk ready | 0 | 0 |
| Scroll p95 (ms) | 17 | 17 |
| Scroll p99 (ms) | 33 | 33 |
| Slow scroll frames (%) | 2.64 | 1.73 |
| Scroll frames > 50 ms | 1 | 0 |
| Desk GPU p95 (ms) | 1.43 | 1.45 |
| Balls GPU p95 (ms) | 1.01 | 1.18 |
| About GPU p95 (ms) | 0.77 | 1.28 |
| Desk frames per second while it draws | 59.88 | 59.88 |
| Uneven desk frames (%) | 2.03 | 2.22 |
| Uneven balls frames (%) | 4.55 | 1.15 |
| Uneven About frames (%) | 38.89 | 11.86 |
| Desk resolution at the end (device px per CSS px) | 1 | 1 |
| Desk's pace (refreshes per frame) | 1 | 1 |
| About frames under the curtain | 0 | 26 |
| Camera's largest step in a frame (m) | 0.12119999999999999 | 0.0525 |
| Scrolls under 1 px | 0 | 0 |
| Scroll events with dirty style (%) | 53.3 | 39.48 |
| Desk lowered its resolution | 0 | 0 |
| Site took the low tier by itself | 0 | 0 |
| WebGL blocking (ms) | 54 | 56 |
| …after desk ready (ms) | 0 | 0 |
| Shader programs | 44 | 44 |
| Desk ready (ms) | 2000 | 2050 |
| TTFB (ms) | 3 | 4 |
| FCP (ms) | 380 | 388 |
| LCP (ms) | 380 | 388 |

### returning/notch by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 106 | 17 | 17 | 33 | 2.83 | 2 | desk 0.67/0.89 |
| monitor | 423 | 17 | 17 | 33 | 1.42 | 2 | desk 0.5/1.9, balls 0.84/1.19 |
| macbook | 106 | 17 | 17 | 33 | 2.83 | 2 | desk 1.07/1.14, balls 0.95/0.95 |
| room | 161 | 17 | 17 | 33 | 3.11 | 2 | desk 0.8/1.38 |
| about | 80 | 17 | 17 | 33 | 1.25 | 1 | desk 0.73/0.82, about 0.69/1.82 |
| flow | 600 | 17 | 17 | 33 | 3.5 | 1 | about 0.51/2.07 |

### returning/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 170 | 17 | 17 | 33 | 2.94 | 3 | desk 0.66/0.89 |
| monitor | 662 | 17 | 17 | 33 | 1.06 | 2 | desk 0.5/1.83, balls 0.52/1.11 |
| macbook | 166 | 17 | 33 | 33 | 5.42 | 3 | desk 1.06/1.12 |
| room | 250 | 17 | 17 | 33 | 2.8 | 4 | desk 1/1.38, about 0.46/0.67 |
| about | 123 | 17 | 17 | 17 | 0 | 0 | desk 1.16/1.28, about 0.49/1.34 |
| flow | 669 | 17 | 17 | 33 | 1.35 | 1 | about 0.47/1.49 |

