// After `next build`: every content file must be traced into the routes that
// read it at request time, or a serverless deployment would fail at runtime.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contentRoot = path.join(root, "src/content");
const routes = [
  "[locale]/page",
  "[locale]/projects/page",
  "[locale]/projects/[slug]/page",
];
const files = fs
  .readdirSync(contentRoot, { recursive: true })
  .map((file) => path.join(contentRoot, String(file)))
  .filter((file) => fs.statSync(file).isFile());
let failed = false;
for (const route of routes) {
  const trace = path.join(root, ".next/server/app", `${route}.js.nft.json`);
  if (!fs.existsSync(trace)) {
    console.error(`Missing trace for ${route}; run next build first.`);
    process.exit(1);
  }
  const traced = new Set(
    JSON.parse(fs.readFileSync(trace, "utf8")).files.map((file) =>
      path.resolve(path.dirname(trace), file),
    ),
  );
  const missing = files.filter((file) => !traced.has(file));
  for (const file of missing)
    console.error(`${route} does not trace ${path.relative(root, file)}`);
  failed ||= missing.length > 0;
}
if (failed) process.exit(1);
console.log(
  `${files.length} content files traced into ${routes.length} routes.`,
);
