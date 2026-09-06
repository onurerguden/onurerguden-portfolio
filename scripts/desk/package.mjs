import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const ids = [
  "wide",
  "portrait",
  "ultrawide",
  "macbook",
  "mouse-detail",
  "headphones-detail",
  "riser-detail",
];
for (const id of ids) {
  await sharp(`docs/qa/desk/blender/${id}.png`)
    .webp({ quality: 85 })
    .toFile(`public/images/desk/${id}.webp`);
}
const files = [
  "assets/desk/onur-desk.blend",
  "public/models/desk/onur-desk.glb",
  ...ids.map((id) => `public/images/desk/${id}.webp`),
];
const artifacts = await Promise.all(
  files.map(async (path) => {
    const bytes = await readFile(path);
    return {
      path,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  }),
);
await writeFile(
  "assets/desk/artifacts.json",
  JSON.stringify(artifacts, null, 2) + "\n",
);
console.log(artifacts);
