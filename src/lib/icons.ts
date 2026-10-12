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

/**
 * Search gets a stable raster URL larger than 48 px. Browsers keep the SVG
 * and versioned ICO; the ICO declares every embedded size, not just 32 px.
 */
export const pageIcons = () => ({
  icon: [
    {
      url: iconUrl("favicon.ico"),
      type: "image/x-icon",
      sizes: "16x16 32x32 48x48 96x96",
    },
    { url: "/favicon-96.png", type: "image/png", sizes: "96x96" },
    { url: iconUrl("icon.svg"), type: "image/svg+xml", sizes: "any" },
  ],
  apple: iconUrl("apple-touch-icon.png"),
});
