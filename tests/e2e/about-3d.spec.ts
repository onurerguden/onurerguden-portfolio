import { test, expect } from "@playwright/test";
import { stageCanvas } from "./helpers";

test.describe("About objects", () => {
  test.skip(
    ({ browserName }) => browserName === "webkit",
    "Headless WebKit lacks WebGL2; the static shapes are covered by site tests.",
  );
  test.setTimeout(120000);

  test("mount only near the section, stay in budget and leave when far", async ({
    page,
  }) => {
    await page.goto("/en");
    const canvas = stageCanvas(page, "about");
    await expect(canvas).toHaveCount(0);
    await page.locator("#about").scrollIntoViewIfNeeded();
    await expect(canvas).toHaveCount(1, { timeout: 20000 });
    await expect(canvas).toHaveAttribute("aria-hidden", "true");
    await expect
      .poll(
        async () => Number(await canvas.getAttribute("data-stage-frames")),
        {
          timeout: 30000,
        },
      )
      .toBeGreaterThan(40);
    expect(
      Number(await canvas.getAttribute("data-stage-draw-calls")),
    ).toBeLessThanOrEqual(32);
    expect(
      Number(await canvas.getAttribute("data-stage-triangles")),
    ).toBeLessThanOrEqual(120000);
    await page.locator("#contact").scrollIntoViewIfNeeded();
    await expect(canvas).toHaveCount(0, { timeout: 10000 });
  });

  test("pausing motion freezes the scene on its last frame", async ({
    page,
  }) => {
    await page.goto("/en");
    await page.locator("#about").scrollIntoViewIfNeeded();
    const canvas = stageCanvas(page, "about");
    await expect
      .poll(
        async () => Number(await canvas.getAttribute("data-stage-frames")),
        {
          timeout: 30000,
        },
      )
      .toBeGreaterThan(10);
    await page
      .locator("#about")
      .getByRole("button", { name: "Pause motion" })
      .click();
    await expect(canvas).toHaveAttribute("data-stage-active", "false");
    const frames = await canvas.getAttribute("data-stage-frames");
    await page.waitForTimeout(800);
    expect(await canvas.getAttribute("data-stage-frames")).toBe(frames);
    await page
      .locator("#about")
      .getByRole("button", { name: "Pause motion" })
      .click();
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-stage-frames")))
      .toBeGreaterThan(Number(frames));
  });

  test("a lost context falls back to the static shapes for the visit", async ({
    page,
  }) => {
    await page.goto("/tr");
    await page.locator("#about").scrollIntoViewIfNeeded();
    const canvas = stageCanvas(page, "about");
    await expect(canvas).toHaveCount(1, { timeout: 20000 });
    await canvas.evaluate((node) =>
      node.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
    );
    await expect(canvas).toHaveCount(0);
    await expect(page.locator("#about [data-stage-state]")).toHaveAttribute(
      "data-stage-state",
      "failed",
    );
    await expect(page.getByRole("heading", { name: "Hakkımda" })).toBeVisible();
  });
});
