# Performance: butter-baseline

2026-10-09 · http://localhost:3400/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1440×900 @2x · medians of 3 runs

| Metric                             | first-visit/trackpad | returning/trackpad | cpu4/trackpad |
| ---------------------------------- | -------------------- | ------------------ | ------------- |
| Display (Hz)                       | 60                   | 60                 | 60            |
| Longest frame (ms)                 | 512                  | 83                 | 211           |
| Frames > 100 ms                    | 5                    | 0                  | 6             |
| Frames > 50 ms                     | 10                   | 3                  | 11            |
| …while scrolling, desk ready       | 4                    | 2                  | 4             |
| Scroll p95 (ms)                    | 17                   | 17                 | 17            |
| Scroll p99 (ms)                    | 33                   | 33                 | 33            |
| Slow scroll frames (%)             | 3.13                 | 3.02               | 4.82          |
| Scroll frames > 50 ms              | 4                    | 1                  | 4             |
| Desk GPU p95 (ms)                  | 8.94                 | 7.72               | 8.83          |
| About GPU p95 (ms)                 | 4.7                  | 4.22               | 3.56          |
| About frames under the curtain     | 220                  | 231                | 226           |
| Camera lurch (max ÷ median step)   | 3.69                 | 3.81               | 3.81          |
| Scrolls under 1 px                 | 0                    | 0                  | 0             |
| Scroll events with dirty style (%) | 40.28                | 42.44              | 46.45         |
| Desk lowered its resolution        | 1                    | 1                  | 1             |
| WebGL blocking (ms)                | 321                  | 35                 | 52            |
| …after desk ready (ms)             | 0                    | 0                  | 0             |
| Shader programs                    | 37                   | 37                 | 37            |
| Desk ready (ms)                    | 2679                 | 1075               | 1883          |
| TTFB (ms)                          | 13                   | 6                  | 5             |
| FCP (ms)                           | 212                  | 200                | 432           |
| LCP (ms)                           | 212                  | 200                | 432           |

### first-visit/trackpad by region

| Region  | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms)                |
| ------- | ------ | --- | --- | --- | -------- | ----------- | ------------------------------- |
| opening | 204    | 17  | 17  | 50  | 4.41     | 2           | desk 5.12/7.2                   |
| monitor | 514    | 17  | 17  | 33  | 1.75     | 1           | desk 3.09/3.77, balls 2.37/3.02 |
| macbook | 164    | 17  | 33  | 33  | 23.78    | 1           | –                               |
| room    | 311    | 17  | 17  | 33  | 3.22     | 1           | desk 5.67/9.88, about 2.41/5.5  |
| about   | 159    | 17  | 17  | 17  | 0        | 0           | about 2.99/3.37                 |
| flow    | 769    | 17  | 17  | 17  | 0.65     | 1           | about 2.95/3.39                 |

### returning/trackpad by region

| Region  | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms)                |
| ------- | ------ | --- | --- | --- | -------- | ----------- | ------------------------------- |
| opening | 195    | 17  | 17  | 17  | 0.51     | 1           | desk 4.87/6.95                  |
| monitor | 536    | 17  | 17  | 33  | 2.24     | 1           | desk 3.87/5.37, balls 2.42/3.05 |
| macbook | 166    | 17  | 33  | 33  | 18.07    | 1           | –                               |
| room    | 308    | 17  | 17  | 33  | 2.27     | 1           | desk 5.52/9.13, about 2.58/5.4  |
| about   | 138    | 17  | 17  | 17  | 0        | 0           | about 2.94/3.42                 |
| flow    | 780    | 17  | 17  | 17  | 0.64     | 1           | about 2.94/3.66                 |

### cpu4/trackpad by region

| Region  | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms)                |
| ------- | ------ | --- | --- | --- | -------- | ----------- | ------------------------------- |
| opening | 203    | 17  | 17  | 33  | 1.97     | 2           | desk 4.73/7.95                  |
| monitor | 502    | 17  | 17  | 33  | 3.59     | 2           | desk 3.14/7.74, balls 2.41/3.07 |
| macbook | 157    | 17  | 33  | 33  | 19.11    | 1           | –                               |
| room    | 300    | 17  | 33  | 33  | 5        | 4           | desk 5.15/9.5, about 2.09/4.56  |
| about   | 146    | 17  | 17  | 17  | 0        | 0           | about 2.49/3.34                 |
| flow    | 703    | 17  | 17  | 33  | 4.27     | 2           | about 2.49/3.41                 |
