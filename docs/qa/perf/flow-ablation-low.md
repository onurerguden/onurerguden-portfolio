# Ablation: flow-ablation-low

2026-11-16 · http://localhost:3400/en · 1536×730 @1.25x · low tier · GPU load 80 · 90 frames per variant

Each row draws the scene with one thing taken away and says what the GPU saved. Rows within about 0.1 ms of each other are noise.

### about

Everything: 1.75 ms per frame (p90 3.32), 28 draw calls, 41374 triangles, 1.18 MP.

| Drawn | GPU p50 (ms) | Saved (ms) | Saved (%) | Triangles it holds | Draw calls |
|---|---|---|---|---|---|
| 0.75 of the resolution | 1.43 | 0.32 | 18 | 41374 | 28 |
| without racket | 1.58 | 0.17 | 10 | 36974 | 25 |
| without photo | 1.61 | 0.14 | 8 | 40772 | 25 |
| without keycaps | 1.68 | 0.07 | 4 | 39426 | 24 |
| without logo-2 | 1.76 | -0.01 | -1 | 30886 | 27 |
| without logo-0 | 1.77 | -0.02 | -1 | 37314 | 27 |
| without DirectionalLight 1 | 1.77 | -0.02 | -1 | 41374 | 28 |
| without DirectionalLight 0 | 1.78 | -0.03 | -2 | 41374 | 28 |
| without braces | 1.79 | -0.04 | -2 | 41002 | 27 |
| without basketball | 1.8 | -0.05 | -3 | 35358 | 27 |
| without tennis | 1.8 | -0.05 | -3 | 38014 | 27 |
| without terminal | 1.82 | -0.07 | -4 | 40400 | 26 |
| without network | 1.82 | -0.07 | -4 | 34414 | 26 |
| no clearcoat | 1.83 | -0.08 | -5 | 41374 | 28 |
| without chip | 1.86 | -0.11 | -6 | 40160 | 25 |
| without desk | 1.86 | -0.11 | -6 | 40770 | 24 |
| no sheen | 1.98 | -0.23 | -13 | 41374 | 28 |
| no environment light | 1.99 | -0.24 | -14 | 41374 | 28 |
| without logo-1 | 2.1 | -0.35 | -20 | 41024 | 27 |

### balls

Everything: 2.19 ms per frame (p90 9.61), 1 draw calls, 21600 triangles, 1.07 MP.

| Drawn | GPU p50 (ms) | Saved (ms) | Saved (%) | Triangles it holds | Draw calls |
|---|---|---|---|---|---|
| no clearcoat | 1.63 | 0.56 | 26 | 21600 | 1 |
| 0.75 of the resolution | 1.65 | 0.54 | 25 | 21600 | 1 |
| without DirectionalLight 1 | 1.72 | 0.47 | 21 | 21600 | 1 |
| no sheen | 2.06 | 0.13 | 6 | 21600 | 1 |
| no environment light | 2.28 | -0.09 | -4 | 21600 | 1 |
| without DirectionalLight 0 | 2.7 | -0.51 | -23 | 21600 | 1 |

### desk

Everything: 4.01 ms per frame (p90 5.27), 55 draw calls, 51471 triangles, 1.12 MP.

| Drawn | GPU p50 (ms) | Saved (ms) | Saved (%) | Triangles it holds | Draw calls |
|---|---|---|---|---|---|
| 0.75 of the resolution | 2.62 | 1.39 | 35 | 51471 | 55 |
| without Cosmic environment | 3.11 | 0.9 | 22 | 50311 | 53 |
| without Batch_static_Graphite_polymer | 3.29 | 0.72 | 18 | 48993 | 54 |
| without Batch_headphones_Graphite_polymer | 3.33 | 0.68 | 17 | 49735 | 54 |
| without MX_Master_sculpted_surface | 3.38 | 0.63 | 16 | 48496 | 54 |
| without Desk platform | 3.46 | 0.55 | 14 | 51183 | 53 |
| without Batch_static_Satin_black_metal | 3.47 | 0.54 | 13 | 47471 | 54 |
| without Batch_mouse_Anodised_aluminium | 3.48 | 0.53 | 13 | 49061 | 54 |
| without MX_Master_sculpted_surface_1 | 3.48 | 0.53 | 13 | 49427 | 54 |
| without Batch_static_Anodised_aluminium | 3.53 | 0.48 | 12 | 48610 | 54 |
| without Batch_static_Woven_black_textile | 3.55 | 0.46 | 11 | 49411 | 54 |
| without Batch_lamp_Rose_opal_diffuser | 3.56 | 0.45 | 11 | 49737 | 54 |
| no environment light | 3.56 | 0.45 | 11 | 51471 | 55 |
| without Batch_static_Keycap_graphite | 3.57 | 0.44 | 11 | 46019 | 54 |
| without Batch_headphones_Soft_touch_rubber | 3.58 | 0.43 | 11 | 47393 | 54 |
| without Batch_static_Soft_touch_rubber | 3.63 | 0.38 | 9 | 48601 | 54 |
| without SpotLight 3 | 3.65 | 0.36 | 9 | 51471 | 55 |
| without DirectionalLight 0 | 3.82 | 0.19 | 5 | 51471 | 55 |
| without DirectionalLight 2 | 3.83 | 0.18 | 4 | 51471 | 55 |
| no clearcoat | 3.9 | 0.11 | 3 | 51471 | 55 |
| without Batch_static_Key_legends | 3.95 | 0.06 | 1 | 48791 | 54 |
| without DirectionalLight 1 | 3.96 | 0.05 | 1 | 51471 | 55 |
| without Batch_headphones_Barracuda_honeycomb_knit | 3.97 | 0.04 | 1 | 49871 | 54 |
| no sheen | 4.31 | -0.3 | -7 | 51471 | 55 |
