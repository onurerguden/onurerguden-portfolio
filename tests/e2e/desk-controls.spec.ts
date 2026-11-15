import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { ci, go, story, touchStatic, within } from "./helpers";

const viewports = [
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1080 },
  { width: 1440, height: 500 },
  { width: 1920, height: 700 },
  { width: 3440, height: 1440 },
  { width: 5120, height: 1440 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 844, height: 390 },
  { width: 390, height: 844 },
  { width: 375, height: 667 },
];

const ready = (page: Page) =>
  expect(page.locator("[data-ready]")).toHaveAttribute("data-ready", "true", {
    timeout: ci(20000),
  });

test("the opening's scroll hint sits beside the face, in view at every size", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, touchStatic);
  await page.goto("/en");
  const hint = page.locator("[data-scroll-hint]");
  await expect(hint).toBeVisible();
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const size = `${viewport.width}×${viewport.height}`;
    const { head, cue, name, role, width, height } = await page.evaluate(() => {
      const box = (selector: string) => {
        const { left, right, top, bottom, height } = document
          .querySelector(`[data-opening-poster] ${selector}`)!
          .getBoundingClientRect();
        return { left, right, top, bottom, height };
      };
      return {
        head: box("[data-portrait-poster] img"),
        cue: box("[data-scroll-hint]"),
        name: box("[data-portrait-name]"),
        role: box("[data-portrait-role]"),
        width: innerWidth,
        height: innerHeight,
      };
    });
    if (viewport.width / viewport.height <= 3 / 4) {
      // Tall, narrow windows have no room beside the head: under the chin
      // (the image's last opaque row is 93.4% of its height).
      expect(cue.top, size).toBeGreaterThan(head.top + head.height * 0.934 + 4);
    } else {
      // Past the portrait's widest opaque column, level with the face.
      expect(cue.left, size).toBeGreaterThan(
        head.left + (head.right - head.left) * 0.907,
      );
      expect(cue.top, size).toBeGreaterThan(head.top + head.height * 0.3);
      expect(cue.bottom, size).toBeLessThan(head.top + head.height * 0.8);
      for (const text of [name, role])
        expect(
          cue.right < text.left ||
            cue.left > text.right ||
            cue.bottom < text.top ||
            cue.top > text.bottom,
          `${size} clear of the name and role`,
        ).toBe(true);
    }
    expect(cue.top, size).toBeGreaterThanOrEqual(0);
    expect(cue.right, size).toBeLessThanOrEqual(width);
    expect(cue.bottom, size).toBeLessThanOrEqual(height);
  }
});

test("the hint is a loading ring until the desk is ready, then keeps saying scroll down", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, touchStatic);
  await page.goto("/en");
  const hint = page.locator("[data-scroll-hint]");
  await expect(hint).toBeVisible();
  await ready(page);
  // The ring closes into the mouse once the desk shows.
  await expect(hint).toHaveAttribute("data-load", "done");
  await expect(hint).toHaveText("↓Scroll down");
  const wheel = page.locator("[data-scroll-hint] > span").first();
  const animation = () =>
    wheel.evaluate((node) => {
      const style = getComputedStyle(node, "::before");
      return [style.animationName, style.animationIterationCount];
    });
  const [name, iterations] = await animation();
  expect(name).toContain("hint-roll");
  expect(iterations).toBe("infinite");
  await page.evaluate(() => {
    document.documentElement.dataset.motionPaused = "true";
  });
  expect((await animation())[0]).toBe("none");
  // Paused, the words stay in view rather than coming and going.
  await expect(page.locator("[data-scroll-hint] > span").last()).toHaveCSS(
    "opacity",
    "1",
  );
  await page.goto("/tr");
  await expect(page.locator("[data-scroll-hint]")).toContainText(
    "Aşağı kaydır",
  );
});

