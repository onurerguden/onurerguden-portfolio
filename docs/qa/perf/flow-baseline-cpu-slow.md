# Performance: flow-baseline-cpu-slow

2026-11-15 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1536×730 @1.25x · profile cpu-slow · low tier · CPU 4× slower · medians of 3 runs

| Metric | returning/notch | returning/trackpad |
|---|---|---|
| Display (Hz) | 60 | 60 |
| Longest frame (ms) | 161 | 129 |
| Frames > 100 ms | 2 | 1 |
| Frames > 50 ms | 6 | 7 |
| …while scrolling, desk ready | 0 | 1 |
| Scroll p95 (ms) | 17 | 17 |
| Scroll p99 (ms) | 33 | 33 |
| Slow scroll frames (%) | 2.88 | 1.67 |
| Scroll frames > 50 ms | 1 | 1 |
| Desk GPU p95 (ms) | 2.15 | 2.28 |
| Balls GPU p95 (ms) | 3.44 | 2.97 |
| About GPU p95 (ms) | 1.27 | 0.76 |
| Desk frames per second while it draws | 58.82 | 58.82 |
| Uneven desk frames (%) | 2.75 | 2.11 |
| Uneven balls frames (%) | 4.17 | 0.97 |
| Uneven About frames (%) | 39.13 | 12.02 |
| About frames under the curtain | 0 | 28 |
| Camera's largest step in a frame (m) | 0.1211 | 0.0545 |
| Scrolls under 1 px | 0 | 0 |
| Scroll events with dirty style (%) | 54.14 | 41.99 |
| Desk lowered its resolution | 0 | 0 |
| Site took the low tier by itself | 0 | 0 |
| WebGL blocking (ms) | 57 | 66 |
| …after desk ready (ms) | 0 | 0 |
| Shader programs | 44 | 44 |
| Desk ready (ms) | 2100 | 2106 |
| TTFB (ms) | 4 | 5 |
| FCP (ms) | 392 | 404 |
| LCP (ms) | 392 | 404 |

### returning/notch by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 104 | 17 | 17 | 33 | 4.81 | 2 | desk 0.66/1.44 |
| monitor | 423 | 17 | 17 | 33 | 2.36 | 2 | desk 0.5/2.04, balls 0.8/2.84 |
| macbook | 107 | 17 | 17 | 50 | 2.8 | 2 | desk 1.07/2.05, balls 0.35/0.35 |
| room | 162 | 17 | 17 | 33 | 3.09 | 2 | desk 0.81/1.64 |
| about | 81 | 17 | 17 | 33 | 2.47 | 2 | desk 0.75/2.71, about 0.48/2.76 |
| flow | 598 | 17 | 17 | 33 | 3.01 | 1 | about 0.46/0.51 |

### returning/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 171 | 17 | 17 | 33 | 1.75 | 3 | desk 0.56/1.21 |
| monitor | 650 | 17 | 17 | 33 | 1.54 | 2 | desk 0.5/2.07, balls 0.75/2.97 |
| macbook | 192 | 17 | 17 | 33 | 4.69 | 3 | desk 1.07/2.4, balls 0.21/0.38 |
| room | 254 | 17 | 17 | 33 | 1.97 | 2 | desk 1/2.74, about 0.47/0.66 |
| about | 130 | 17 | 17 | 17 | 0 | 0 | desk 1.22/3, about 0.48/0.52 |
| flow | 703 | 17 | 17 | 33 | 1.14 | 1 | about 0.47/0.5 |

### At each stop (returning/notch)

| Stop | Layers that draw | Their area (views) | Canvases: draw calls / triangles |
|---|---|---|---|
| opening | 16 | 8.72 | desk 28 / 27628 |
| monitor | 21 | 7.87 | desk 29 / 26963 |
| balls | 23 | 10.21 | balls 1 / 21600, desk 37 / 37838 |
| explorer | 22 | 9.9 | desk 37 / 37838 |
| room | 35 | 12.38 | desk 55 / 51471, about 9 / 19410 |
| about | 28 | 10.01 | desk 55 / 51471, about 28 / 41374 |
