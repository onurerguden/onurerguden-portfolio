# Performance: final-baseline-gpu

2026-11-15 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1536×730 @1.25x · CPU 2× slower · GPU load 80 · medians of 3 runs

| Metric | returning/notch | returning/trackpad |
|---|---|---|
| Display (Hz) | 60 | 60 |
| Longest frame (ms) | 74 | 90 |
| Frames > 100 ms | 0 | 0 |
| Frames > 50 ms | 5 | 5 |
| …while scrolling, desk ready | 1 | 1 |
| Scroll p95 (ms) | 17 | 17 |
| Scroll p99 (ms) | 33 | 33 |
| Slow scroll frames (%) | 1.54 | 1.16 |
| Scroll frames > 50 ms | 1 | 0 |
| Desk GPU p95 (ms) | 15.77 | 17.76 |
| About GPU p95 (ms) | 5.67 | 5.76 |
| About frames under the curtain | 0 | 27 |
| Camera's largest step in a frame (m) | 0.16870000000000002 | 0.09449999999999999 |
| Scrolls under 1 px | 0 | 0 |
| Scroll events with dirty style (%) | 58.56 | 47.08 |
| Desk lowered its resolution | 0 | 0 |
| WebGL blocking (ms) | 27 | 22 |
| …after desk ready (ms) | 0 | 0 |
| Shader programs | 44 | 44 |
| Desk ready (ms) | 1604 | 1540 |
| TTFB (ms) | 3 | 4 |
| FCP (ms) | 352 | 332 |
| LCP (ms) | 352 | 332 |

### returning/notch by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 96 | 17 | 17 | 33 | 3.13 | 1 | desk 9.57/12.03 |
| monitor | 420 | 17 | 17 | 17 | 0.24 | 1 | desk 10.66/13.54, balls 2.24/2.65 |
| macbook | 117 | 17 | 17 | 33 | 2.56 | 2 | balls 1.74/2.25 |
| room | 161 | 17 | 17 | 33 | 2.48 | 2 | desk 9.58/12.41 |
| about | 79 | 17 | 17 | 33 | 1.27 | 1 | desk 5.81/11.18, about 5.03/13.47 |
| flow | 600 | 17 | 17 | 33 | 2.5 | 1 | about 4.62/5.93 |

### returning/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 162 | 17 | 17 | 17 | 0.62 | 1 | desk 8.88/11.64 |
| monitor | 647 | 17 | 17 | 17 | 0.62 | 2 | desk 9.58/17.93, balls 3.53/9.12 |
| macbook | 192 | 17 | 17 | 50 | 2.6 | 2 | balls 0.91/0.94 |
| room | 258 | 17 | 17 | 17 | 0.78 | 2 | desk 9.57/12.82, about 4.12/5.79 |
| about | 131 | 17 | 17 | 17 | 0 | 0 | desk 7.11/22.75, about 4.45/5.79 |
| flow | 703 | 17 | 17 | 33 | 1.99 | 1 | about 5.06/5.67 |
