// Captures the home page at fractions of a view past a section's top:
// node scripts/qa/scroll-shot.mjs <url> <id> <out-prefix> <w> <h> <fraction...>
import { chromium } from "playwright";
const [, , url, id, prefix, w, h, ...fractions] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
await page.addInitScript(() =>
  sessionStorage.setItem("portfolio:desk-static", "true"),
);
await page.goto(url);
await page.waitForTimeout(1500);
for (const fraction of fractions) {
  await page.evaluate(
    ([target, f]) => {
      const top =
        document.getElementById(target).getBoundingClientRect().top +
        scrollY +
        innerHeight * Number(f);
      scrollTo({ top, behavior: "instant" });
    },
    [id, fraction],
  );
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${prefix}-${fraction}.png` });
}
await browser.close();
