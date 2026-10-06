// Lists files under public/ that no source file, script or content refers
// to, so stale images do not linger. node scripts/check-assets.mjs
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? walk(join(dir, entry.name))
        : [join(dir, entry.name)],
    ),
  );
  return files.flat();
}

const sources = (
  await Promise.all(["src", "scripts"].map((dir) => walk(dir)))
).flat();
const text = (
  await Promise.all(sources.map((file) => readFile(file, "utf8")))
).join("\n");
// Generated sets are referenced by pattern, not by full name; so is the
// IndexNow key (scripts/indexnow.mjs).
const patterns = [
  /^images\/bliss\//,
  /^decoders\//,
  /^fonts\//,
  /^licenses\//,
  /^[0-9a-f]{32}\.txt$/,
];
const unused = (await walk("public"))
  .map((file) => relative("public", file))
  .filter((path) => !patterns.some((pattern) => pattern.test(path)))
  .filter((path) => {
    const name = path.split("/").pop();
    const stem = name.replace(/\.[^.]+$/, "");
    // A file named by id in code (`${id}.webp`), or per locale
    // (`room-poster-${locale}.webp`), counts as referenced.
    const quoted = (word) => new RegExp(`["'\`]${word}["'\`]`).test(text);
    return (
      !text.includes(path) &&
      !text.includes(name) &&
      !quoted(stem) &&
      !(/-(en|tr)$/.test(stem) && text.includes(`${stem.slice(0, -3)}-\${`))
    );
  });
console.log(
  unused.length ? unused.join("\n") : "Every public file is referenced.",
);
process.exitCode = unused.length ? 1 : 0;
