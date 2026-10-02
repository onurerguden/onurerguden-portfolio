import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import nextConfig from "../next.config";
import { locales } from "../src/lib/content";
import { deskImage, roomPoster } from "../src/lib/desk-asset-urls";

const contentHash = (path: string) =>
  createHash("sha256").update(readFileSync(path)).digest("hex").slice(0, 16);

describe("desk asset URLs", () => {
  it("leave the optimizer to local images without a query", () => {
    // A versioned src through the optimizer would need its revision in this
    // list, which `next dev` reads once and then holds stale.
    expect(nextConfig.images?.localPatterns).toEqual([
      { pathname: "/**", search: "" },
    ]);
  });
  it("serve the versioned desk images unoptimized", () => {
    expect(deskImage("portrait").unoptimized).toBe(true);
    for (const locale of locales) {
      expect(roomPoster(locale).unoptimized).toBe(true);
    }
  });
  it("version each poster by its own content", () => {
    for (const locale of locales) {
      const file = `room-poster-${locale}.webp`;
      expect(roomPoster(locale).src).toBe(
        `/images/desk/${file}?v=${contentHash(`public/images/desk/${file}`)}`,
      );
    }
  });
});
