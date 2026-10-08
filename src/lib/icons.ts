import "server-only";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * An icon's address with its content's revision. Browsers keep favicons in
 * their own cache, long after a page changes, and home screens keep the
 * manifest's icons; a new revision is a new address, so a new icon reaches
 * them on the next visit, and the old address can be cached for good
 * (next.config.ts). Pages are built ahead, so this reads the file once per
 * build.
 */
export function iconUrl(file: string) {
  const bytes = readFileSync(path.join(process.cwd(), "public", file));
  const revision = createHash("sha256")
    .update(bytes)
    .digest("hex")
    .slice(0, 12);
  return `/${file}?v=${revision}`;
}

/** Icons for every page's head: the SVG, the ICO for the rest, iOS's PNG. */
export const pageIcons = () => ({
  icon: [
    { url: iconUrl("favicon.ico"), sizes: "32x32" },
    { url: iconUrl("icon.svg"), type: "image/svg+xml" },
  ],
  apple: iconUrl("apple-touch-icon.png"),
});
