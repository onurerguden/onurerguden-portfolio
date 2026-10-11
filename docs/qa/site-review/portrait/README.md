# Opening portrait per screen (review 02)

Before (left, `main` at 61eeccc) and after (right, `review/02-portrait-lcp`), the same production build settings, captured with Playwright's Chromium.

| Capture | Viewport | File the browser picked (before → after) | PSNR of the whole screen |
|---|---|---|---|
| `en-1440.webp`, `tr-1440.webp` | 1440 × 900, 1x | 1254 AVIF → 1080 AVIF | 47.23 dB |
| `en-375.webp`, `tr-375.webp` | 375 × 812, 3x | 1254 AVIF → 1254 AVIF (re-encoded) | 47.87 dB |
| `closeup-1440.webp` | the face at 1440 × 900, 2x zoom | as above | — |

412 × 915 at 2.625x (a Pixel-class phone) picks the 1254 file and measures 47.76 dB; Lighthouse's emulated Moto G Power (412 × 823, 2.625x) picks the 1080 file.

A 640 px file for 1x desktops was tried first: the whole screen measured 42.21 dB and the close-up looked visibly softer in the hair and eyelashes than the browser's own reduction of the larger file, so it was dropped.
