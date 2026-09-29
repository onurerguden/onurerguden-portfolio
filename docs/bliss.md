# Bliss layers

The tech stack section sits on **Bliss**, the Windows XP wallpaper: a photograph by Charles O'Rear (1996) whose rights Microsoft bought in 2000. The file used is Microsoft Design's official 4K render (3840×2400), mirrored on the Internet Archive; its SHA-256 is pinned in `scripts/bliss/build.mjs`.

## Decision

On 29 September 2026 Onur chose to show the original photograph rather than a redrawn scene, and accepts the republication risk: no public licence covers republishing it on a website. The section credits it in the taskbar ("Bliss © Microsoft · photo by Charles O'Rear"). The raw source is never committed; it is downloaded into the ignored `work/` directory. If the photo ever has to go, the pipeline is source-agnostic: change the `SOURCE` block and rebuild.

## Pipeline

`npm run bliss:build` (sharp, deterministic):

1. Verifies the source checksum and size.
2. Finds the hill **crest** per column (first rows where green clearly dominates), median-filtered, and a per-column **edge**: the first land pixel (grass, the trees on it, the dark distant hills) minus three pixels.
3. Finds the **furrow** in front of the hill as the smoothest path of strongest light-to-dark edge (dynamic programming across columns).
4. Cuts three layers from the photo's own pixels:
   - **sky**: everything above the edge; behind the hill it continues as a mirror of the sky just above the edge, and above the frame as a mirror of the top rows;
   - **hill**: opaque from the edge to the furrow, then a mirror of itself that shows only while the foreground slides down;
   - **foreground**: from the furrow down, mirrored below the frame.
5. Recomposes the layers at rest and **fails unless they reproduce the original exactly** (maximum channel difference 0).
6. Encodes every layer and the original at 750, 1280, 1920, 2880 and 3840 px as AVIF and WebP, without metadata, and writes `src/lib/bliss-geometry.json` (layer boxes, travel, the smoothed crest sampled 97 times as the ball floor, and a content revision).

Review aids: `docs/qa/bliss/boundaries.webp` (red crest floor, yellow furrow over the photo) and `docs/qa/bliss/parity.json` (checksum, parity and every file size).

## Runtime

The stage places the photo like `object-fit: cover` in container units, anchored at `focal`; `src/lib/bliss-geometry.ts` uses the same formula to map the crest into stage pixels. One CSS variable, `--s`, runs from −1 to 1 across the section: the sky moves by `6% × --s` of the photo height and the foreground by `−4% × --s`, while the hill stays put so the balls' floor never moves. Without JavaScript, or at the centre of the section, the layers are exactly the original. Reduced motion shows only the original photo; the hidden layers are never downloaded.
