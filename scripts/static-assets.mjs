// Records a content revision for the hand-referenced public files that are
// cached as immutable (next.config.ts): the opening portrait, the About
// posters, the technology icon sprite and the display fonts. Writes src/lib/static-assets.json and the
// font URLs in src/styles/site.css. The headphones' music gets a manifest of
// its own (src/lib/audio-assets.json), which only the desk's lazily loaded
// scene imports, so its revisions stay out of the first load. Run after
// changing any of these files: node scripts/static-assets.mjs
// (tests/static-assets.test.ts fails until then).
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";

const folders = ["images/avatar", "images/about", "images/tech", "fonts"];
const manifest = "src/lib/static-assets.json";
const stylesheet = "src/styles/site.css";

const revision = (bytes) =>
  createHash("sha256").update(bytes).digest("hex").slice(0, 12);

const revisions = {};
for (const folder of folders)
  for (const name of (await readdir(`public/${folder}`)).sort())
    revisions[`${folder}/${name}`] = revision(
      await readFile(`public/${folder}/${name}`),
    );
await writeFile(manifest, JSON.stringify(revisions, null, 2) + "\n");

const audio = {};
for (const name of (await readdir("public/audio")).sort())
  audio[`audio/${name}`] = revision(await readFile(`public/audio/${name}`));
await writeFile(
  "src/lib/audio-assets.json",
  JSON.stringify(audio, null, 2) + "\n",
);

// CSS cannot import the manifest, so its font URLs carry the revision inline.
const css = (await readFile(stylesheet, "utf8")).replace(
  /url\("\/(fonts\/[^"?]+)(?:\?v=[0-9a-f]+)?"\)/g,
  (_, file) => `url("/${file}?v=${revisions[file]}")`,
);
await writeFile(stylesheet, css);
console.log(
  `${Object.keys(revisions).length + Object.keys(audio).length} files versioned.`,
);
