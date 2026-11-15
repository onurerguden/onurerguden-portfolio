# Performance: final-after

2026-11-15 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1536×730 @1.25x · low tier · CPU 4× slower · medians of 3 runs

| Metric | first-visit/notch | first-visit/trackpad | returning/notch | returning/trackpad |
|---|---|---|---|---|
| Display (Hz) | 60 | 60 | 60 | 60 |
| Longest frame (ms) | 245 | 226 | 150 | 108 |
| Frames > 100 ms | 7 | 6 | 2 | 2 |
| Frames > 50 ms | 16 | 13 | 8 | 11 |
| …while scrolling, desk ready | 5 | 3 | 1 | 2 |
| Scroll p95 (ms) | 17 | 17 | 17 | 17 |
| Scroll p99 (ms) | 50 | 33 | 33 | 33 |
| Slow scroll frames (%) | 4.09 | 2.31 | 2.97 | 1.96 |
| Scroll frames > 50 ms | 6 | 5 | 1 | 2 |
| Desk GPU p95 (ms) | 1.55 | 1.58 | 1.42 | 1.47 |
| About GPU p95 (ms) | 0.81 | 0.8 | 0.78 | 0.78 |
| About frames under the curtain | 22 | 36 | 0 | 27 |
| Camera's largest step in a frame (m) | 0.1684 | 0.054000000000000006 | 0.0949 | 0.0525 |
| Scrolls under 1 px | 0 | 0 | 0 | 0 |
| Scroll events with dirty style (%) | 55.8 | 43 | 58.01 | 44.02 |
| Desk lowered its resolution | 0 | 0 | 0 | 0 |
| Site took the low tier by itself | 0 | 0 | 0 | 0 |
| WebGL blocking (ms) | 102 | 101 | 64 | 64 |
| …after desk ready (ms) | 0 | 0 | 0 | 0 |
| Shader programs | 44 | 44 | 44 | 44 |
| Desk ready (ms) | 3602 | 3369 | 2192 | 2328 |
| TTFB (ms) | 9 | 9 | 4 | 3 |
| FCP (ms) | 508 | 476 | 424 | 448 |
| LCP (ms) | 508 | 476 | 424 | 448 |

### first-visit/notch by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 83 | 17 | 50 | 250 | 9.64 | 2 | desk 0.91/1.49 |
| monitor | 417 | 17 | 17 | 33 | 2.64 | 2 | desk 0.61/1.3 |
| macbook | 109 | 17 | 33 | 33 | 11.93 | 3 | desk 1.23/1.81, balls 0.96/0.96 |
| room | 168 | 17 | 17 | 17 | 0.6 | 1 | desk 1.21/1.55 |
| about | 76 | 17 | 17 | 33 | 2.63 | 2 | desk 0.78/1.45, about 1.02/1.02 |
| flow | 589 | 17 | 17 | 33 | 4.07 | 1 | about 0.5/1.11 |

### first-visit/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 171 | 17 | 17 | 217 | 4.68 | 2 | desk 0.79/1.27 |
| monitor | 635 | 17 | 17 | 33 | 1.89 | 3 | desk 0.6/1.96, balls 0.77/1.34 |
| macbook | 201 | 17 | 17 | 33 | 4.98 | 3 | desk 1.23/1.49, balls 0.5/1.05 |
| room | 259 | 17 | 17 | 50 | 3.09 | 2 | desk 1.09/1.55, about 0.47/0.87 |
| about | 130 | 17 | 17 | 17 | 0 | 0 | desk 1.1/1.32, about 0.5/0.56 |
| flow | 737 | 17 | 17 | 33 | 1.09 | 1 | about 0.48/0.52 |

### returning/notch by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 97 | 17 | 17 | 33 | 3.09 | 2 | desk 0.72/0.99 |
| monitor | 426 | 17 | 17 | 33 | 2.11 | 2 | desk 0.51/1.53, balls 0.63/1.49 |
| macbook | 104 | 17 | 33 | 50 | 7.69 | 2 | desk 1.09/1.43, balls 0.48/1 |
| room | 160 | 17 | 17 | 17 | 0.63 | 1 | desk 1/1.39 |
| about | 71 | 17 | 17 | 33 | 1.41 | 1 | desk 0.76/0.88, about 0.75/0.78 |
| flow | 601 | 17 | 17 | 33 | 2.16 | 1 | about 0.49/0.74 |

### returning/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 170 | 17 | 17 | 33 | 1.76 | 3 | desk 0.68/1.06 |
| monitor | 629 | 17 | 17 | 33 | 2.38 | 2 | desk 0.52/1.77, balls 0.7/1.13 |
| macbook | 168 | 17 | 33 | 50 | 6.55 | 3 | desk 1.08/1.45, balls 0.8/0.8 |
| room | 229 | 17 | 17 | 33 | 3.49 | 2 | desk 1.01/1.42, about 0.69/1.02 |
| about | 115 | 17 | 17 | 17 | 0 | 0 | desk 0.95/1.87, about 0.49/0.96 |
| flow | 760 | 17 | 17 | 33 | 1.05 | 1 | about 0.48/0.95 |
