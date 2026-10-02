import techIcons from "@/lib/tech-icons.generated.json";

const icons = techIcons.icons as Record<string, { path: string; hex: string }>;
const INK = "#17212b";

/** Relative luminance of a #rrggbb colour. */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Brand colour on white balls unless it would vanish; ink on volt balls. */
export function logoColor(item: {
  ball: "white" | "yellow";
  icon: { simpleIcons: string } | { monogram: string };
}) {
  if (item.ball === "yellow" || !("simpleIcons" in item.icon)) return INK;
  const hex = icons[item.icon.simpleIcons]?.hex ?? INK;
  return luminance(hex) > 0.55 ? INK : hex;
}
