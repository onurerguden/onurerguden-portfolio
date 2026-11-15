# Performance: final-after-gpu

2026-11-15 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1536×730 @1.25x · CPU 2× slower · GPU load 80 · medians of 3 runs

| Metric | returning/notch | returning/trackpad |
|---|---|---|
| Display (Hz) | 60 | 60 |
| Longest frame (ms) | 91 | 87 |
| Frames > 100 ms | 0 | 0 |
| Frames > 50 ms | 4 | 3 |
| …while scrolling, desk ready | 1 | 0 |
| Scroll p95 (ms) | 17 | 17 |
| Scroll p99 (ms) | 33 | 17 |
| Slow scroll frames (%) | 1.42 | 0.57 |
| Scroll frames > 50 ms | 0 | 0 |
| Desk GPU p95 (ms) | 14.4 | 14.32 |
| About GPU p95 (ms) | 6.78 | 2.7 |
| About frames under the curtain | 0 | 34 |
| Camera's largest step in a frame (m) | 0.1736 | 0.0817 |
| Scrolls under 1 px | 0 | 0 |
| Scroll events with dirty style (%) | 57.46 | 42.36 |
| Desk lowered its resolution | 1 | 0 |
| WebGL blocking (ms) | 20 | 20 |
| …after desk ready (ms) | 0 | 0 |
| Shader programs | 44 | 44 |
| Desk ready (ms) | 1481 | 1483 |
| TTFB (ms) | 3 | 3 |
| FCP (ms) | 312 | 308 |
| LCP (ms) | 312 | 308 |

### returning/notch by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 102 | 17 | 17 | 17 | 0.98 | 1 | desk 9.68/13.72 |
| monitor | 429 | 17 | 17 | 17 | 0.47 | 2 | desk 10.22/22.05, balls 3.35/7.33 |
| macbook | 107 | 17 | 17 | 17 | 0.93 | 1 | balls 2.77/2.77 |
| room | 164 | 17 | 17 | 17 | 0 | 0 | desk 9.37/14.54 |
| about | 81 | 17 | 17 | 17 | 0 | 0 | desk 7.23/8.79, about 4.77/11.76 |
| flow | 600 | 17 | 17 | 33 | 2.83 | 1 | about 4.81/5.42 |

### returning/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 163 | 17 | 17 | 17 | 0.61 | 1 | desk 8.07/10.07 |
| monitor | 650 | 17 | 17 | 17 | 0.31 | 1 | desk 9.4/18.67, balls 3.57/9.28 |
| macbook | 195 | 17 | 17 | 33 | 1.03 | 2 | balls 0.56/0.62 |
| room | 264 | 17 | 17 | 17 | 0.38 | 1 | desk 9.87/14.1, about 1.83/2.4 |
| about | 132 | 17 | 17 | 17 | 0 | 0 | desk 4.58/9.08, about 2.17/2.8 |
| flow | 702 | 17 | 17 | 17 | 0.85 | 1 | about 2.1/2.63 |
