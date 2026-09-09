import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// Run against the local production build after model/lighting changes.
// Capture the WebGL canvas only: no page chrome or screen text is baked in.
const base = process.env.DESK_REVIEW_URL || "http://localhost:3100";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 960 },
    deviceScaleFactor: 1,
  });
  await page.goto(`${base}/en/lab/desk/journey`);
  await page.waitForSelector('[data-ready="true"]');
  await page.evaluate(() => {
    const section = document.querySelector("[data-enhanced]");
    scrollTo({
      top: scrollY + section.getBoundingClientRect().top,
      behavior: "instant",
    });
  });
  await page.waitForFunction(
    () => document.querySelector("canvas")?.dataset.distance === "0",
  );
  await page
    .locator("canvas")
    .screenshot({
      path: "docs/qa/desk/browser-loading.png",
      style:
        "[data-journey-stage] * { visibility: hidden !important; } [data-journey-stage] canvas { visibility: visible !important; }",
    });
  const bytes = await readFile("public/models/desk/onur-desk.glb");
  await writeFile(
    "docs/qa/desk/loading-poster.json",
    JSON.stringify(
      {
        source:
          "Production WebGL canvas, journey opening camera, no HTML layers",
        width: 1280,
        height: 960,
        deviceScaleFactor: 1,
        modelSha256: createHash("sha256").update(bytes).digest("hex"),
        camera: await page.locator("canvas").getAttribute("data-camera"),
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
