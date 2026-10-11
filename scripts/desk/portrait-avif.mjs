// Encodes the opening portrait at the widths its devices draw it at, as AVIF
// and a lossy WebP fallback, from the lossless master in assets/. Every file
// must keep a PSNR of at least 42 dB, the gate the approved AVIF passed, against the master resized to the same
// width, both as seen: over the opening's #f5f6f8. Lossy WebP drops the colour
// of fully transparent pixels, which nobody sees but an RGBA comparison
// counts. node scripts/desk/portrait-avif.mjs
//
// Widths: the portrait is 28% (desktop) or 19% (≤ 1250 px) of a screen that
// is max(108.696vw, 253.748vh) wide (portrait.module.css), so about 640 CSS
// px on a 1440 × 900 desktop and 390–400 on phones. 1080 serves 1x desktops
// and 2–2.6x phones, 1254 (the master's width) 3x phones and 2x desktops.
// No smaller file: resized ahead, a 640 px portrait looks softer on a 1x
// desktop than the browser's own reduction of a larger one, which is what
// visitors saw before.
import sharp from "sharp";
import { statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";

const source = "assets/avatar/onur-head-v4.webp";
const out = "public/images/avatar";
const report = "docs/qa/desk-story/portrait-avif";
const widths = [1080, 1254];
const minimum = 42;

async function raw(input, width) {
  const { data, info } = await sharp(input)
    .resize(width)
    .flatten({ background: "#f5f6f8" })
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

// The lowest quality that clears the gate, so each file is as small as the
// gate allows. Candidates are measured in memory: sharp caches files by path,
// so re-reading a file it just wrote would measure the first attempt again.
async function encode(width, format, start) {
  const reference = await raw(source, width);
  for (let quality = start; ; quality += 2) {
    const pipeline = sharp(source).resize(width);
    const bytes = await (
      format === "avif"
        ? pipeline.avif({ quality, effort: 9 })
        : pipeline.webp({ quality, alphaQuality: 100, effort: 6 })
    ).toBuffer();
    const value = psnr(reference.data, (await raw(bytes, width)).data);
    if (value >= minimum || quality >= 96) {
      const file = `${out}/onur-head-v4-${width}.${format}`;
      await writeFile(file, bytes);
      return {
        file,
        width,
        quality,
        psnr: Number(value.toFixed(2)),
        bytes: bytes.length,
      };
    }
  }
}

await mkdir(out, { recursive: true });
const files = [];
for (const width of widths) {
  files.push(await encode(width, "avif", 60));
  files.push(await encode(width, "webp", 80));
}
const summary = {
  source,
  sourceBytes: statSync(source).size,
  minimumPsnr: minimum,
  files,
};
await writeFile(
  `${report}/report.json`,
  JSON.stringify(summary, null, 2) + "\n",
);
console.log(summary);
if (files.some((file) => file.psnr < minimum)) process.exit(1);
