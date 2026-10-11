import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import revisions from "../src/lib/static-assets.json";
import { staticAsset, staticSrcSet } from "../src/lib/static-asset-urls";

// These files are cached as immutable, so a stale revision would keep an old
// file in browsers for a year. Run `npm run assets:revisions` to fix.
const folders = ["images/avatar", "images/about", "fonts"];
const revision = (file: string) =>
  createHash("sha256")
    .update(readFileSync(`public/${file}`))
    .digest("hex")
    .slice(0, 12);

describe("immutable static assets", () => {
  it("lists every file with its content's revision", () => {
    const files = folders.flatMap((folder) =>
      readdirSync(`public/${folder}`).map((name) => `${folder}/${name}`),
    );
    expect(Object.keys(revisions).sort()).toEqual(files.sort());
    for (const [file, value] of Object.entries(revisions))
      expect(value, file).toBe(revision(file));
  });
  it("versions the display fonts in the stylesheet", () => {
    const css = readFileSync("src/styles/site.css", "utf8");
    const urls = [
      ...css.matchAll(/url\("\/(fonts\/[^"?]+)\?v=([0-9a-f]+)"\)/g),
    ];
    expect(urls.map(([, file]) => file).sort()).toEqual(
      Object.keys(revisions)
        .filter((file) => file.startsWith("fonts/"))
        .sort(),
    );
    for (const [, file, value] of urls)
      expect(value, file).toBe(revision(file));
  });
  it("builds versioned addresses and srcsets", () => {
    const file = "images/avatar/onur-head-v4-1080.avif";
    expect(staticAsset(file)).toBe(`/${file}?v=${revision(file)}`);
    expect(staticSrcSet([[1080, file]])).toBe(`${staticAsset(file)} 1080w`);
  });
});
