# Performance: final-baseline-gpu-low

2026-11-15 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1536×730 @1.25x · low tier · CPU 2× slower · GPU load 80 · medians of 3 runs

| Metric | returning/notch | returning/trackpad |
|---|---|---|
| Display (Hz) | 60 | 60 |
| Longest frame (ms) | 72 | 77 |
| Frames > 100 ms | 0 | 0 |
| Frames > 50 ms | 5 | 5 |
| …while scrolling, desk ready | 1 | 2 |
| Scroll p95 (ms) | 17 | 17 |
| Scroll p99 (ms) | 33 | 33 |
| Slow scroll frames (%) | 1.46 | 1.13 |
| Scroll frames > 50 ms | 0 | 2 |
| Desk GPU p95 (ms) | 10.69 | 11.87 |
| About GPU p95 (ms) | 4.39 | 3.01 |
| About frames under the curtain | 0 | 36 |
| Camera's largest step in a frame (m) | 0.094 | 0.0537 |
| Scrolls under 1 px | 0 | 0 |
| Scroll events with dirty style (%) | 60.77 | 46.25 |
| Desk lowered its resolution | 0 | 0 |
| WebGL blocking (ms) | 22 | 22 |
| …after desk ready (ms) | 0 | 0 |
| Shader programs | 44 | 44 |
| Desk ready (ms) | 1518 | 1514 |
| TTFB (ms) | 5 | 3 |
| FCP (ms) | 328 | 324 |
| LCP (ms) | 328 | 324 |

### returning/notch by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 107 | 17 | 17 | 33 | 1.87 | 1 | desk 7.52/11.37 |
| monitor | 441 | 17 | 17 | 17 | 0.45 | 2 | desk 7.72/10.61, balls 2.47/9.63 |
| macbook | 108 | 17 | 17 | 33 | 2.78 | 3 | desk 7.34/9.28, balls 2.47/2.47 |
| room | 162 | 17 | 17 | 33 | 1.23 | 2 | desk 6.59/10.65 |
| about | 83 | 17 | 17 | 17 | 0 | 0 | desk 4.83/6.53, about 2.25/4.9 |
| flow | 604 | 17 | 17 | 33 | 2.15 | 1 | about 2.11/2.25 |

### returning/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 178 | 17 | 17 | 33 | 1.12 | 1 | desk 7.72/10.95 |
| monitor | 669 | 17 | 17 | 17 | 0.45 | 1 | desk 7.98/11.22, balls 2.3/12.24 |
| macbook | 202 | 17 | 17 | 33 | 2.97 | 3 | desk 8.46/13.26, balls 0.09/0.1 |
| room | 269 | 17 | 17 | 17 | 0.37 | 1 | desk 6.54/11.26, about 1.28/4.08 |
| about | 132 | 17 | 17 | 17 | 0 | 0 | desk 7.06/9.88, about 2.35/3.33 |
| flow | 713 | 17 | 17 | 33 | 1.96 | 1 | about 2.16/2.65 |
