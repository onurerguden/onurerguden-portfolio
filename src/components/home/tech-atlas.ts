import { CanvasTexture, SRGBColorSpace } from "three";
import techIcons from "@/lib/tech-icons.generated.json";

export type BallItem = {
  id: string;
  name: string;
  icon: { simpleIcons: string } | { monogram: string };
  ball: "white" | "yellow";
  priority: 1 | 2 | 3;
};

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
export function logoColor(item: BallItem) {
  if (item.ball === "yellow" || !("simpleIcons" in item.icon)) return INK;
  const hex = icons[item.icon.simpleIcons]?.hex ?? INK;
  return luminance(hex) > 0.55 ? INK : hex;
}

/**
 * Draws every logo (or lettering for technologies without an official icon)
 * into one square texture, one cell per ball. Built at runtime from vector
 * paths, so it costs no download and stays sharp at any pixel ratio.
 */
export function buildAtlas(items: BallItem[], cell = 256) {
  const grid = Math.ceil(Math.sqrt(items.length));
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = grid * cell;
  const context = canvas.getContext("2d")!;
  items.forEach((item, index) => {
    const x = (index % grid) * cell;
    const y = Math.floor(index / grid) * cell;
    context.save();
    context.translate(x, y);
    context.fillStyle = logoColor(item);
    if ("simpleIcons" in item.icon && icons[item.icon.simpleIcons]) {
      const size = cell * 0.64;
      context.translate((cell - size) / 2, (cell - size) / 2);
      context.scale(size / 24, size / 24);
      context.fill(new Path2D(icons[item.icon.simpleIcons].path));
    } else {
      const text = "monogram" in item.icon ? item.icon.monogram : item.name;
      let font = cell * 0.34;
      context.font = `800 ${font}px "Manrope Variable", system-ui, sans-serif`;
      const width = context.measureText(text).width;
      if (width > cell * 0.78) {
        font *= (cell * 0.78) / width;
        context.font = `800 ${font}px "Manrope Variable", system-ui, sans-serif`;
      }
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, cell / 2, cell / 2 + font * 0.04);
    }
    context.restore();
  });
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.flipY = false;
  texture.anisotropy = 4;
  return { texture, grid };
}
