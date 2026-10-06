import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  forceSectionScenes,
  go,
  journeyCanvas,
  stageCanvas,
  story,
  within,
  ci,
} from "./helpers";

async function ready(page: Page) {
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: ci(20000) },
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
      if (Number(await canvas.getAttribute("data-selected")) >= 0)
        return { x: box.x + box.width * fx, y: box.y + box.height * fy };
    }
  return null;
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
    await expect(canvas).toHaveCount(1, { timeout: ci(20000) });
    await expect(canvas).toHaveAttribute("data-physics-settled", "true", {
      timeout: ci(60000),
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
      { timeout: ci(30000) },
    );
    await go(page, within(s.macbook, 0.1));
    // Once the list is open the balls are gone and the context released.
    await expect(canvas).toHaveCount(0, { timeout: ci(20000) });
    await go(page, s.chapters.stack + 0.2);
    await expect(stageCanvas(page, "desk-stack")).toHaveAttribute(
      "data-physics-mode",
      /dropping|resting/,
      { timeout: ci(30000) },
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
      timeout: ci(60000),
    });
    expect(await hoverABall(page)).toBeTruthy();
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

  test("left-button dragging moves a ball, releases it and returns to idle rendering", async ({
    page,
    isMobile,
  }) => {
    test.skip(
      isMobile,
      "Touch uses the native move buttons and keeps page scrolling.",
    );
    await page.goto("/en/lab/desk/journey");
    await ready(page);
    await go(page, (await story(page)).chapters.stack + 0.2);
    const canvas = stageCanvas(page, "desk-stack");
    await expect(canvas).toHaveAttribute("data-physics-settled", "true", {
      timeout: ci(60000),
    });
    const point = (await hoverABall(page))!;
    expect(point).toBeTruthy();
    const index = await canvas.getAttribute("data-selected");
    const before = Number(await canvas.getAttribute("data-selected-x"));
    const box = (await page.locator('[data-screen="2"]').boundingBox())!;
    const direction = point.x > box.x + box.width / 2 ? -1 : 1;
    await page.mouse.down({ button: "left" });
    await page.mouse.move(point.x + direction * 80, point.y - 25, {
      steps: 12,
    });
    await expect(canvas).toHaveAttribute("data-dragged", index!);
    await expect
      .poll(async () =>
        Math.abs(Number(await canvas.getAttribute("data-selected-x")) - before),
      )
      .toBeGreaterThan(12);
    await expect(page.locator("[data-balloon]")).toHaveCount(0);
    await page.mouse.up();
    await expect(canvas).toHaveAttribute("data-dragged", "-1");
    await expect(canvas).toHaveAttribute("data-physics-settled", "true", {
      timeout: ci(60000),
    });
    const frames = await canvas.getAttribute("data-stage-frames");
    await page.waitForTimeout(800);
    expect(await canvas.getAttribute("data-stage-frames")).toBe(frames);
  });

  test("Escape cancels a captured drag and secondary clicks never grab", async ({
    page,
    isMobile,
  }) => {
    test.skip(
      isMobile,
      "Primary-button mouse gestures are desktop interactions.",
    );
    await page.goto("/en/lab/desk/journey");
    await ready(page);
    await go(page, (await story(page)).chapters.stack + 0.2);
    const canvas = stageCanvas(page, "desk-stack");
    await expect(canvas).toHaveAttribute("data-physics-settled", "true", {
      timeout: ci(60000),
    });
    const point = (await hoverABall(page))!;
    expect(point).toBeTruthy();
    await page.mouse.down({ button: "right" });
    await page.mouse.move(point.x + 12, point.y - 12);
    await expect(canvas).toHaveAttribute("data-dragged", "-1");
    await page.mouse.up({ button: "right" });
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + 20, point.y - 20, { steps: 4 });
    await expect(canvas).not.toHaveAttribute("data-dragged", "-1");
    await page.keyboard.press("Escape");
    await expect(canvas).toHaveAttribute("data-dragged", "-1");
    await expect(page.locator("[data-xp][data-ball-dragging]")).toHaveCount(0);
    await page.mouse.up();
    await expect(page.locator("[data-balloon]")).toHaveCount(0);
  });

  test("native controls move a chosen ball and pause disables movement", async ({
    page,
  }) => {
    await page.goto("/tr/lab/desk/journey");
    await ready(page);
    await go(page, (await story(page)).chapters.stack + 0.2);
    const canvas = stageCanvas(page, "desk-stack");
    await expect(canvas).toHaveAttribute("data-physics-settled", "true", {
      timeout: ci(60000),
    });
    const selector = page.getByRole("combobox", {
      name: "Hareket ettirilecek topu seç",
    });
    // The pointer hovers and drags; the controls open for keyboard focus.
    const moves = page.locator("[data-ball-controls] > div");
    await expect(moves).toHaveCSS("clip-path", "inset(50%)");
    await selector.focus();
    await expect(moves).toHaveCSS("clip-path", "none");
    expect((await moves.boundingBox())!.height).toBeGreaterThan(30);
    await selector.selectOption("1");
    const right = page.getByRole("button", {
      name: /topunu sağa hareket ettir/,
    });
    await right.focus();
    await right.press("Enter");
    await expect(canvas).toHaveAttribute("data-physics-settled", "false");
    const audit = await new AxeBuilder({ page })
      .include("[data-ball-controls]")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
    await page.getByRole("button", { name: "start", exact: true }).click();
    const pause = page.getByRole("menuitemcheckbox", {
      name: "Hareketi duraklat",
    });
    await pause.focus();
    await pause.press("Space");
    await expect(right).toBeDisabled();
    await expect(canvas).toHaveAttribute("data-stage-active", "false");
    const frames = await canvas.getAttribute("data-stage-frames");
    await page.waitForTimeout(800);
    expect(await canvas.getAttribute("data-stage-frames")).toBe(frames);
    await pause.press("Space");
    await expect(right).toBeEnabled();
  });

  test("under reduced motion the balls still drop onto the page's photo", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en");
    await page.evaluate(() =>
      document
        .querySelector("[data-xp]")
        ?.scrollIntoView({ behavior: "instant" }),
    );
    const canvas = stageCanvas(page, "desk-stack");
    await expect(canvas).toHaveAttribute(
      "data-physics-mode",
      /dropping|resting/,
      {
        timeout: ci(30000),
      },
    );
    await expect(canvas).toHaveAttribute("data-physics-settled", "true", {
      timeout: ci(60000),
    });
    // The desk itself stays static; only the balls' canvas exists.
    await expect(page.locator("canvas")).toHaveCount(1);
  });
});
