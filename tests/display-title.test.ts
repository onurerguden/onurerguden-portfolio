import { describe, it, expect } from "vitest";
import {
  displayLineWidth,
  displayTracking,
  titleSegments,
} from "../src/lib/display-title";
import metrics from "../src/lib/display-metrics.json";

const advances: Record<string, number> = metrics.advances;

describe("giant title measurement", () => {
  it("covers every capital the Turkish titles need", () => {
    for (const char of "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ0123456789")
      expect(advances[char], char).toBeGreaterThan(0.2);
  });
  it("measures with Turkish capitals, so i becomes a wider İ", () => {
    const tr = displayLineWidth("hizmetler", "tr");
    const en = displayLineWidth("hizmetler", "en");
    expect(tr - en).toBeCloseTo(advances["İ"] - advances.I, 4);
  });
  it("keeps bracketed brand names in English capitals", () => {
    expect(titleSegments("[GitHub] aktivitesi")).toEqual([
      { text: "GitHub", lang: "en" },
      { text: " aktivitesi" },
    ]);
    expect(displayLineWidth("[GitHub]", "tr")).toBeCloseTo(
      displayLineWidth("GitHub", "en"),
      6,
    );
  });
  it("includes letter-spacing after every glyph", () => {
    expect(displayLineWidth("AB", "en")).toBeCloseTo(
      advances.A + advances.B + 2 * displayTracking,
      6,
    );
  });
});
