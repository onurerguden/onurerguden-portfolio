import { chromium } from "playwright";
const [, , url, out, w, h, mode] = process.argv;
const browser = await chromium.launch({
  args: ["--use-angle=metal", "--enable-gpu"],
});
const page = await browser.newPage({
  viewport: { width: +w, height: +h },
  deviceScaleFactor: 1,
  reducedMotion: mode === "reduce" ? "reduce" : "no-preference",
});
await page.addInitScript(() => {
  localStorage.setItem("portfolio:force-3d", "1");
});
await page.goto(url);
const hash = new URL(url).hash;
if (hash) {
  await page.waitForTimeout(1500);
  await page.evaluate(
    (id) =>
      document.getElementById(id)?.scrollIntoView({ behavior: "instant" }),
    hash.slice(1),
  );
}
await page.waitForTimeout(+(process.env.WAIT || 5000));
await page.screenshot({ path: out, fullPage: process.env.FULL === "1" });
await browser.close();
