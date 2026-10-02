// Pre-renders the share cards' images as PNG: next/og (Satori) cannot read
// WebP, and sharp is a development dependency only. Run after changing any
// source image: node scripts/og/build-thumbs.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const thumbs = [
  // The opening's head illustration, for the home card.
  [
    "public/images/avatar/onur-head-v4.webp",
    "assets/og/head.png",
    { width: 440 },
  ],
  // Kuyumcum's approved map screen.
  [
    "public/images/kuyumcum/map.webp",
    "assets/og/kuyumcum.png",
    { height: 470 },
  ],
  // HealthFactor-AI's trend figure.
  [
    "public/images/projects/water-safety/health-factor-trend.webp",
    "assets/og/water-safety.png",
    { width: 520 },
  ],
];

await mkdir("assets/og", { recursive: true });
for (const [source, target, resize] of thumbs) {
  const info = await sharp(source)
    .resize(resize)
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toFile(target);
  console.log(`${target} ${info.width}x${info.height} ${info.size} B`);
}
