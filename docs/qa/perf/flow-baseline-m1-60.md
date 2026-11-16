# Performance: flow-baseline-m1-60

2026-11-16 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1440×900 @2x · medians of 3 runs

| Metric | returning/trackpad |
|---|---|
| Display (Hz) | 60 |
| Longest frame (ms) | 56 |
| Frames > 100 ms | 0 |
| Frames > 50 ms | 1 |
| …while scrolling, desk ready | 1 |
| Scroll p95 (ms) | 17 |
| Scroll p99 (ms) | 17 |
| Slow scroll frames (%) | 0.17 |
| Scroll frames > 50 ms | 2 |
| Desk GPU p95 (ms) | 6.18 |
| Balls GPU p95 (ms) | 3.34 |
| About GPU p95 (ms) | 3.01 |
| Desk frames per second while it draws | 30.03 |
| Uneven desk frames (%) | 16.02 |
| Uneven balls frames (%) | 0 |
| Uneven About frames (%) | 12.39 |
| Desk resolution at the end (device px per CSS px) | 1.5 |
| Desk's pace (refreshes per frame) | 1 |
| About frames under the curtain | 111 |
| Camera's largest step in a frame (m) | 0.07519999999999999 |
| Scrolls under 1 px | 0 |
| Scroll events with dirty style (%) | 37.58 |
| Desk lowered its resolution | 0 |
| Site took the low tier by itself | 0 |
| WebGL blocking (ms) | 13 |
| …after desk ready (ms) | 0 |
| Shader programs | 44 |
| Desk ready (ms) | 1199 |
| TTFB (ms) | 5 |
| FCP (ms) | 180 |
| LCP (ms) | 180 |

### returning/trackpad by region

| Region | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms) |
|---|---|---|---|---|---|---|---|
| opening | 208 | 17 | 17 | 17 | 0 | 0 | desk 2.06/4.08 |
| monitor | 658 | 17 | 17 | 17 | 0.3 | 2 | desk 2.86/7.7, balls 1.32/3.33 |
| macbook | 201 | 17 | 17 | 17 | 0.5 | 1 | – |
| room | 352 | 17 | 17 | 17 | 0.28 | 1 | desk 3.95/6.11, about 0.95/1.84 |
| about | 172 | 17 | 17 | 17 | 0 | 0 | desk 3.74/5.8, about 1.44/3.15 |
| flow | 775 | 17 | 17 | 17 | 0 | 0 | about 1.37/2.86 |

