// Captures the desk's final view, per language, as the poster shown while a
// released desk scene remounts. It photographs the real final frame on
// /{locale}/lab/desk/room: the ultrawide identity, the end of Experience on
// the monitor and the open Explorer on the MacBook. Run against a production
// server: DESK_REVIEW_URL=http://localhost:3200 node scripts/desk/capture-cosmic-poster.mjs
import { chromium } from "playwright";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const base = process.env.DESK_REVIEW_URL || "http://localhost:3100";
const browser = await chromium.launch();
const posters = [];

try {
  for (const locale of ["en", "tr"]) {
    const reviewPath = `docs/qa/desk-story/final-view-${locale}.png`;
    const posterPath = `public/images/desk/room-poster-${locale}.webp`;
    const page = await browser.newPage({
      viewport: { width: 1440, height: 830 },
      deviceScaleFactor: 1,
    });
    await page.goto(`${base}/${locale}/lab/desk/room`);
    const canvas = page.locator("canvas:not([data-stage-canvas])");
    await page.waitForFunction(() => {
      const node = document.querySelector("canvas:not([data-stage-canvas])");
      return (
        node?.getAttribute("data-cosmic-reveal") === "1.000" &&
        Number(node.getAttribute("data-draw-calls")) > 0
      );
    });
    // The Explorer has risen and its list is read to the end.
    await page.waitForFunction(() =>
      document
        .querySelector("[data-xp]")
        ?.getAttribute("style")
        ?.includes("--rise: 1"),
    );
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
    await page.screenshot({ path: reviewPath });
    await sharp(reviewPath).webp({ quality: 88 }).toFile(posterPath);
    const metrics = await canvas.evaluate((node) => ({
      drawCalls: Number(node.dataset.drawCalls),
      triangles: Number(node.dataset.triangles),
      peakDrawCalls: Number(node.dataset.peakDrawCalls),
    }));
    posters.push({ locale, reviewPath, posterPath, ...metrics });
    await page.close();
  }
} finally {
  await browser.close();
}

const hash = createHash("sha256");
for (const { posterPath } of posters) hash.update(await readFile(posterPath));
const assetsPath = "src/lib/desk-assets.json";
const assets = JSON.parse(await readFile(assetsPath, "utf8"));
assets.posterRevision = hash.digest("hex").slice(0, 16);
await writeFile(assetsPath, JSON.stringify(assets, null, 2) + "\n");
console.log(JSON.stringify(posters, null, 2));
