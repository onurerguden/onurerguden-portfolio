// Writes the SVG paths for the technologies in src/content/tech-stack.json.
// simple-icons is CC0; each brand's own guidelines still apply, so they are
// recorded next to the path. Run after editing the technology list:
//   node scripts/tech/build-icons.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as simpleIcons from "simple-icons";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const stack = JSON.parse(
  fs.readFileSync(path.join(root, "src/content/tech-stack.json"), "utf8"),
);
const bySlug = new Map(
  Object.values(simpleIcons).map((icon) => [icon.slug, icon]),
);
const { version } = JSON.parse(
  fs.readFileSync(
    path.join(root, "node_modules/simple-icons/package.json"),
    "utf8",
  ),
);

const icons = {};
for (const item of stack.items) {
  const slug = item.icon.simpleIcons;
  if (!slug) continue;
  const icon = bySlug.get(slug);
  if (!icon) throw new Error(`simple-icons ${version} has no "${slug}" icon`);
  icons[slug] = {
    title: icon.title,
    hex: `#${icon.hex}`,
    path: icon.path,
    ...(icon.guidelines ? { guidelines: icon.guidelines } : {}),
  };
}
const sorted = Object.fromEntries(
  Object.entries(icons).sort(([a], [b]) => a.localeCompare(b)),
);
const target = path.join(root, "src/lib/tech-icons.generated.json");
fs.writeFileSync(
  target,
  `${JSON.stringify({ source: `simple-icons@${version}`, license: "CC0-1.0", icons: sorted }, null, 2)}\n`,
);
console.log(
  `${path.relative(root, target)}: ${Object.keys(sorted).length} icons`,
);
