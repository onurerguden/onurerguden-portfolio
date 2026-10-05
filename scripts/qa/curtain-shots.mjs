// Captures the paper curtain at points of its exit:
// node scripts/qa/curtain-shots.mjs <base-url> <out-prefix> [locale]
import { chromium } from "playwright";
const [, , base, prefix, locale = "en"] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${base}/${locale}`);
await page.waitForSelector('[data-ready="true"]', { timeout: 60000 });
const story = JSON.parse(
  await page.locator("[data-story]").getAttribute("data-story"),
);
const [start, end] = story.exit;
const points = {
  hold: story.room + 0.2,
  "exit-30": start + (end - start) * 0.3,
  "exit-60": start + (end - start) * 0.6,
  end,
};
for (const [name, d] of Object.entries(points)) {
  await page.evaluate((distance) => {
    const section = document.querySelector("[data-enhanced]");
    scrollTo({
      top:
        scrollY + section.getBoundingClientRect().top + distance * innerHeight,
      behavior: "instant",
    });
  }, d);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${prefix}-${name}.png` });
}
await browser.close();
