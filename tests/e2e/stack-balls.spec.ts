import { test, expect, type Page } from "@playwright/test";
import {
  forceSectionScenes,
  go,
  journeyCanvas,
  stageCanvas,
  story,
  within,
} from "./helpers";

async function ready(page: Page) {
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 20000 },
  );
}

/** Moves the pointer across the hill until a ball is under it. */
async function hoverABall(page: Page) {
  const panel = page.locator('[data-screen="2"]');
  const box = (await panel.boundingBox())!;
  const canvas = stageCanvas(page, "desk-stack");
  for (const fy of [0.42, 0.48, 0.54, 0.6, 0.36])
    for (let fx = 0.06; fx < 0.95; fx += 0.035) {
      await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy);
      if (Number(await canvas.getAttribute("data-selected")) >= 0) return true;
    }
  return false;
}

test.describe("the MacBook's balls", () => {
  test.skip(
    ({ browserName }) => browserName === "webkit",
    "Headless WebKit lacks WebGL2; the Explorer list covers the content.",
  );
  test.setTimeout(150000);
  test.beforeEach(({ page }) => forceSectionScenes(page));

  test("drop onto the hill, settle and stop rendering", async ({ page }) => {
    await page.goto("/en/lab/desk/journey");
    await ready(page);
    const s = await story(page);
    await go(page, s.chapters.stack + 0.2);
    const canvas = stageCanvas(page, "desk-stack");
    await expect(canvas).toHaveCount(1, { timeout: 20000 });
    await expect(canvas).toHaveAttribute("data-physics-settled", "true", {
      timeout: 60000,
    });
    const frames = await canvas.getAttribute("data-stage-frames");
    await page.waitForTimeout(800);
    expect(await canvas.getAttribute("data-stage-frames")).toBe(frames);
    expect(
      Number(await canvas.getAttribute("data-stage-draw-calls")),
    ).toBeLessThanOrEqual(8);
    expect(
      Number(await canvas.getAttribute("data-stage-triangles")),
    ).toBeLessThanOrEqual(80000);
    // Never more than the desk and the balls at once.
    expect(await page.locator("canvas").count()).toBeLessThanOrEqual(2);
  });

  test("the Explorer throws the balls out and they rain again on the way back", async ({
    page,
  }) => {
    await page.goto("/en/lab/desk/journey");
    await ready(page);
    const s = await story(page);
    await go(page, s.chapters.stack + 0.2);
    const canvas = stageCanvas(page, "desk-stack");
    await expect(canvas).toHaveAttribute(
      "data-physics-mode",
      /dropping|resting/,
      { timeout: 30000 },
    );
    await go(page, within(s.macbook, 0.1));
    // Once the list is open the balls are gone and the context released.
    await expect(canvas).toHaveCount(0, { timeout: 20000 });
    await go(page, s.chapters.stack + 0.2);
    await expect(stageCanvas(page, "desk-stack")).toHaveAttribute(
      "data-physics-mode",
      /dropping|resting/,
      { timeout: 30000 },
    );
  });

  test("hovering a settled ball names it in an XP balloon", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Phones select by tapping.");
    await page.goto("/en/lab/desk/journey");
    await ready(page);
    await go(page, (await story(page)).chapters.stack + 0.2);
    const canvas = stageCanvas(page, "desk-stack");
    await expect(canvas).toHaveAttribute("data-physics-settled", "true", {
      timeout: 60000,
    });
    expect(await hoverABall(page)).toBe(true);
    const balloon = page.locator("[data-balloon]");
    await expect(balloon).toBeVisible();
    await expect(balloon.locator("strong")).not.toBeEmpty();
    // The taskbar and its controls never select a ball.
    await page.getByRole("button", { name: "start" }).hover();
    await expect(balloon).toHaveCount(0);
  });

  test("on a phone the MacBook takes over the view", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "Only a phone-sized MacBook dives.");
    await page.goto("/en/lab/desk/journey");
    await ready(page);
    const s = await story(page);
    const panel = page.locator('[data-screen="2"]');
    await expect(panel).toHaveAttribute("data-dive", "true");
    await go(page, s.chapters.stack + 0.2);
    await expect(panel).toHaveAttribute("data-takeover", "true");
    // The desk stops drawing behind a screen that fills the view.
    await expect(journeyCanvas(page)).toHaveAttribute("data-active", "false");
    const box = (await panel.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.width).toBeCloseTo(viewport.width, 0);
    await page.getByRole("button", { name: "start" }).click();
    await expect(
      page.getByRole("menu", { name: "Jump to a section" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await go(page, s.chapters.stack - 0.6);
    await expect(panel).toHaveAttribute("data-takeover", "false");
    await expect(journeyCanvas(page)).toHaveAttribute("data-active", "true");
  });
});
