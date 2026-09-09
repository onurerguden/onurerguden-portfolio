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
await sharp("docs/qa/desk/browser-loading.png")
  .webp({ quality: 92 })
  .toFile("public/images/desk/wide-loading.webp");

const files = [
  "public/images/desk/wide-loading.webp",
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

await writeFile(
  "src/lib/desk-assets.json",
  JSON.stringify(
    {
      revision: createHash("sha256")
        .update(artifacts.map((a) => a.sha256).join(":"))
        .digest("hex")
        .slice(0, 16),
    },
    null,
    2,
  ) + "\n",
);
