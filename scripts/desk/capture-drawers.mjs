import { chromium } from "playwright";

const base = process.env.DESK_REVIEW_URL || "http://localhost:3101";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.clock.install();
  await page.goto(`${base}/tr/lab/desk`);
  await page.getByRole("button", { name: "3D olarak incele" }).click();
  const canvas = page.locator("canvas");
  await page.waitForFunction(
    () => document.querySelector("canvas")?.dataset.lights === "1.000",
  );
  await page.clock.pauseAt(
    await page.evaluate(() => new Date(Date.now() + 60000).toISOString()),
  );
  await page
    .locator("[data-desk-stage]")
    .screenshot({ path: "docs/qa/desk/drawers-rest.png" });
  await page.getByText("Masa objeleri", { exact: true }).click();
  await page.locator('[data-desk-action="drawers"]').click();
  await page.getByText("Masa objeleri", { exact: true }).click();
  await page.clock.runFor(500);
  await page
    .locator("[data-desk-stage]")
    .screenshot({ path: "docs/qa/desk/drawers-wave-top.png" });
  await page.clock.runFor(540);
  await page
    .locator("[data-desk-stage]")
    .screenshot({ path: "docs/qa/desk/drawers-wave-bottom.png" });
  await page.clock.runFor(600);
  console.log(
    "Restored drawer offsets:",
    await canvas.getAttribute("data-drawer-offsets"),
  );
  console.log(
    "Main pass calls / triangles:",
    await canvas.getAttribute("data-draw-calls"),
    await canvas.getAttribute("data-triangles"),
  );
  await page.close();
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await mobile.goto(`${base}/tr/lab/desk/journey`);
  await mobile.waitForFunction(
    () => document.querySelector("canvas")?.dataset.lights === "1.000",
  );
  await mobile.locator("canvas").scrollIntoViewIfNeeded();
  await mobile.getByText("Masa objeleri", { exact: true }).tap();
  await mobile.screenshot({ path: "docs/qa/desk/drawers-mobile.png" });
} finally {
  await browser.close();
}
