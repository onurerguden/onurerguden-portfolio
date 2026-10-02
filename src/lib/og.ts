import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Shared pieces of the share cards (next/og). */
export const ogSize = { width: 1200, height: 630 };
export const ogColors = {
  bg: "#080e1c",
  surface: "#152039",
  text: "#f5f6f8",
  muted: "#b7c2d4",
  accent: "#d8f23c",
  ink: "#080e1c",
};
export const ogBackground =
  "radial-gradient(circle at 70% 30%, #152039 0%, #080e1c 70%)";

const fontFiles = Promise.all(
  ["latin", "latin-ext"].map((part) =>
    readFile(join(process.cwd(), `assets/fonts/og-display-${part}.ttf`)),
  ),
);

/** The display face, with the Turkish capitals as a family of their own. */
export async function ogFonts() {
  const [latin, latinExt] = await fontFiles;
  return [
    {
      name: "Portfolio Display",
      data: latin,
      weight: 900 as const,
      style: "normal" as const,
    },
    // Satori keeps one file per family, weight and style, so the Turkish
    // capitals need a family of their own to be found.
    {
      name: "Portfolio Display Ext",
      data: latinExt,
      weight: 900 as const,
      style: "normal" as const,
    },
  ];
}
export const ogFontFamily = '"Portfolio Display", "Portfolio Display Ext"';

/** A pre-rendered PNG from assets/og (see scripts/og/build-thumbs.mjs). */
export async function ogPicture(name: string) {
  const data = await readFile(join(process.cwd(), `assets/og/${name}.png`));
  return `data:image/png;base64,${data.toString("base64")}`;
}

export const upper = (text: string, tr: boolean) =>
  text.toLocaleUpperCase(tr ? "tr-TR" : "en-US");
