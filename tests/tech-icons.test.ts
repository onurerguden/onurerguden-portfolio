import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { readTechStack } from "../src/lib/home-content";
import techIcons from "../src/lib/tech-icons.generated.json";

describe("technology icons", () => {
  const items = readTechStack().items;
  it("generates exactly the icons the technology list uses", () => {
    const wanted = items
      .flatMap((item) =>
        "simpleIcons" in item.icon ? [item.icon.simpleIcons] : [],
      )
      .sort();
    expect(Object.keys(techIcons.icons).sort()).toEqual(wanted);
  });
  it("stores a colour and path for every generated icon", () => {
    for (const icon of Object.values(techIcons.icons)) {
      expect(icon.hex).toMatch(/^#[0-9A-F]{6}$/);
      // Kotlin's mark is a single 20-character path.
      expect(icon.path.length).toBeGreaterThanOrEqual(16);
    }
  });
  it("draws the Explorer's sprite from exactly the same paths", () => {
    const sprite = readFileSync("public/images/tech/icons.svg", "utf8");
    const symbols = [
      ...sprite.matchAll(
        /<symbol id="([^"]+)" viewBox="0 0 24 24"><path d="([^"]+)"\/><\/symbol>/g,
      ),
    ].map(([, slug, path]) => [slug, path]);
    expect(symbols).toEqual(
      Object.entries(techIcons.icons).map(([slug, icon]) => [slug, icon.path]),
    );
  });
  it("uses short lettering where no official icon exists", () => {
    const monograms = items.flatMap((item) =>
      "monogram" in item.icon ? [item.name] : [],
    );
    expect(monograms).toEqual(
      expect.arrayContaining(["Java", "XGBoost", "FAISS"]),
    );
  });
  it("keeps enough first-priority balls for narrow screens", () => {
    expect(
      items.filter((item) => item.priority === 1).length,
    ).toBeGreaterThanOrEqual(12);
    expect(
      items.filter((item) => item.priority <= 2).length,
    ).toBeLessThanOrEqual(30);
  });
});
