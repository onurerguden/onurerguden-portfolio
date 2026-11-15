# Performance: final-baseline-cpu6

2026-11-15 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1536×730 @1.25x · low tier · CPU 6× slower · medians of 3 runs

| Metric | returning/notch | returning/trackpad |
|---|---|---|
| Display (Hz) | 60 | 60 |
| Longest frame (ms) | 193 | 183 |
| Frames > 100 ms | 6 | 7 |
| Frames > 50 ms | 23 | 24 |
| …while scrolling, desk ready | 9 | 10 |
| Scroll p95 (ms) | 33 | 33 |
| Scroll p99 (ms) | 50 | 50 |
| Slow scroll frames (%) | 12.07 | 12.7 |
| Scroll frames > 50 ms | 6 | 7 |
| Desk GPU p95 (ms) | 2.19 | 2.23 |
| About GPU p95 (ms) | 1.04 | 1.28 |
| About frames under the curtain | 0 | 39 |
| Camera's largest step in a frame (m) | 0.11779999999999999 | 0.0639 |
| Scrolls under 1 px | 0 | 0 |
| Scroll events with dirty style (%) | 57.14 | 42.54 |
| Desk lowered its resolution | 0 | 0 |
| WebGL blocking (ms) | 126 | 127 |
| …after desk ready (ms) | 20 | 20 |
| Shader programs | 44 | 44 |
| Desk ready (ms) | 3501 | 3469 |
| TTFB (ms) | 4 | 4 |
| FCP (ms) | 544 | 504 |
| LCP (ms) | 544 | 504 |

### returning/notch by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 86 | 17 | 33 | 50 | 33.72 | 10 | desk 0.78/2.06 |
| monitor | 374 | 17 | 33 | 34 | 19.52 | 6 | desk 0.53/2.04, balls 0.78/3.01 |
| macbook | 95 | 17 | 67 | 150 | 20 | 12 | desk 1.09/2.87, balls 0.81/0.81 |
| room | 155 | 17 | 33 | 33 | 11.61 | 7 | desk 1.1/2.71 |
| about | 77 | 17 | 33 | 50 | 10.39 | 2 | desk 0.75/1.36, about 0.52/0.85 |
| flow | 608 | 17 | 17 | 33 | 2.63 | 1 | about 0.5/0.54 |

### returning/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 170 | 17 | 33 | 50 | 27.65 | 4 | desk 0.71/1.59 |
| monitor | 678 | 17 | 33 | 33 | 17.4 | 4 | desk 0.52/2.26, balls 0.77/2.97 |
| macbook | 165 | 17 | 33 | 133 | 24.85 | 9 | desk 1.08/2.55 |
| room | 247 | 17 | 33 | 50 | 23.89 | 8 | desk 1.13/2.92, about 0.48/0.98 |
| about | 129 | 17 | 17 | 33 | 1.55 | 1 | desk 1.41/4.57, about 0.52/1.52 |
| flow | 786 | 17 | 17 | 33 | 2.67 | 2 | about 0.5/0.75 |
