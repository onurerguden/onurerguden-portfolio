import { chromium } from "playwright";

const base = process.env.DESK_REVIEW_URL || "http://localhost:3100";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  await page.goto(`${base}/tr/lab/desk`);
  await page.getByRole("button", { name: "3D olarak incele" }).click();
  await page.waitForFunction(
    () => document.querySelector("canvas")?.dataset.lights === "1.000",
  );
  const stage = page.locator("[data-desk-stage]");
  await stage.screenshot({ path: "docs/qa/desk/interactions-on.png" });
  await page.getByText("Masa objeleri", { exact: true }).click();
  await page.locator('[data-desk-action="dial"]').click();
  await page.waitForFunction(
    () => document.querySelector("canvas")?.dataset.lights === "0.000",
  );
  await stage.screenshot({ path: "docs/qa/desk/interactions-off.png" });
  await page.locator('[data-desk-action="lamp"]').click();
  await page.waitForFunction(
    () => document.querySelector("canvas")?.dataset.lampColor === "514366",
  );
  await page.getByText("Masa objeleri", { exact: true }).click();
  await stage.screenshot({ path: "docs/qa/desk/interactions-purple.png" });
  await page.close();

  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  await mobile.goto(`${base}/tr/lab/desk/journey`);
  await mobile.waitForFunction(
    () => document.querySelector("canvas")?.dataset.lights === "1.000",
  );
  await mobile.locator("canvas").scrollIntoViewIfNeeded();
  await mobile.getByText("Masa objeleri", { exact: true }).tap();
  await mobile.locator('[data-desk-action="lamp"]').tap();
  await mobile.waitForFunction(
    () => document.querySelector("canvas")?.dataset.lampColor === "514366",
  );
  await mobile.screenshot({ path: "docs/qa/desk/interactions-mobile.png" });
} finally {
  await browser.close();
}
