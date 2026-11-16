# Performance: flow-baseline-m1-120

2026-11-15 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1440×900 @2x · profile m1-120 · headed · medians of 3 runs

| Metric | returning/notch | returning/trackpad |
|---|---|---|
| Display (Hz) | 119 | 120 |
| Longest frame (ms) | 91 | 56 |
| Frames > 100 ms | 0 | 0 |
| Frames > 50 ms | 2 | 1 |
| …while scrolling, desk ready | 1 | 1 |
| Scroll p95 (ms) | 10 | 10 |
| Scroll p99 (ms) | 17 | 16 |
| Slow scroll frames (%) | 2.12 | 1.27 |
| Scroll frames > 50 ms | 2 | 1 |
| Desk GPU p95 (ms) | 4.23 | 4.15 |
| Balls GPU p95 (ms) | 5.38 | 3.25 |
| About GPU p95 (ms) | 4.51 | 4.02 |
| Desk frames per second while it draws | 62.5 | 62.5 |
| Uneven desk frames (%) | 10.17 | 20 |
| Uneven balls frames (%) | – | 3.64 |
| Uneven About frames (%) | 55.56 | 43.92 |
| About frames under the curtain | 0 | 39 |
| Camera's largest step in a frame (m) | 0.0909 | 0.0541 |
| Scrolls under 1 px | 0 | 0 |
| Scroll events with dirty style (%) | 57.53 | 42.16 |
| Desk lowered its resolution | 0 | 0 |
| Site took the low tier by itself | 0 | 0 |
| WebGL blocking (ms) | 13 | 20 |
| …after desk ready (ms) | 0 | 0 |
| Shader programs | 44 | 44 |
| Desk ready (ms) | 1262 | 1228 |
| TTFB (ms) | 5 | 6 |
| FCP (ms) | 240 | 204 |
| LCP (ms) | 240 | 204 |

### returning/notch by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 225 | 8 | 10 | 18 | 3.11 | 2 | desk 1.76/3.65 |
| monitor | 707 | 8 | 10 | 17 | 1.56 | 2 | desk 2.01/3.97, balls 2.39/5.43 |
| macbook | 172 | 8 | 10 | 25 | 4.07 | 3 | – |
| room | 365 | 8 | 10 | 17 | 4.11 | 6 | desk 2.47/4.05 |
| about | 161 | 8 | 10 | 32 | 1.24 | 2 | about 1.57/4.41 |
| flow | 1162 | 8 | 10 | 17 | 1.89 | 1 | about 1.98/4.89 |

### returning/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 288 | 8 | 10 | 16 | 2.08 | 1 | desk 1.54/3.51 |
| monitor | 920 | 8 | 10 | 17 | 1.41 | 4 | desk 2.01/4.32, balls 1.55/3.39 |
| macbook | 226 | 8 | 10 | 17 | 2.21 | 4 | balls 1.2/1.2 |
| room | 468 | 8 | 10 | 17 | 1.92 | 2 | desk 2.56/4.89, about 1.08/3.61 |
| about | 201 | 8 | 10 | 10 | 0.5 | 1 | about 1.57/4.38 |
| flow | 1210 | 8 | 10 | 10 | 0.66 | 1 | about 1.64/3.69 |

### At each stop (returning/notch)

| Stop | Layers that draw | Their area (views) | Canvases: draw calls / triangles |
|---|---|---|---|
| opening | 12 | 8.81 | desk 27 / 30048 |
| monitor | – | – | desk 29 / 29643 |
| balls | – | – | balls 1 / 21600, desk 34 / 36924 |
| explorer | – | – | desk 34 / 36924 |
| room | 29 | 12.81 | desk 55 / 54151, about 9 / 19410 |
| about | 7 | 5.61 | desk 55 / 54151, about 28 / 41374 |
