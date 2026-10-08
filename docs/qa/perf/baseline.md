# Performance: baseline

2026-10-08 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1440×900 @2x · medians of 3 runs

| Metric | first-visit | returning | cpu4 | reduced |
|---|---|---|---|---|
| Longest frame (ms) | 3063 | 180 | 344 | 130 |
| Frames > 100 ms | 5 | 2 | 6 | 1 |
| Frames > 50 ms | 10 | 5 | 9 | 2 |
| Scroll p95 (ms) | 17 | 17 | 17 | 17 |
| Scroll frames > 50 ms | 8 | 2 | 8 | 1 |
| WebGL blocking (ms) | 4208 | 185 | 173 | 8 |
| …after desk ready (ms) | 736 | 22 | 0 | 0 |
| Shader programs | 53 | 53 | 53 | 4 |
| Desk ready (ms) | 4365 | 1181 | 2069 | – |
| TTFB (ms) | 34 | 31 | 28 | 31 |
| FCP (ms) | 244 | 260 | 456 | 248 |
| LCP (ms) | 244 | 260 | 456 | 248 |
