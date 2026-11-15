# Performance: final-after-gpu-low

2026-11-15 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1536×730 @1.25x · low tier · CPU 2× slower · GPU load 80 · medians of 3 runs

| Metric | returning/notch | returning/trackpad |
|---|---|---|
| Display (Hz) | 60 | 60 |
| Longest frame (ms) | 86 | 69 |
| Frames > 100 ms | 0 | 0 |
| Frames > 50 ms | 2 | 3 |
| …while scrolling, desk ready | 0 | 0 |
| Scroll p95 (ms) | 17 | 17 |
| Scroll p99 (ms) | 33 | 17 |
| Slow scroll frames (%) | 1.43 | 0.61 |
| Scroll frames > 50 ms | 1 | 0 |
| Desk GPU p95 (ms) | 11.33 | 11.65 |
| About GPU p95 (ms) | 4.13 | 2.86 |
| About frames under the curtain | 0 | 27 |
| Camera's largest step in a frame (m) | 0.0955 | 0.0527 |
| Scrolls under 1 px | 0 | 0 |
| Scroll events with dirty style (%) | 52.49 | 42.32 |
| Desk lowered its resolution | 0 | 0 |
| WebGL blocking (ms) | 16 | 22 |
| …after desk ready (ms) | 0 | 0 |
| Shader programs | 44 | 44 |
| Desk ready (ms) | 1444 | 1494 |
| TTFB (ms) | 3 | 3 |
| FCP (ms) | 308 | 312 |
| LCP (ms) | 308 | 312 |

### returning/notch by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 101 | 17 | 17 | 33 | 1.98 | 1 | desk 7.73/12 |
| monitor | 420 | 17 | 17 | 17 | 0 | 0 | desk 8.15/10.39, balls 2.12/12 |
| macbook | 118 | 17 | 17 | 33 | 1.69 | 2 | desk 8.24/13.4, balls 2.08/2.6 |
| room | 163 | 17 | 17 | 17 | 0.61 | 1 | desk 5.88/11.77 |
| about | 80 | 17 | 17 | 17 | 0 | 0 | desk 5.59/6.33, about 2.37/5.84 |
| flow | 586 | 17 | 17 | 33 | 3.92 | 1 | about 2.09/2.42 |

### returning/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 170 | 17 | 17 | 33 | 1.18 | 1 | desk 7.4/10.02 |
| monitor | 663 | 17 | 17 | 17 | 0.3 | 1 | desk 8.1/11.76, balls 2.73/9.66 |
| macbook | 162 | 17 | 17 | 33 | 1.23 | 1 | desk 8.81/12.38 |
| room | 250 | 17 | 17 | 17 | 0.4 | 1 | desk 6.23/10.97, about 2.08/5.52 |
| about | 129 | 17 | 17 | 17 | 0 | 0 | desk 6.64/10.78, about 2.18/2.84 |
| flow | 657 | 17 | 17 | 33 | 1.22 | 1 | about 2.15/2.67 |
