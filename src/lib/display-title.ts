import metrics from "./display-metrics.json";

/** Letter-spacing of `.giant-title`, in em. Browsers add it after every glyph. */
export const displayTracking = -0.01;
const advances: Record<string, number> = metrics.advances;
// Glyphs outside the subset fall back to Manrope, which is narrower than this.
const fallbackAdvance = 0.9;

export type TitleSegment = { text: string; lang?: "en" };

/**
 * Splits `[Brand]` markers out of a title so brand names keep their English
 * capitals (Turkish uppercase would turn "GitHub" into "GİTHUB").
 */
export function titleSegments(text: string): TitleSegment[] {
  return text
    .split(/(\[[^\]]+\])/)
    .filter(Boolean)
    .map((part) =>
      part.startsWith("[") && part.endsWith("]")
        ? { text: part.slice(1, -1), lang: "en" as const }
        : { text: part },
    );
}

/** Rendered width of one uppercase line in em, from the subset's own metrics. */
export function displayLineWidth(line: string, locale: "en" | "tr") {
  let width = 0;
  for (const segment of titleSegments(line)) {
    const upper = segment.text.toLocaleUpperCase(
      segment.lang === "en" || locale === "en" ? "en-US" : "tr-TR",
    );
    for (const char of upper)
      width += (advances[char] ?? fallbackAdvance) + displayTracking;
  }
  return width;
}
