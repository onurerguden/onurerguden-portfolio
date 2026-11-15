# Performance: final-baseline

2026-11-15 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1536×730 @1.25x · low tier · CPU 4× slower · medians of 3 runs

| Metric | first-visit/notch | first-visit/trackpad | returning/notch | returning/trackpad |
|---|---|---|---|---|
| Display (Hz) | 60 | 60 | 60 | 60 |
| Longest frame (ms) | 241 | 238 | 156 | 139 |
| Frames > 100 ms | 9 | 9 | 3 | 3 |
| Frames > 50 ms | 20 | 19 | 11 | 11 |
| …while scrolling, desk ready | 7 | 7 | 4 | 4 |
| Scroll p95 (ms) | 17 | 17 | 17 | 17 |
| Scroll p99 (ms) | 33 | 33 | 33 | 33 |
| Slow scroll frames (%) | 3.7 | 3.37 | 3.53 | 2.73 |
| Scroll frames > 50 ms | 7 | 7 | 2 | 2 |
| Desk GPU p95 (ms) | 2.54 | 2.67 | 2.13 | 2.25 |
| About GPU p95 (ms) | 1.01 | 1.16 | 1.28 | 1.04 |
| About frames under the curtain | 0 | 40 | 0 | 30 |
| Camera's largest step in a frame (m) | 0.1305 | 0.053099999999999994 | 0.094 | 0.053399999999999996 |
| Scrolls under 1 px | 0 | 0 | 0 | 0 |
| Scroll events with dirty style (%) | 57.46 | 46.39 | 59.12 | 45.29 |
| Desk lowered its resolution | 0 | 0 | 0 | 0 |
| WebGL blocking (ms) | 100 | 106 | 68 | 73 |
| …after desk ready (ms) | 0 | 16 | 0 | 0 |
| Shader programs | 44 | 44 | 44 | 44 |
| Desk ready (ms) | 3503 | 3602 | 2343 | 2428 |
| TTFB (ms) | 11 | 10 | 4 | 3 |
| FCP (ms) | 500 | 504 | 444 | 464 |
| LCP (ms) | 500 | 504 | 444 | 464 |

### first-visit/notch by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 79 | 17 | 83 | 250 | 12.66 | 4 | desk 0.93/2.54 |
| monitor | 411 | 17 | 17 | 33 | 2.92 | 2 | desk 0.62/2.43, balls 0.59/2.72 |
| macbook | 113 | 17 | 50 | 50 | 7.96 | 3 | desk 1.25/3.08 |
| room | 162 | 17 | 17 | 17 | 0.62 | 1 | desk 1.15/2.65 |
| about | 76 | 17 | 17 | 33 | 3.95 | 2 | desk 0.78/2.1, about 0.53/0.53 |
| flow | 584 | 17 | 17 | 33 | 2.91 | 1 | about 0.52/0.91 |

### first-visit/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 182 | 17 | 17 | 133 | 3.85 | 3 | desk 0.9/2.29 |
| monitor | 649 | 17 | 17 | 33 | 3.54 | 2 | desk 0.61/2.6, balls 0.95/3.16 |
| macbook | 209 | 17 | 33 | 50 | 5.26 | 3 | desk 1.23/2.42, balls 0.3/0.3 |
| room | 261 | 17 | 33 | 50 | 5.36 | 3 | desk 1.21/2.34, about 0.48/0.65 |
| about | 129 | 17 | 17 | 17 | 0 | 0 | desk 1.13/1.75, about 0.53/1.16 |
| flow | 745 | 17 | 17 | 33 | 2.28 | 1 | about 0.52/1.26 |

### returning/notch by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 98 | 17 | 33 | 33 | 6.12 | 2 | desk 0.79/2.15 |
| monitor | 408 | 17 | 17 | 33 | 3.68 | 2 | desk 0.54/1.87, balls 0.74/1.11 |
| macbook | 110 | 17 | 33 | 50 | 10 | 4 | desk 1.1/2.78, balls 0.37/0.8 |
| room | 162 | 17 | 17 | 33 | 1.23 | 2 | desk 1.17/2.64 |
| about | 76 | 17 | 17 | 33 | 3.95 | 2 | desk 0.76/2.32, about 0.53/1.14 |
| flow | 585 | 17 | 17 | 33 | 2.91 | 1 | about 0.5/0.66 |

### returning/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 173 | 17 | 17 | 33 | 1.73 | 2 | desk 0.72/1.4 |
| monitor | 659 | 17 | 17 | 33 | 2.58 | 3 | desk 0.52/1.96, balls 0.57/1.26 |
| macbook | 203 | 17 | 33 | 50 | 5.91 | 5 | desk 1.07/2.22, balls 0.08/0.2 |
| room | 262 | 17 | 17 | 33 | 4.2 | 3 | desk 1.13/2.3, about 0.5/1.04 |
| about | 130 | 17 | 17 | 17 | 0 | 0 | desk 1.26/1.48, about 0.52/1.05 |
| flow | 771 | 17 | 17 | 33 | 2.2 | 1 | about 0.5/0.89 |
