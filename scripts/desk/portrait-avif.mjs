// Encodes the opening portrait as AVIF and checks it against the WebP it
// replaces: same 1254 px, PSNR of at least 42 dB over RGB and alpha, plus a
// side-by-side for a visual check. node scripts/desk/portrait-avif.mjs
import sharp from "sharp";
import { statSync } from "node:fs";
import { writeFile } from "node:fs/promises";

const source = "public/images/avatar/onur-head-v4.webp";
const target = "public/images/avatar/onur-head-v4.avif";
const report = "docs/qa/desk-story/portrait-avif";
const minimum = 42;

async function raw(file) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, info };
}

function psnr(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  const mse = sum / a.length;
  return mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse);
}

let quality = 70;
let result;
for (;;) {
  await sharp(source).avif({ quality, effort: 9 }).toFile(target);
  const [a, b] = await Promise.all([raw(source), raw(target)]);
  if (a.info.width !== b.info.width || a.info.height !== b.info.height)
    throw new Error("Size changed");
  result = { quality, psnr: psnr(a.data, b.data), width: a.info.width };
  if (result.psnr >= minimum || quality >= 90) break;
  quality += 5;
}
const [webp, avif] = await Promise.all([
  sharp(source).metadata(),
  sharp(target).metadata(),
]);
const summary = {
  source,
  target,
  width: result.width,
  height: avif.height,
  quality: result.quality,
  psnr: Number(result.psnr.toFixed(2)),
  minimumPsnr: minimum,
  webpBytes: statSync(source).size,
  avifBytes: statSync(target).size,
  format: { webp: webp.format, avif: avif.format },
};
await writeFile(
  `${report}/report.json`,
  JSON.stringify(summary, null, 2) + "\n",
);
// Side by side at half size on the page background: WebP left, AVIF right.
const half = Math.round(result.width / 2);
const [left, right] = await Promise.all(
  [source, target].map((file) => sharp(file).resize(half).png().toBuffer()),
);
await sharp({
  create: {
    width: half * 2 + 24,
    height: half,
    channels: 4,
    background: "#f5f6f8",
  },
})
  .composite([
    { input: left, left: 0, top: 0 },
    { input: right, left: half + 24, top: 0 },
  ])
  .webp({ quality: 88 })
  .toFile(`${report}/side-by-side.webp`);
console.log(summary);
if (summary.psnr < minimum) process.exit(1);
