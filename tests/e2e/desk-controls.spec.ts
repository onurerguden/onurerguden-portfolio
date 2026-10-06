import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { go, story } from "./helpers";

const viewports = [
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1080 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 844, height: 390 },
  { width: 390, height: 844 },
  { width: 375, height: 667 },
];

test("the opening's scroll hint hangs below the chin at every size", async ({
  page,
}) => {
  await page.goto("/en");
  const hint = page.locator("[data-scroll-hint]");
  await expect(hint).toBeVisible();
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const { chin, top, bottom, height } = await page.evaluate(() => {
      const head = document
        .querySelector("[data-opening-poster] [data-portrait-poster] img")!
        .getBoundingClientRect();
      const cue = document
        .querySelector("[data-scroll-hint]")!
        .getBoundingClientRect();
      return {
        // The portrait image's last opaque row is 93.4% of its height.
        chin: head.top + head.height * 0.934,
        top: cue.top,
        bottom: cue.bottom,
        height: innerHeight,
      };
    });
    expect(top, `${viewport.width}×${viewport.height}`).toBeGreaterThan(
      chin + 4,
    );
    expect(bottom, `${viewport.width}×${viewport.height}`).toBeLessThanOrEqual(
      height,
    );
  }
});

test("the hint runs three times and then rests", async ({ page }) => {
  await page.goto("/en");
  const iterations = await page
    .locator("[data-scroll-hint] span")
    .evaluate(
      (node) => getComputedStyle(node, "::before").animationIterationCount,
    );
  expect(iterations).toBe("3");
});

test("desk controls stay out of sight until keyboard focus reaches them", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName === "webkit",
    "WebGL2 is covered in Chromium; WebKit covers the static alternative.",
  );
  await page.goto("/en");
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 20000 },
  );
  const s = await story(page);
  await go(page, s.room + 0.1);
  await expect(page.locator("[data-continue-cue]")).toBeVisible();
  const turnOff = page.getByRole("button", { name: "Turn 3D off" }).first();
  await expect(turnOff).toHaveCSS("opacity", "0");
  await expect(page.locator("details[data-journey]")).toHaveCSS("opacity", "0");
  await turnOff.focus();
  await expect(turnOff).toHaveCSS("opacity", "1");
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .include("[data-journey-stage]")
    .analyze();
  expect(audit.violations).toEqual([]);
});

test("the nav turns the desk's 3D off and on for this visit", async ({
  page,
  context,
}) => {
  await page.goto("/tr");
  const menuButton = page.getByRole("button", { name: "Bölümler" });
  await menuButton.click();
  const menu = page.locator("#journey-sections-menu");
  await menu.getByRole("button", { name: "3D’yi kapat" }).click();
  await expect(page.locator("[data-static]")).toHaveAttribute(
    "data-static",
    "true",
  );
  await expect(menu.getByRole("status").last()).toHaveText(
    "3D kapalı; sayfa sabit",
  );
  await expect(page.locator("canvas")).toHaveCount(0);
  // A reload is the same visit; a new one starts with the desk again.
  await page.reload();
  await expect(page.locator("[data-static]")).toHaveAttribute(
    "data-static",
    "true",
  );
  const later = await context.newPage();
  await later.goto("/tr");
  await expect(later.locator("[data-static]")).toHaveAttribute(
    "data-static",
    "false",
  );
  await later.close();
  await menuButton.click();
  await menu.getByRole("button", { name: "3D’yi aç" }).click();
  await expect(page.locator("[data-static]")).toHaveAttribute(
    "data-static",
    "false",
  );
});

test("reduced motion offers the pause but not the 3D toggle", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");
  await page.getByRole("button", { name: "Sections" }).click();
  const menu = page.locator("#journey-sections-menu");
  await expect(menu.getByRole("button", { name: /3D/ })).toHaveCount(0);
  // The stack balls still drop under reduced motion, so the pause stays.
  await expect(menu.getByRole("button", { name: "Pause motion" })).toHaveCount(
    1,
  );
});
