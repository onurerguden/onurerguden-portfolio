# Performance: butter-final

2026-10-09 · https://onurerguden.dev/en · ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version) · 1440×900 @2x · medians of 3 runs

| Metric                               | first-visit/trackpad | returning/trackpad | cpu4/trackpad |
| ------------------------------------ | -------------------- | ------------------ | ------------- |
| Display (Hz)                         | 60                   | 60                 | 60            |
| Longest frame (ms)                   | 258                  | 59                 | 179           |
| Frames > 100 ms                      | 3                    | 0                  | 2             |
| Frames > 50 ms                       | 10                   | 1                  | 10            |
| …while scrolling, desk ready         | 5                    | 1                  | 3             |
| Scroll p95 (ms)                      | 17                   | 17                 | 17            |
| Scroll p99 (ms)                      | 33                   | 17                 | 33            |
| Slow scroll frames (%)               | 1.24                 | 0.48               | 1.68          |
| Scroll frames > 50 ms                | 3                    | 0                  | 1             |
| Desk GPU p95 (ms)                    | 7.36                 | 6.8                | 7.52          |
| About GPU p95 (ms)                   | 2.42                 | 2.36               | 2.21          |
| About frames under the curtain       | 108                  | 114                | 84            |
| Camera's largest step in a frame (m) | 0.0741               | 0.0755             | 0.084         |
| Scrolls under 1 px                   | 0                    | 0                  | 0             |
| Scroll events with dirty style (%)   | 56.06                | 56.52              | 55.35         |
| Desk lowered its resolution          | 0                    | 0                  | 0             |
| WebGL blocking (ms)                  | 47                   | 4                  | 32            |
| …after desk ready (ms)               | 0                    | 0                  | 0             |
| Shader programs                      | 41                   | 41                 | 41            |
| Desk ready (ms)                      | 2864                 | 1279               | 2107          |
| TTFB (ms)                            | 483                  | 54                 | 59            |
| FCP (ms)                             | 788                  | 248                | 460           |
| LCP (ms)                             | 788                  | 248                | 648           |

### first-visit/trackpad by region

| Region  | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms)                |
| ------- | ------ | --- | --- | --- | -------- | ----------- | ------------------------------- |
| opening | 202    | 17  | 17  | 33  | 3.47     | 2           | desk 2.75/5.16                  |
| monitor | 577    | 17  | 17  | 17  | 0.52     | 1           | desk 4.09/7.22, balls 1.8/5.21  |
| macbook | 192    | 17  | 17  | 17  | 0        | 0           | –                               |
| room    | 329    | 17  | 17  | 50  | 2.13     | 1           | desk 5.01/7.55, about 1.73/2.3  |
| about   | 160    | 17  | 17  | 17  | 0.63     | 1           | desk 3.97/13.24, about 2.1/2.71 |
| flow    | 852    | 17  | 17  | 17  | 0.7      | 1           | about 1.98/2.28                 |

### returning/trackpad by region

| Region  | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms)                 |
| ------- | ------ | --- | --- | --- | -------- | ----------- | -------------------------------- |
| opening | 200    | 17  | 17  | 17  | 0        | 0           | desk 2.78/5.09                   |
| monitor | 570    | 17  | 17  | 17  | 0.35     | 1           | desk 3.86/6.89, balls 1.68/3.99  |
| macbook | 194    | 17  | 17  | 17  | 0.52     | 1           | –                                |
| room    | 340    | 17  | 17  | 17  | 0.88     | 1           | desk 5.05/6.88, about 1.44/2.08  |
| about   | 182    | 17  | 17  | 17  | 0.55     | 1           | desk 7.01/14.15, about 1.91/2.36 |
| flow    | 843    | 17  | 17  | 17  | 0.47     | 1           | about 1.97/2.46                  |

### cpu4/trackpad by region

| Region  | Frames | p50 | p95 | p99 | Slow (%) | Slow streak | GPU p50/p95 (ms)                |
| ------- | ------ | --- | --- | --- | -------- | ----------- | ------------------------------- |
| opening | 200    | 17  | 17  | 33  | 1        | 1           | desk 2.53/4.55                  |
| monitor | 518    | 17  | 17  | 33  | 1.35     | 2           | desk 4.14/9.27, balls 1.81/4.74 |
| macbook | 166    | 17  | 17  | 33  | 3.01     | 3           | –                               |
| room    | 305    | 17  | 17  | 33  | 2.3      | 2           | desk 5.12/6.98, about 1.6/2.2   |
| about   | 146    | 17  | 17  | 17  | 0.68     | 1           | desk 5.52/10.8, about 1.88/2.2  |
| flow    | 745    | 17  | 17  | 33  | 1.74     | 1           | about 1.84/2.17                 |
