// Captures the About objects at rest as the section's poster: the image shown
// before the 3D scene's first frame, and instead of it under reduced motion,
// without JavaScript or WebGL, or after a failure. It photographs the real
// scene with every object at its rest pose (no sway, no scroll drift) on a
// transparent background, so the poster and the live scene line up.
// Run against a production server:
// ABOUT_URL=http://localhost:3400 node scripts/about/capture-poster.mjs
import { chromium } from "playwright";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const base = process.env.ABOUT_URL || "http://localhost:3100";
const layouts = [
  { name: "wide", viewport: { width: 1440, height: 900 }, scale: 1 },
  { name: "narrow", viewport: { width: 390, height: 844 }, scale: 2 },
];
// Hide everything but the canvas, so only the objects keep their pixels.
const isolate = `
  html, body, main, #about, #about::before { background: transparent !important; }
  #about > :not([data-about-stage]), nav, [data-journey-stage], #about ~ * { visibility: hidden !important; }
`;

await mkdir("public/images/about", { recursive: true });
const browser = await chromium.launch({
  args: ["--use-angle=metal", "--enable-gpu"],
});
try {
  for (const { name, viewport, scale } of layouts) {
    const page = await browser.newPage({
      viewport,
      deviceScaleFactor: scale,
    });
    await page.addInitScript(() => {
      localStorage.setItem("portfolio:force-3d", "1");
      localStorage.setItem("portfolio:about-poster", "1");
      sessionStorage.setItem("portfolio:desk-static", "true");
    });
    await page.goto(`${base}/en#about`);
    await page.locator("#about").scrollIntoViewIfNeeded();
    const canvas = page.locator('canvas[data-stage-canvas="about"]');
    await page.waitForFunction(
      () =>
        document
          .querySelector("[data-about-stage]")
          ?.getAttribute("data-stage-state") === "live",
      null,
      { timeout: 60000 },
    );
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    await page.addStyleTag({ content: isolate });
    const png = await canvas.screenshot({ omitBackground: true });
    // The first rows can catch the edge of the section above; drop them.
    const { width: fullWidth, height: fullHeight } =
      await sharp(png).metadata();
    const trim = 2 * scale;
    const image = sharp(png).extract({
      left: 0,
      top: trim,
      width: fullWidth,
      height: fullHeight - trim,
    });
    await image
      .clone()
      .avif({ quality: 55, effort: 6 })
      .toFile(`public/images/about/poster-${name}.avif`);
    await image
      .clone()
      .webp({ quality: 82, alphaQuality: 90, effort: 6 })
      .toFile(`public/images/about/poster-${name}.webp`);
    const { width, height } = await image.metadata();
    console.log(`${name}: ${width} × ${height}`);
    await page.close();
  }
} finally {
  await browser.close();
}
