// Captures one element: node scripts/qa/element.mjs <url> <selector> <out> <width> <height> [reduce]
import { chromium } from "playwright";
const [, , url, selector, out, w, h, mode] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: +w, height: +h },
  reducedMotion: mode === "reduce" ? "reduce" : "no-preference",
});
await page.goto(url);
const target = page.locator(selector).first();
await target.scrollIntoViewIfNeeded();
// Let lazy images arrive before the capture.
await page.waitForTimeout(2000);
await target.screenshot({ path: out });
await browser.close();
