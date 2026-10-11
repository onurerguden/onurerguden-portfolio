import revisions from "./static-assets.json";

// The portrait, the About posters and the display fonts are cached as
// immutable (next.config.ts), so their links carry the file's content
// revision: a new file is a new address. `npm run assets:revisions` records
// the revisions; tests/static-assets.test.ts checks them against the files.

export type StaticAsset = keyof typeof revisions;

export const staticAsset = (file: StaticAsset) =>
  `/${file}?v=${revisions[file]}`;

/** A srcset of one image's widths, each with its revision. */
export const staticSrcSet = (widths: [number, StaticAsset][]) =>
  widths.map(([width, file]) => `${staticAsset(file)} ${width}w`).join(", ");
