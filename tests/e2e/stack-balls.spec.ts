import { test, expect, type Page } from "@playwright/test";
import { forceSectionScenes, stageCanvas } from "./helpers";

async function hydrated(page: Page) {
  await page.waitForFunction(
    () => document.documentElement.dataset.motionPaused !== undefined,
  );
}
/** Scrolls to a point of the Bliss track: 0 is its top, 1 its bottom. */
async function trackAt(page: Page, fraction: number) {
  await page.evaluate((f) => {
    const track = document.querySelector("[data-stack-track]") as HTMLElement;
    const top = track.getBoundingClientRect().top + scrollY;
    scrollTo({
      top: top + (track.offsetHeight - innerHeight) * f,
      behavior: "instant",
    });
  }, fraction);
}

test.describe("tech-stack balls", () => {
  test.skip(
    ({ browserName }) => browserName === "webkit",
    "Headless WebKit lacks WebGL2; the text list covers the content.",
  );
  test.setTimeout(150000);
  test.beforeEach(({ page }) => forceSectionScenes(page));

  test("drop onto the hill, settle and stop rendering", async ({ page }) => {
    await page.goto("/en");
    await hydrated(page);
    await trackAt(page, 0.2);
    const canvas = stageCanvas(page, "stack");
    await expect(canvas).toHaveCount(1, { timeout: 20000 });
    await expect(canvas).toHaveAttribute(
      "data-physics-mode",
      /dropping|resting/,
      {
        timeout: 20000,
      },
    );
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
  });

  test("launch when scrolling past and drop again on the way back", async ({
    page,
  }) => {
    await page.goto("/en");
    await hydrated(page);
    await trackAt(page, 0.2);
    const canvas = stageCanvas(page, "stack");
    await expect(canvas).toHaveAttribute(
      "data-physics-mode",
      /dropping|resting/,
      {
        timeout: 30000,
      },
    );
    await trackAt(page, 0.6);
    await page.waitForTimeout(300);
    await trackAt(page, 1.05);
    await expect(canvas).toHaveAttribute("data-physics-mode", "launched", {
      timeout: 20000,
    });
    await trackAt(page, 0.4);
    await expect(canvas).toHaveAttribute(
      "data-physics-mode",
      /dropping|resting/,
      {
        timeout: 20000,
      },
    );
  });

  test("the stage never blocks page scrolling", async ({ page }) => {
    await page.goto("/en");
    await hydrated(page);
    await trackAt(page, 0.3);
    await expect(stageCanvas(page, "stack")).toHaveCount(1, { timeout: 20000 });
    await expect(stageCanvas(page, "stack")).toHaveCSS(
      "pointer-events",
      "none",
    );
    const before = await page.evaluate(() => scrollY);
    await page.mouse.move(700, 600);
    await page.mouse.wheel(0, 400);
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeGreaterThan(before + 200);
  });

  test("the close box tosses the balls, and pausing freezes them", async ({
    page,
  }) => {
    await page.goto("/en");
    await hydrated(page);
    await trackAt(page, 0.3);
    const canvas = stageCanvas(page, "stack");
    await expect(canvas).toHaveAttribute("data-physics-settled", "true", {
      timeout: 60000,
    });
    await page.getByRole("button", { name: "Toss the balls" }).click();
    await expect(canvas).toHaveAttribute("data-physics-settled", "false");
    // On touch screens the docked bar returns when scrolling up.
    await page.evaluate(() => scrollBy({ top: -40, behavior: "instant" }));
    await page.getByRole("button", { name: "Sections" }).click();
    await page
      .locator("#journey-sections-menu")
      .getByRole("button", { name: "Pause motion" })
      .click();
    await expect(canvas).toHaveAttribute("data-stage-active", "false");
    const frames = await canvas.getAttribute("data-stage-frames");
    await page.waitForTimeout(600);
    expect(await canvas.getAttribute("data-stage-frames")).toBe(frames);
  });

  test("a lost context keeps the photo and the text list", async ({ page }) => {
    await page.goto("/tr");
    await hydrated(page);
    await trackAt(page, 0.3);
    const canvas = stageCanvas(page, "stack");
    await expect(canvas).toHaveCount(1, { timeout: 20000 });
    await canvas.evaluate((node) =>
      node.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
    );
    await expect(canvas).toHaveCount(0);
    await expect(page.getByText("Tüm teknolojiler (32)")).toBeAttached();
    await expect(
      page.getByRole("button", { name: "Topları fırlat" }),
    ).toBeHidden();
  });
});
