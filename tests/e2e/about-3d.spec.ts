import { test, expect } from "@playwright/test";
import {
  forceSectionScenes,
  stageCanvas,
  ci,
  reach,
  touchStatic,
} from "./helpers";

test.describe("About objects", () => {
  test.skip(
    ({ browserName }) => browserName === "webkit",
    "Headless WebKit lacks WebGL2; the static shapes are covered by site tests.",
  );
  test.skip(({ isMobile }) => isMobile, touchStatic);
  test.setTimeout(120000);
  test.beforeEach(({ page }) => forceSectionScenes(page));

  test("mount only near the section, stay in budget and leave when far", async ({
    page,
  }) => {
    await page.goto("/en");
    const canvas = stageCanvas(page, "about");
    await expect(canvas).toHaveCount(0);
    await reach(page, "about");
    await expect(canvas).toHaveCount(1, { timeout: ci(20000) });
    await expect(canvas).toHaveAttribute("aria-hidden", "true");
    await expect
      .poll(
        async () => Number(await canvas.getAttribute("data-stage-frames")),
        {
          timeout: ci(30000),
        },
      )
      .toBeGreaterThan(40);
    expect(
      Number(await canvas.getAttribute("data-stage-draw-calls")),
    ).toBeLessThanOrEqual(32);
    expect(
      Number(await canvas.getAttribute("data-stage-triangles")),
    ).toBeLessThanOrEqual(120000);
    await reach(page, "contact");
    await expect(canvas).toHaveCount(0, { timeout: ci(10000) });
  });

  test("the poster stands in until the first frame and the copy never moves", async ({
    page,
  }) => {
    await page.goto("/en");
    const copy = page.locator("[data-about-copy]");
    const poster = page.locator("#about picture img");
    await reach(page, "about");
    await expect(poster).toBeVisible();
    const before = await copy.boundingBox();
    const stage = page.locator("[data-about-stage]");
    await expect(stage).toHaveAttribute("data-stage-state", "live", {
      timeout: ci(30000),
    });
    // The canvas fades in over the poster, which fades out.
    await expect
      .poll(() =>
        stageCanvas(page, "about").evaluate(
          (node) => getComputedStyle(node).opacity,
        ),
      )
      .toBe("1");
    await expect
      .poll(() =>
        page
          .locator("#about picture")
          .evaluate((node) => getComputedStyle(node).opacity),
      )
      .toBe("0");
    expect(await copy.boundingBox()).toEqual(before);
    // The pause button was there, invisible, all along.
    await expect(
      page.locator("#about").getByRole("button", { name: "Pause motion" }),
    ).toBeVisible();
  });

  test("pausing motion freezes the scene on its last frame", async ({
    page,
  }) => {
    await page.goto("/en");
    await reach(page, "about");
    const canvas = stageCanvas(page, "about");
    await expect
      .poll(
        async () => Number(await canvas.getAttribute("data-stage-frames")),
        {
          timeout: ci(30000),
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
      .getByRole("button", { name: "Resume motion" })
      .click();
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-stage-frames")))
      .toBeGreaterThan(Number(frames));
  });

  test("a lost context falls back to the static shapes for the visit", async ({
    page,
  }) => {
    await page.goto("/tr");
    await reach(page, "about");
    const canvas = stageCanvas(page, "about");
    await expect(canvas).toHaveCount(1, { timeout: ci(20000) });
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
