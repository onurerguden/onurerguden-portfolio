# Performance: final-after-cpu6

2026-11-15 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1536×730 @1.25x · low tier · CPU 6× slower · medians of 3 runs

| Metric | returning/notch | returning/trackpad |
|---|---|---|
| Display (Hz) | 60 | 60 |
| Longest frame (ms) | 161 | 179 |
| Frames > 100 ms | 5 | 7 |
| Frames > 50 ms | 19 | 19 |
| …while scrolling, desk ready | 5 | 9 |
| Scroll p95 (ms) | 33 | 33 |
| Scroll p99 (ms) | 50 | 33 |
| Slow scroll frames (%) | 8.81 | 8.33 |
| Scroll frames > 50 ms | 6 | 4 |
| Desk GPU p95 (ms) | 1.6 | 1.7 |
| About GPU p95 (ms) | 1.16 | 1.03 |
| About frames under the curtain | 0 | 27 |
| Camera's largest step in a frame (m) | 0.0949 | 0.0592 |
| Scrolls under 1 px | 0 | 0 |
| Scroll events with dirty style (%) | 58.79 | 40.62 |
| Desk lowered its resolution | 0 | 0 |
| WebGL blocking (ms) | 112 | 113 |
| …after desk ready (ms) | 20 | 21 |
| Shader programs | 44 | 44 |
| Desk ready (ms) | 3275 | 3213 |
| TTFB (ms) | 3 | 3 |
| FCP (ms) | 488 | 520 |
| LCP (ms) | 488 | 520 |

### returning/notch by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 83 | 17 | 33 | 67 | 22.89 | 13 | desk 0.78/0.96 |
| monitor | 395 | 17 | 33 | 33 | 12.15 | 3 | desk 0.51/1.73, balls 0.72/1.47 |
| macbook | 95 | 17 | 50 | 100 | 15.79 | 3 | desk 1.06/1.59, balls 0.45/1.35 |
| room | 152 | 17 | 33 | 33 | 9.21 | 5 | desk 0.87/1.89 |
| about | 67 | 17 | 17 | 50 | 4.48 | 2 | desk 0.76/1.43 |
| flow | 594 | 17 | 17 | 33 | 3.03 | 2 | about 0.47/1.16 |

### returning/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 169 | 17 | 33 | 33 | 17.16 | 7 | desk 0.75/1.15 |
| monitor | 628 | 17 | 33 | 33 | 13.85 | 5 | desk 0.51/1.73, balls 0.64/1.2 |
| macbook | 167 | 17 | 33 | 67 | 15.57 | 7 | desk 1.07/1.59, balls 0.73/0.73 |
| room | 228 | 17 | 33 | 33 | 13.16 | 5 | desk 1.07/1.72, about 0.49/0.84 |
| about | 111 | 17 | 17 | 33 | 2.7 | 1 | desk 1.07/1.2, about 0.48/0.68 |
| flow | 786 | 17 | 17 | 33 | 1.4 | 1 | about 0.48/0.97 |