test("the page waits at the opening while the desk gets ready, five seconds at most", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(isMobile, touchStatic);
  test.skip(
    browserName === "webkit",
    "WebGL2 is covered in Chromium; WebKit covers the static alternative.",
  );
  // QA visits skip the hold unless a test sets its cap (opening-loader.ts).
  await page.addInitScript(() =>
    localStorage.setItem("portfolio:scroll-hold", "2500"),
  );
  // A slow model keeps the desk preparing past the cap.
  await page.route("**/models/desk/*.glb*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 6000));
    await route.continue();
  });
  await page.goto("/en");
  const section = page.locator("[data-enhanced]");
  await expect(section).toHaveAttribute("data-holding", "true");
  await page.mouse.move(400, 400);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  // The cap lets go even though the desk is still preparing.
  await expect(section).not.toHaveAttribute("data-holding", "true", {
    timeout: ci(5000),
  });
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-ready",
    "false",
  );
  await page.mouse.wheel(0, 400);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
});

test("the hold lets go when the desk is ready, and never holds a link to a section", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(isMobile, touchStatic);
  test.skip(
    browserName === "webkit",
    "WebGL2 is covered in Chromium; WebKit covers the static alternative.",
  );
  await page.addInitScript(() =>
    localStorage.setItem("portfolio:scroll-hold", "60000"),
  );
  await page.goto("/en");
  const section = page.locator("[data-enhanced]");
  await expect(section).toHaveAttribute("data-holding", "true");
  await ready(page);
  await expect(section).not.toHaveAttribute("data-holding", "true");
  await page.mouse.move(400, 400);
  await page.mouse.wheel(0, 400);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  await page.goto("/en#contact");
  await expect(page.locator("[data-ready]")).toHaveAttribute(
    "data-static",
    "false",
  );
  await expect(section).not.toHaveAttribute("data-holding", "true");
});

test("past the opening, the hint plays again when the visitor stops scrolling, once per pause", async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(isMobile, touchStatic);
  test.skip(
    browserName === "webkit",
    "WebGL2 is covered in Chromium; WebKit covers the static alternative.",
  );
  // QA visits skip the wait unless a test sets one (idle-cue.tsx).
  await page.addInitScript(() => {
    localStorage.setItem("portfolio:idle-cue", "500");
    const runs: Record<string, number> = { opening: 0, foot: 0, footOff: 0 };
    (window as unknown as { cueRuns: typeof runs }).cueRuns = runs;
    new MutationObserver((records) => {
      for (const record of records) {
        const node = record.target as HTMLElement;
        const foot = node.matches("[data-idle-cue]");
        if (foot && node.dataset.cue === "off") runs.footOff++;
        if (node.dataset.cue !== "run") continue;
        runs[foot ? "foot" : "opening"]++;
      }
    }).observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-cue"],
    });
  });
  const runs = () =>
    page.evaluate(
      () => (window as unknown as { cueRuns: Record<string, number> }).cueRuns,
    );
  await page.goto("/en");
  await ready(page);
  // The opening's own hint loops until the visitor scrolls: no replay.
  await page.waitForTimeout(1500);
  expect((await runs()).opening).toBe(0);
  // At a reading stop, at the foot of the view; the next scroll sends it
  // away and starts a new pause.
  const s = await story(page);
  await go(page, within(s.portrait, 0.3));
  const foot = page.locator("[data-idle-cue]");
  await expect.poll(async () => (await runs()).foot).toBe(1);
  await expect(foot).toBeVisible();
  const before = (await runs()).footOff;
  await page.mouse.move(40, 300);
  await page.mouse.wheel(0, 20);
  // Transitions are counted, not sampled: on a slow runner the next pause
  // can bring it back before an assertion sees it gone.
  await expect.poll(async () => (await runs()).footOff).toBeGreaterThan(before);
  await expect.poll(async () => (await runs()).foot).toBe(2);
  // Past the desk it stays away.
  await go(page, s.length);
  await page.waitForTimeout(1500);
  await expect(page.locator('[data-idle-cue][data-cue="run"]')).toHaveCount(0);
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
  await expect(page.locator("[data-idle-cue]")).toBeVisible();
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
  isMobile,
}) => {
  test.skip(isMobile, touchStatic);
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
