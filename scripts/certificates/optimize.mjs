// Prepares one certificate image for the site: strips metadata (EXIF, GPS,
// author), resizes to at most 1600 px wide and writes WebP. PDFs are
// rasterised with poppler's pdftoppm first. Review every image for ID
// numbers, birth dates and signatures before committing it.
//
//   node scripts/certificates/optimize.mjs <image-or-pdf> <id>
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const [source, id] = process.argv.slice(2);
if (!source || !id || !/^[a-z0-9-]+$/.test(id)) {
  console.error(
    "Usage: node scripts/certificates/optimize.mjs <image-or-pdf> <id>",
  );
  process.exit(1);
}
let input = source;
if (source.toLowerCase().endsWith(".pdf")) {
  const base = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "certificate-")),
    "page",
  );
  execFileSync("pdftoppm", [
    "-png",
    "-r",
    "200",
    "-singlefile",
    "-f",
    "1",
    source,
    base,
  ]);
  input = `${base}.png`;
}
const target = path.join(root, "public/images/certificates", `${id}.webp`);
fs.mkdirSync(path.dirname(target), { recursive: true });
const info = await sharp(input)
  .rotate()
  .resize({ width: 1600, withoutEnlargement: true })
  .webp({ quality: 84, effort: 6 })
  .toFile(target);
console.log(
  JSON.stringify(
    {
      id,
      image: {
        src: `/images/certificates/${id}.webp`,
        width: info.width,
        height: info.height,
      },
      bytes: info.size,
      next: "Check the image for personal data, then add it to src/content/certificates.json with personalDataReviewed: true.",
    },
    null,
    2,
  ),
);
