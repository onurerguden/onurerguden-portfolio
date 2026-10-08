# Performance: 02-warm-desk

2026-10-08 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1440×900 @2x · medians of 3 runs

| Metric | first-visit | returning | cpu4 | reduced |
|---|---|---|---|---|
| Longest frame (ms) | 898 | 148 | 341 | 73 |
| Frames > 100 ms | 4 | 1 | 7 | 0 |
| Frames > 50 ms | 9 | 4 | 13 | 1 |
| Scroll p95 (ms) | 17 | 17 | 17 | 17 |
| Scroll frames > 50 ms | 6 | 2 | 10 | 0 |
| WebGL blocking (ms) | 1567 | 76 | 101 | 9 |
| …after desk ready (ms) | 413 | 0 | 0 | 0 |
| Shader programs | 53 | 53 | 53 | 4 |
| Desk ready (ms) | 3518 | 1190 | 2111 | – |
| TTFB (ms) | 43 | 30 | 30 | 31 |
| FCP (ms) | 256 | 256 | 472 | 248 |
| LCP (ms) | 256 | 256 | 472 | 248 |
