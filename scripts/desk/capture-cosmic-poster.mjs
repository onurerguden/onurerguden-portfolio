import { chromium } from "playwright";
import sharp from "sharp";

const base = process.env.DESK_REVIEW_URL || "http://localhost:3100";
const reviewPath = "docs/qa/room/cosmic-platform.png";
const posterPath = "public/images/desk/room-poster.webp";
const browser = await chromium.launch();

try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 830 },
    deviceScaleFactor: 1,
  });
  await page.goto(`${base}/en/lab/desk/room`);
  await page.waitForFunction(
    () =>
      document.querySelector("canvas")?.dataset.cosmicReveal === "1.000" &&
      Number(document.querySelector("canvas")?.dataset.drawCalls) > 0,
  );
  await page.waitForTimeout(500);
  await page.screenshot({ path: reviewPath });
  await sharp(reviewPath).webp({ quality: 88 }).toFile(posterPath);

  const metrics = await page.locator("canvas").evaluate((canvas) => ({
    drawCalls: Number(canvas.dataset.drawCalls),
    triangles: Number(canvas.dataset.triangles),
    peakDrawCalls: Number(canvas.dataset.peakDrawCalls),
  }));
  console.log(JSON.stringify({ reviewPath, posterPath, ...metrics }, null, 2));
} finally {
  await browser.close();
}
