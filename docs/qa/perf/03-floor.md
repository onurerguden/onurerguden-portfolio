# Performance: 03-floor

2026-10-08 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1440×900 @2x · medians of 3 runs

| Metric | first-visit | returning | cpu4 | reduced |
|---|---|---|---|---|
| Longest frame (ms) | 469 | 135 | 323 | 70 |
| Frames > 100 ms | 3 | 1 | 5 | 0 |
| Frames > 50 ms | 8 | 4 | 11 | 2 |
| Scroll p95 (ms) | 17 | 17 | 17 | 17 |
| Scroll frames > 50 ms | 5 | 2 | 8 | 0 |
| WebGL blocking (ms) | 694 | 64 | 87 | 8 |
| …after desk ready (ms) | 394 | 0 | 0 | 0 |
| Shader programs | 36 | 36 | 36 | 4 |
| Desk ready (ms) | 2574 | 1106 | 1949 | – |
| TTFB (ms) | 34 | 29 | 27 | 28 |
| FCP (ms) | 232 | 248 | 472 | 236 |
| LCP (ms) | 232 | 248 | 472 | 236 |
