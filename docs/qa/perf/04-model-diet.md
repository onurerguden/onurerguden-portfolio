# Performance: 04-model-diet

2026-10-08 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1440×900 @2x · medians of 3 runs

| Metric | first-visit | returning | cpu4 | reduced |
|---|---|---|---|---|
| Longest frame (ms) | 487 | 141 | 339 | 73 |
| Frames > 100 ms | 3 | 1 | 5 | 0 |
| Frames > 50 ms | 8 | 3 | 10 | 2 |
| Scroll p95 (ms) | 17 | 17 | 17 | 17 |
| Scroll frames > 50 ms | 5 | 1 | 8 | 0 |
| WebGL blocking (ms) | 705 | 53 | 62 | 8 |
| …after desk ready (ms) | 405 | 0 | 0 | 0 |
| Shader programs | 36 | 36 | 36 | 4 |
| Desk ready (ms) | 2674 | 1108 | 1917 | – |
| TTFB (ms) | 33 | 26 | 27 | 32 |
| FCP (ms) | 236 | 248 | 476 | 244 |
| LCP (ms) | 236 | 248 | 476 | 244 |
