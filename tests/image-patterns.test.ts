import { describe, it, expect } from "vitest";
import { hasLocalMatch } from "next/dist/shared/lib/match-local-pattern";
import nextConfig from "../next.config";
import { deskImageSrc, roomPosterSrc } from "../src/lib/desk-asset-urls";

// next/image rejects a local src outside images.localPatterns: a runtime
// error in development and a 400 from the optimizer in production.
const allowed = (src: string) =>
  hasLocalMatch(nextConfig.images?.localPatterns, src);

describe("next/image local patterns", () => {
  it("allow the room posters in both languages", () => {
    expect(allowed(roomPosterSrc("en"))).toBe(true);
    expect(allowed(roomPosterSrc("tr"))).toBe(true);
  });
  it("allow the versioned desk views and details", () => {
    for (const name of ["portrait", "mouse-detail", "riser-detail"]) {
      expect(allowed(deskImageSrc(name))).toBe(true);
    }
  });
  it("allow plain local images", () => {
    expect(allowed("/images/projects/kuyumcum-home.webp")).toBe(true);
  });
  it("reject any other query", () => {
    expect(allowed("/images/desk/room-poster-en.webp?v=stale")).toBe(false);
    expect(allowed("/images/desk/portrait.webp?w=9999")).toBe(false);
    expect(allowed("/images/projects/kuyumcum-home.webp?v=1")).toBe(false);
  });
});
