import { CanvasTexture, SRGBColorSpace } from "three";
import techIcons from "@/lib/tech-icons.generated.json";
import type { ProofLink } from "@/lib/home-content";
import { logoColor } from "./logo-color";

const icons = techIcons.icons as Record<string, { path: string; hex: string }>;

export type BallItem = {
  id: string;
  name: string;
  icon: { simpleIcons: string } | { monogram: string };
  ball: "white" | "yellow";
  priority: 1 | 2 | 3;
  /** For the balloon: the category label and where the tool was used. */
  category: string;
  evidence: ProofLink[];
};

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
