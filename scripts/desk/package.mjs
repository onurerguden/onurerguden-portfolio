import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const ids = [
  "wide",
  "portrait",
  "ultrawide",
  "macbook",
  "mouse-detail",
  "keyboard-detail",
  "headphones-detail",
  "riser-detail",
  "front",
  "side",
  "lamps-detail",
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

// The room posters keep their own revisions (capture-cosmic-poster.mjs).
const assetsPath = "src/lib/desk-assets.json";
const assets = JSON.parse(await readFile(assetsPath, "utf8"));
assets.revision = createHash("sha256")
  .update(artifacts.map((a) => a.sha256).join(":"))
  .digest("hex")
  .slice(0, 16);
await writeFile(assetsPath, JSON.stringify(assets, null, 2) + "\n");
